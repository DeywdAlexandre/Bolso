import { z } from "zod";

import { addMonthsToDay, invoiceFor } from "./cards";
import { genId } from "./format";
import type { Account, Category, Transaction } from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;
const pad = (n: number) => String(n).padStart(2, "0");

export class InvoiceParseError extends Error {}

// ---------------------------------------------------------------------------
// Leitura tolerante do que o modelo devolve
// ---------------------------------------------------------------------------

/** "R$ 1.234,56", "1,234.56", "-50", "(50,00)", "50,00 CR" → número (crédito/negativo vira negativo). */
export function parseMoney(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  let s = value.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) negative = true;
  if (/(^|\s)-|-$|\bcr\b|\bcred/i.test(s)) negative = true;
  s = s.replace(/[^\d.,]/g, "");
  if (!s) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // o separador que vem por último é o decimal
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot >= 0 && /\.\d{3}(\.|$)/.test(s) && s.split(".").length > 2) {
    s = s.replace(/\./g, ""); // 1.234.567 → separador de milhar
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

/** YYYY-MM-DD, DD/MM/YYYY, DD/MM/YY ou DD-MM-YYYY → YYYY-MM-DD (ou null se inválida). */
export function parseDateString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s))) {
    d = Number(match[1]);
    m = Number(match[2]);
    y = Number(match[3]);
    if (y < 100) y += 2000;
  } else {
    return null;
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const check = new Date(y, m - 1, d);
  if (check.getMonth() !== m - 1) return null; // dia que não existe no mês
  return `${y}-${pad(m)}-${pad(d)}`;
}

export type ExtractedItem = {
  date: string;
  description: string;
  /** Positivo = compra/cobrança; negativo = estorno, crédito ou pagamento. */
  amount: number;
  installment?: { index: number; total: number };
  category?: string;
};

export type ExtractedInvoice = {
  closingDate?: string;
  dueDate?: string;
  total?: number;
  items: ExtractedItem[];
};

const installmentSchema = z
  .object({ index: z.coerce.number().int().min(1), total: z.coerce.number().int().min(1) })
  .refine((i) => i.index <= i.total);

/** "Parcela 3/12", "03/12", "3 de 12" no texto da descrição. */
function installmentFromText(text: string): { index: number; total: number } | undefined {
  const m = /(?:parc(?:ela)?\.?\s*)?\b(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})\b\s*$/i.exec(text.trim());
  if (!m) return undefined;
  const index = Number(m[1]);
  const total = Number(m[2]);
  return total >= 2 && index >= 1 && index <= total ? { index, total } : undefined;
}

/** Remove "(3/12)", "03/12", "Parcela 3 de 12" do fim da descrição. */
export function stripInstallmentMarker(text: string): string {
  return text
    .replace(/\(\s*\d{1,2}\s*\/\s*\d{1,2}\s*\)\s*$/, "")
    .replace(/[\s-]*(?:parc(?:ela)?\.?\s*)?\b\d{1,2}\s*(?:\/|de)\s*\d{1,2}\b\s*$/i, "")
    .trim();
}

/**
 * Converte a resposta do modelo (texto com JSON, possivelmente dentro de ```) em fatura
 * normalizada. Itens inválidos são descartados e contados em `dropped`.
 */
export function parseInvoiceJson(raw: string): { invoice: ExtractedInvoice; dropped: number } {
  let text = raw.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fenced) text = fenced[1]!.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new InvoiceParseError("A resposta da IA não trouxe os dados da fatura.");

  let data: unknown;
  try {
    data = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new InvoiceParseError("A resposta da IA veio num formato que não consegui ler.");
  }
  if (typeof data !== "object" || data === null || !Array.isArray((data as { items?: unknown }).items)) {
    throw new InvoiceParseError("A resposta da IA não trouxe a lista de lançamentos da fatura.");
  }

  const obj = data as Record<string, unknown>;
  const items: ExtractedItem[] = [];
  let dropped = 0;
  for (const rawItem of obj.items as unknown[]) {
    const it = (rawItem ?? {}) as Record<string, unknown>;
    const date = parseDateString(it.date);
    const amount = parseMoney(it.amount);
    const description = typeof it.description === "string" ? it.description.trim() : "";
    if (!date || amount === null || amount === 0 || !description) {
      dropped++;
      continue;
    }
    const parsed = installmentSchema.safeParse(it.installment);
    const installment = parsed.success ? parsed.data : installmentFromText(description);
    items.push({
      date,
      description: installment ? stripInstallmentMarker(description) || description : description,
      amount: round2(amount),
      installment: installment && installment.total >= 2 ? installment : undefined,
      category: typeof it.category === "string" && it.category.trim() ? it.category.trim() : undefined,
    });
  }
  if (items.length === 0) throw new InvoiceParseError("Não encontrei lançamentos válidos na fatura.");

  const total = parseMoney(obj.total);
  return {
    dropped,
    invoice: {
      closingDate: parseDateString(obj.closingDate) ?? undefined,
      dueDate: parseDateString(obj.dueDate) ?? undefined,
      total: total !== null ? Math.abs(round2(total)) : undefined,
      items,
    },
  };
}

// ---------------------------------------------------------------------------
// Conciliação com o que já existe no app
// ---------------------------------------------------------------------------

export const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** 0 a 1: iguais ou um contido no outro = 1; senão proporção de palavras em comum. */
export function similarity(a: string, b: string): number {
  const na = norm(stripInstallmentMarker(a));
  const nb = norm(stripInstallmentMarker(b));
  if (!na || !nb) return 0;
  if (na === nb || na.includes(nb) || nb.includes(na)) return 1;
  const ta = new Set(na.split(" "));
  const tb = new Set(nb.split(" "));
  const common = [...ta].filter((t) => tb.has(t)).length;
  return common / new Set([...ta, ...tb]).size;
}

const PAYMENT_RE = /pagamento|pgto|pag\.? (?:fatura|recebido)|payment|obrigad|saldo anterior|fatura anterior/i;

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split("T")[0]!.split("-").map(Number);
  return Math.round(Date.UTC(y!, m! - 1, d!) / 86_400_000);
};

export type PlannedTx = {
  tx: Omit<Transaction, "id" | "createdAt">;
  /** "statement": está na fatura lida. "future_installment": parcela que ainda vai cair nas próximas faturas. */
  origin: "statement" | "future_installment";
  label: string;
};

export type ImportPlan = {
  /** Mês de fechamento da fatura lida (YYYY-MM). */
  invoiceKey: string;
  toCreate: PlannedTx[];
  duplicates: { item: ExtractedItem; existing: Transaction }[];
  ignored: { item: ExtractedItem; reason: "payment" }[];
  itemsTotal: number;
  statementTotal?: number;
  /** total da fatura − soma dos itens lidos (≠ 0 sugere itens não lidos). */
  difference?: number;
  warnings: string[];
};

function resolveCategoryId(name: string | undefined, categories: Category[], type: "expense" | "income"): string {
  const list = categories.filter((c) => c.type === type);
  const q = norm(name ?? "");
  const found = q ? list.find((c) => norm(c.name) === q) ?? list.find((c) => norm(c.name).includes(q) || q.includes(norm(c.name))) : undefined;
  const other = list.find((c) => norm(c.name) === "outros");
  return (found ?? other ?? list[0])?.id ?? (type === "income" ? "cat_income_other" : "cat_expense_other");
}

const isoNoon = (day: string) => new Date(`${day}T12:00:00`).toISOString();

function closingDateFor(card: Account, key: string): string {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(y!, m!, 0).getDate();
  return `${key}-${pad(Math.min(card.closingDay ?? 28, last))}`;
}

/** Descobre a fatura (mês de fechamento) pela data de fechamento, pelo vencimento ou pelas compras. */
export function detectInvoiceKey(card: Account, invoice: ExtractedInvoice): string {
  if (invoice.closingDate) return invoice.closingDate.slice(0, 7);
  if (invoice.dueDate) {
    const closing = card.closingDay ?? 28;
    const due = card.dueDay ?? 10;
    return addMonthsToDay(`${invoice.dueDate.slice(0, 7)}-01`, due > closing ? 0 : -1).slice(0, 7);
  }
  const votes = new Map<string, number>();
  for (const it of invoice.items.filter((i) => !i.installment && i.amount > 0)) {
    const key = invoiceFor(card, it.date).key;
    votes.set(key, (votes.get(key) ?? 0) + 1);
  }
  const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : invoiceFor(card, invoice.items[0]!.date).key;
}

/**
 * Monta o que importar de uma fatura lida pela IA:
 * - ignora linhas de pagamento da fatura anterior;
 * - não duplica o que já foi lançado (mesmo valor, data próxima e descrição parecida, ou a mesma parcela);
 * - em compras parceladas lê "k/n" e cria também as parcelas que faltam (k+1..n) nas próximas faturas,
 *   completando uma compra já lançada pela metade;
 * - joga cada parcela na fatura lida, mesmo que a data impressa seja a da compra original.
 */
export function planInvoiceImport(opts: {
  card: Account;
  existing: Transaction[];
  invoice: ExtractedInvoice;
  categories: Category[];
  newId?: () => string;
}): ImportPlan {
  const { card, invoice, categories } = opts;
  const newId = opts.newId ?? (() => "ig_" + genId());
  const mine = opts.existing.filter((t) => t.accountId === card.id);
  const invoiceKey = detectInvoiceKey(card, invoice);
  const closingDate = invoice.closingDate ?? closingDateFor(card, invoiceKey);

  const used = new Set<string>();
  const toCreate: PlannedTx[] = [];
  const duplicates: ImportPlan["duplicates"] = [];
  const ignored: ImportPlan["ignored"] = [];
  const warnings: string[] = [];

  const dateInInvoice = (it: ExtractedItem): string => {
    if (invoiceFor(card, it.date).key === invoiceKey) return it.date;
    if (it.installment && it.installment.index > 1) {
      const shifted = addMonthsToDay(it.date, it.installment.index - 1);
      if (invoiceFor(card, shifted).key === invoiceKey) return shifted;
    }
    return closingDate;
  };

  const findExisting = (it: ExtractedItem, day: string, type: "expense" | "income"): Transaction | undefined => {
    const amount = Math.abs(it.amount);
    return mine.find((t) => {
      if (used.has(t.id) || t.type !== type || Math.abs(t.amount - amount) > 0.01) return false;
      if (it.installment) {
        return t.installmentIndex === it.installment.index && t.installmentTotal === it.installment.total && similarity(t.description, it.description) >= 0.5;
      }
      const near = Math.abs(dayNumber(t.date) - dayNumber(it.date)) <= 3 || Math.abs(dayNumber(t.date) - dayNumber(day)) <= 3;
      return near && (similarity(t.description, it.description) >= 0.34 || dayNumber(t.date) === dayNumber(it.date));
    });
  };

  const groupFor = (it: ExtractedItem): { id: string; indexes: Set<number> } => {
    const { total } = it.installment!;
    const members = mine.filter(
      (t) => t.installmentGroupId && t.installmentTotal === total && Math.abs(t.amount - it.amount) <= 0.01 && similarity(t.description, it.description) >= 0.5,
    );
    if (members.length === 0) return { id: newId(), indexes: new Set() };
    return { id: members[0]!.installmentGroupId!, indexes: new Set(members.map((m) => m.installmentIndex!)) };
  };

  let itemsTotal = 0;
  for (const it of invoice.items) {
    if (it.amount < 0 && PAYMENT_RE.test(it.description)) {
      ignored.push({ item: it, reason: "payment" });
      continue;
    }
    itemsTotal += it.amount;
    const day = dateInInvoice(it);
    const type = it.amount < 0 ? "income" : "expense";
    const found = findExisting(it, day, type);
    if (found) used.add(found.id);

    if (found) duplicates.push({ item: it, existing: found });

    if (it.installment) {
      const { index, total } = it.installment;
      const group = found?.installmentGroupId ? { id: found.installmentGroupId, indexes: new Set(mine.filter((t) => t.installmentGroupId === found.installmentGroupId).map((t) => t.installmentIndex!)) } : groupFor(it);
      const base = it.description;
      const categoryId = found?.categoryId ?? resolveCategoryId(it.category, categories, "expense");
      const make = (i: number, date: string, origin: PlannedTx["origin"]): PlannedTx => ({
        origin,
        label: `${base} (${i}/${total})`,
        tx: {
          type: "expense",
          amount: it.amount,
          categoryId,
          description: `${base} (${i}/${total})`,
          date: isoNoon(date),
          accountId: card.id,
          paymentMethod: "credit",
          installmentGroupId: group.id,
          installmentIndex: i,
          installmentTotal: total,
        },
      });
      if (!found && !group.indexes.has(index)) toCreate.push(make(index, day, "statement"));
      for (let i = index + 1; i <= total; i++) {
        if (group.indexes.has(i)) continue;
        toCreate.push(make(i, addMonthsToDay(day, i - index), "future_installment"));
      }
      continue;
    }

    if (found) continue;
    toCreate.push({
      origin: "statement",
      label: it.description,
      tx: {
        type,
        amount: Math.abs(it.amount),
        categoryId: resolveCategoryId(it.category, categories, type),
        description: it.description,
        date: isoNoon(day),
        accountId: card.id,
        paymentMethod: "credit",
      },
    });
  }

  itemsTotal = round2(itemsTotal);
  const statementTotal = invoice.total;
  const difference = statementTotal !== undefined ? round2(statementTotal - itemsTotal) : undefined;
  if (difference !== undefined && Math.abs(difference) > 0.01) {
    warnings.push(
      `A soma dos itens lidos (${itemsTotal.toFixed(2)}) difere do total da fatura (${statementTotal!.toFixed(2)}). Pode haver itens que a IA não leu: confira antes de importar.`,
    );
  }
  if (ignored.length > 0) warnings.push(`${ignored.length} linha(s) de pagamento/saldo anterior foram ignoradas.`);

  return { invoiceKey, toCreate, duplicates, ignored, itemsTotal, statementTotal, difference, warnings };
}
