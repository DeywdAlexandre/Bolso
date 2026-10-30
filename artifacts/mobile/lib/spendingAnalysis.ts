import { getMonthShort } from "./format";
import type { Category, Transaction, TransactionType } from "./types";

export type AnalysisPeriod = { mode: "month" | "year"; month: number; year: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

const ymd = (iso: string) => {
  const [y, m, d] = iso.split("T")[0]!.split("-").map(Number);
  return { y: y!, m: m!, d: d! };
};

/** Transações do mês (mode "month") ou do ano inteiro (mode "year"). */
export function inPeriod(transactions: Transaction[], p: AnalysisPeriod): Transaction[] {
  return transactions.filter((t) => {
    const { y, m } = ymd(t.date);
    return p.mode === "year" ? y === p.year : y === p.year && m - 1 === p.month;
  });
}

/** Mês anterior (ou ano anterior), para comparação. */
export function previousPeriod(p: AnalysisPeriod): AnalysisPeriod {
  if (p.mode === "year") return { ...p, year: p.year - 1 };
  return p.month === 0 ? { ...p, month: 11, year: p.year - 1 } : { ...p, month: p.month - 1 };
}

/** Avança (+1) ou volta (-1) um período. */
export function shiftPeriod(p: AnalysisPeriod, dir: 1 | -1): AnalysisPeriod {
  if (p.mode === "year") return { ...p, year: p.year + dir };
  const idx = p.year * 12 + p.month + dir;
  return { ...p, year: Math.floor(idx / 12), month: ((idx % 12) + 12) % 12 };
}

export type CategoryRow = {
  id: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  /** Participação no total do tipo (0 a 1). */
  share: number;
  count: number;
  /** Valor da mesma categoria no período anterior. */
  previous: number;
  /** Variação em % contra o período anterior; null se não havia valor antes. */
  deltaPct: number | null;
};

const UNCATEGORIZED = { name: "Sem categoria", color: "#737380", icon: "help-circle" };

/**
 * Valor por categoria (do maior para o menor) para um tipo (saída ou entrada),
 * comparado ao período anterior (`previousTransactions`).
 */
export function categoryBreakdown(
  transactions: Transaction[],
  previousTransactions: Transaction[],
  categories: Category[],
  type: TransactionType,
): CategoryRow[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const sum = (list: Transaction[]) => {
    const m = new Map<string, { amount: number; count: number }>();
    for (const t of list) {
      if (t.type !== type) continue;
      const key = byId.has(t.categoryId) ? t.categoryId : "none";
      const g = m.get(key) ?? { amount: 0, count: 0 };
      g.amount += t.amount;
      g.count++;
      m.set(key, g);
    }
    return m;
  };
  const current = sum(transactions);
  const before = sum(previousTransactions);
  const total = [...current.values()].reduce((s, g) => s + g.amount, 0);

  return [...current.entries()]
    .map(([key, g]) => {
      const c = byId.get(key);
      const prev = before.get(key)?.amount ?? 0;
      return {
        id: key,
        name: c?.name ?? UNCATEGORIZED.name,
        color: c?.color ?? UNCATEGORIZED.color,
        icon: c?.icon ?? UNCATEGORIZED.icon,
        amount: round2(g.amount),
        share: total > 0 ? g.amount / total : 0,
        count: g.count,
        previous: round2(prev),
        deltaPct: prev > 0 ? ((g.amount - prev) / prev) * 100 : null,
      };
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

export type Totals = { income: number; expense: number; balance: number; savingsRate: number | null };

/** Entrou, saiu, sobrou e quanto % do que entrou sobrou (null se nada entrou). */
export function totalsOf(transactions: Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  income = round2(income);
  expense = round2(expense);
  return { income, expense, balance: round2(income - expense), savingsRate: income > 0 ? (income - expense) / income : null };
}

export type MonthBar = { key: string; label: string; income: number; expense: number };

/** Entradas e saídas dos últimos `count` meses, terminando em `end` (do mais antigo ao mais novo). */
export function monthlySeries(transactions: Transaction[], end: { month: number; year: number }, count = 6): MonthBar[] {
  const out: MonthBar[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const idx = end.year * 12 + end.month - i;
    const year = Math.floor(idx / 12);
    const month = ((idx % 12) + 12) % 12;
    const t = totalsOf(inPeriod(transactions, { mode: "month", month, year }));
    out.push({ key: `${year}-${String(month + 1).padStart(2, "0")}`, label: getMonthShort(month), income: t.income, expense: t.expense });
  }
  return out;
}

export type PeriodInsights = {
  /** Média de gasto por dia (dias decorridos, se o período ainda está em andamento). */
  avgPerDay: number;
  topDay: { date: string; amount: number } | null;
  days: number;
};

/** Média diária de gasto e o dia em que mais se gastou. */
export function periodInsights(transactions: Transaction[], p: AnalysisPeriod, today: Date = new Date()): PeriodInsights {
  const expenses = transactions.filter((t) => t.type === "expense");
  const total = expenses.reduce((s, t) => s + t.amount, 0);

  const start = p.mode === "year" ? new Date(p.year, 0, 1) : new Date(p.year, p.month, 1);
  const end = p.mode === "year" ? new Date(p.year, 11, 31) : new Date(p.year, p.month + 1, 0);
  const last = today < end ? (today < start ? start : today) : end;
  const days = Math.max(1, Math.round((last.getTime() - start.getTime()) / 86_400_000) + 1);

  const perDay = new Map<string, number>();
  for (const t of expenses) {
    const day = t.date.split("T")[0]!;
    perDay.set(day, (perDay.get(day) ?? 0) + t.amount);
  }
  let top: PeriodInsights["topDay"] = null;
  for (const [date, amount] of perDay) if (!top || amount > top.amount) top = { date, amount: round2(amount) };

  return { avgPerDay: round2(total / days), topDay: top, days };
}

/** Maiores lançamentos de uma categoria (ou de todas, com `categoryId` null) no tipo escolhido. */
export function topTransactions(transactions: Transaction[], type: TransactionType, categoryId: string | null, categories: Category[], limit = 5): Transaction[] {
  const known = new Set(categories.map((c) => c.id));
  return transactions
    .filter((t) => t.type === type && (categoryId === null || (categoryId === "none" ? !known.has(t.categoryId) : t.categoryId === categoryId)))
    .sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date))
    .slice(0, limit);
}

export type DonutSlice = { id: string; start: number; length: number };

/**
 * Fatias do anel como frações do círculo (0 a 1): início e comprimento de cada uma, com um pequeno
 * espaço entre elas quando há mais de uma. Valores zerados ficam de fora.
 */
export function donutSlices(items: { id: string; value: number }[], gap = 0.006): DonutSlice[] {
  const positive = items.filter((i) => i.value > 0);
  const total = positive.reduce((s, i) => s + i.value, 0);
  if (total <= 0) return [];
  const g = positive.length > 1 ? gap : 0;
  let acc = 0;
  return positive.map((i) => {
    const frac = i.value / total;
    const slice = { id: i.id, start: acc, length: Math.max(frac - g, 0.0005) };
    acc += frac;
    return slice;
  });
}

export function periodLabel(p: AnalysisPeriod, monthName: (i: number) => string): string {
  return p.mode === "year" ? String(p.year) : `${monthName(p.month)} ${p.year}`;
}

export const todayPeriod = (now: Date = new Date()): AnalysisPeriod => ({ mode: "month", month: now.getMonth(), year: now.getFullYear() });

