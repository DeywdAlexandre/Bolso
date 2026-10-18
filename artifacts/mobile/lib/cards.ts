import type { Account, Transaction, Transfer } from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;
const pad = (n: number) => String(n).padStart(2, "0");
const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate(); // m: 1-12

const parseDay = (iso: string) => {
  const [y, m, d] = iso.split("T")[0]!.split("-").map(Number);
  return { y: y!, m: m!, d: d! };
};

/** YYYY-MM-DD com o dia limitado ao tamanho do mês (31 em fevereiro vira 28/29). */
function clampedDate(y: number, m: number, d: number): string {
  // normaliza meses fora de 1-12
  const base = new Date(y, m - 1, 1);
  const yy = base.getFullYear();
  const mm = base.getMonth() + 1;
  return `${yy}-${pad(mm)}-${pad(Math.min(d, daysIn(yy, mm)))}`;
}

/** Soma meses a uma data (YYYY-MM-DD), mantendo o dia ou o último dia do mês. */
export function addMonthsToDay(iso: string, months: number): string {
  const { y, m, d } = parseDay(iso);
  return clampedDate(y, m + months, d);
}

export type InvoiceRef = {
  /** Mês em que a fatura fecha (YYYY-MM): identifica a fatura. */
  key: string;
  closingDate: string;
  dueDate: string;
};

export type CardConfig = Pick<Account, "closingDay" | "dueDay">;

/**
 * Fatura em que uma compra cai: até o dia do fechamento (inclusive) entra na fatura que fecha
 * no mês; depois, na do mês seguinte. O vencimento é no mês do fechamento se o dia de vencimento
 * for maior que o de fechamento, senão no mês seguinte.
 */
export function invoiceFor(card: CardConfig, dateIso: string): InvoiceRef {
  const closingDay = card.closingDay ?? 28;
  const dueDay = card.dueDay ?? 10;
  const { y, m, d } = parseDay(dateIso);

  const closingMonthOffset = d <= Math.min(closingDay, daysIn(y, m)) ? 0 : 1;
  const closingDate = clampedDate(y, m + closingMonthOffset, closingDay);
  const { y: cy, m: cm } = parseDay(closingDate);
  const dueDate = clampedDate(cy, cm + (dueDay > closingDay ? 0 : 1), dueDay);
  return { key: `${cy}-${pad(cm)}`, closingDate, dueDate };
}

export type InstallmentPlan = { index: number; total: number; amount: number; date: string };

/**
 * Divide uma compra em `count` parcelas mensais a partir de `firstDate`. As parcelas têm centavos
 * exatos: a diferença do arredondamento vai para a última, e a soma é sempre o valor total.
 */
export function planInstallments(totalAmount: number, count: number, firstDate: string): InstallmentPlan[] {
  const n = Math.max(1, Math.floor(count));
  const base = Math.floor((totalAmount / n) * 100) / 100;
  const plans: InstallmentPlan[] = [];
  let allocated = 0;
  for (let i = 1; i <= n; i++) {
    const amount = i === n ? round2(totalAmount - allocated) : base;
    allocated = round2(allocated + amount);
    plans.push({ index: i, total: n, amount, date: addMonthsToDay(firstDate, i - 1) });
  }
  return plans;
}

export type InvoiceStatus = "open" | "future" | "closed" | "overdue" | "paid";

export type InvoiceItem = Transaction & { signed: number };

export type Invoice = InvoiceRef & {
  total: number;
  /** Quanto já foi coberto pelos pagamentos (os mais antigos pagam as faturas mais antigas). */
  paid: number;
  remaining: number;
  status: InvoiceStatus;
  items: InvoiceItem[];
};

export type InstallmentGroupSummary = {
  groupId: string;
  description: string;
  installmentAmount: number;
  total: number;
  /** Parcelas em faturas que ainda não fecharam (a atual e as futuras). */
  remaining: number;
  remainingAmount: number;
};

export type CardSummary = {
  /** Dívida total no cartão (compras + parcelas futuras − pagamentos). */
  debt: number;
  invoices: Invoice[];
  /** Fatura que ainda não fechou. */
  current: Invoice | null;
  /** Soma das faturas depois da atual (parcelas e compras já lançadas). */
  futureTotal: number;
  /** Total já em faturas fechadas e não pagas. */
  overdueOrClosed: number;
  groups: InstallmentGroupSummary[];
  limitUsed: number;
  limitAvailable: number | null;
};

const dayOf = (iso: string) => iso.split("T")[0]!;
const signed = (t: Transaction) => (t.type === "expense" ? t.amount : -t.amount); // estorno/entrada reduz a fatura

/**
 * Resumo do cartão: faturas por mês de fechamento, pagamentos (transferências para o cartão) abatendo
 * as faturas mais antigas primeiro, parcelas faltantes e limite usado. `asOf` é hoje (YYYY-MM-DD).
 */
export function computeCardSummary(
  card: Account,
  transactions: Transaction[],
  transfers: Transfer[],
  asOf: string,
): CardSummary {
  const mine = transactions.filter((t) => t.accountId === card.id && dayOf(t.date) >= card.balanceDate);

  const byKey = new Map<string, Invoice>();
  for (const t of mine) {
    const ref = invoiceFor(card, t.date);
    const inv = byKey.get(ref.key) ?? { ...ref, total: 0, paid: 0, remaining: 0, status: "future" as InvoiceStatus, items: [] };
    inv.total = round2(inv.total + signed(t));
    inv.items.push({ ...t, signed: signed(t) });
    byKey.set(ref.key, inv);
  }
  const invoices = [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
  invoices.forEach((inv) => inv.items.sort((a, b) => a.date.localeCompare(b.date)));

  const opening = Math.max(0, -card.initialBalance); // dívida que já existia ao cadastrar o cartão
  let payments = 0;
  for (const tr of transfers) {
    if (dayOf(tr.date) < card.balanceDate) continue;
    if (tr.toAccountId === card.id) payments += tr.amount;
    if (tr.fromAccountId === card.id) payments -= tr.amount;
  }
  payments = round2(payments);

  // Primeira fatura em aberto (ainda não fechou) — a "atual".
  const current = invoices.find((inv) => inv.closingDate >= asOf) ?? null;

  let pool = payments;
  invoices.forEach((inv, i) => {
    // A dívida anterior ao cadastro é quitada junto com a fatura mais antiga.
    const need = round2(inv.total + (i === 0 ? opening : 0));
    const covered = Math.max(0, Math.min(need, pool));
    pool = round2(pool - covered);
    inv.paid = round2(covered);
    inv.remaining = round2(need - covered);
    if (inv.remaining <= 0.005 && inv.closingDate < asOf) inv.status = "paid";
    else if (inv.closingDate >= asOf) inv.status = current && inv.key === current.key ? "open" : "future";
    else inv.status = inv.dueDate < asOf ? "overdue" : "closed";
  });

  const debt = round2(opening + invoices.reduce((s, inv) => s + inv.total, 0) - payments);

  const futureTotal = round2(
    invoices.filter((inv) => current && inv.key > current.key).reduce((s, inv) => s + inv.total, 0),
  );
  const overdueOrClosed = round2(
    invoices.filter((inv) => inv.status === "closed" || inv.status === "overdue").reduce((s, inv) => s + inv.remaining, 0),
  );

  const notClosed = new Set(invoices.filter((inv) => inv.closingDate >= asOf).map((inv) => inv.key));
  const groupMap = new Map<string, InstallmentGroupSummary>();
  for (const t of mine) {
    if (!t.installmentGroupId || t.type !== "expense") continue;
    const g =
      groupMap.get(t.installmentGroupId) ??
      {
        groupId: t.installmentGroupId,
        description: t.description.replace(/\s*\(\d+\/\d+\)\s*$/, ""),
        installmentAmount: t.amount,
        total: t.installmentTotal ?? 0,
        remaining: 0,
        remainingAmount: 0,
      };
    if (notClosed.has(invoiceFor(card, t.date).key)) {
      g.remaining += 1;
      g.remainingAmount = round2(g.remainingAmount + t.amount);
    }
    groupMap.set(t.installmentGroupId, g);
  }
  const groups = [...groupMap.values()].filter((g) => g.remaining > 0).sort((a, b) => b.remainingAmount - a.remainingAmount);

  const limitUsed = Math.max(0, debt);
  const limitAvailable = card.creditLimit != null ? round2(card.creditLimit - limitUsed) : null;

  return { debt, invoices, current, futureTotal, overdueOrClosed, groups, limitUsed, limitAvailable };
}
