import { paymentMethodLabel } from "./accounts";
import type { Account, Transaction } from "./types";

export type BreakdownRow = {
  key: string;
  label: string;
  color?: string;
  expense: number;
  income: number;
  count: number;
  /** Participação no total de gastos do período (0 a 1). */
  share: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function build(
  transactions: Transaction[],
  keyOf: (t: Transaction) => string,
  describe: (key: string) => { label: string; color?: string },
): BreakdownRow[] {
  const groups = new Map<string, { expense: number; income: number; count: number }>();
  for (const t of transactions) {
    const key = keyOf(t);
    const g = groups.get(key) ?? { expense: 0, income: 0, count: 0 };
    if (t.type === "income") g.income += t.amount;
    else g.expense += t.amount;
    g.count++;
    groups.set(key, g);
  }
  const totalExpense = [...groups.values()].reduce((s, g) => s + g.expense, 0);

  return [...groups.entries()]
    .map(([key, g]) => ({
      key,
      ...describe(key),
      expense: round2(g.expense),
      income: round2(g.income),
      count: g.count,
      share: totalExpense > 0 ? g.expense / totalExpense : 0,
    }))
    .sort((a, b) => b.expense - a.expense || b.income - a.income || a.label.localeCompare(b.label));
}

/** Gastos e entradas do período agrupados por conta (inclui "Sem conta"). */
export function breakdownByAccount(transactions: Transaction[], accounts: Account[]): BreakdownRow[] {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  return build(
    transactions,
    (t) => (t.accountId && byId.has(t.accountId) ? t.accountId : "none"),
    (key) => {
      const a = byId.get(key);
      return a ? { label: a.name, color: a.color } : { label: "Sem conta" };
    },
  );
}

/** Gastos e entradas do período agrupados por forma de pagamento (inclui "Sem forma"). */
export function breakdownByMethod(transactions: Transaction[]): BreakdownRow[] {
  return build(
    transactions,
    (t) => t.paymentMethod ?? "none",
    (key) => ({ label: key === "none" ? "Sem forma informada" : paymentMethodLabel(key as never) ?? key }),
  );
}
