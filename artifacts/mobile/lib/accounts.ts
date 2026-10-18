import type { Account, AccountKind, PaymentMethod, Transaction } from "./types";

export const ACCOUNT_KINDS: { value: AccountKind; label: string; icon: "briefcase" | "dollar-sign" | "trending-up" }[] = [
  { value: "bank", label: "Banco", icon: "briefcase" },
  { value: "wallet", label: "Carteira", icon: "dollar-sign" },
  { value: "savings", label: "Poupança", icon: "trending-up" },
];

export const ACCOUNT_COLORS = ["#8b5cf6", "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#64748b"];

/** Crédito fica de fora por enquanto: cartão será tratado por fatura (conta própria), senão o saldo do banco cairia na hora da compra. */
export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "debit", label: "Débito" },
  { value: "cash", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
  { value: "transfer", label: "Transferência" },
  { value: "other", label: "Outro" },
];

export function paymentMethodLabel(method: PaymentMethod | undefined): string | null {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? null;
}

/** Dia do lançamento (YYYY-MM-DD) sem passar por fuso horário, como no restante do app. */
const dayOf = (t: Transaction) => t.date.split("T")[0]!;
const net = (t: Transaction) => (t.type === "income" ? t.amount : -t.amount);

export type AccountBalance = { account: Account; balance: number };

export type BalanceSummary = {
  /** Existe ao menos uma conta ativa. */
  hasAccounts: boolean;
  accounts: AccountBalance[];
  /** Lançamentos feitos depois que as contas passaram a existir, mas sem conta. */
  unassigned: number;
  /** Dinheiro total: soma das contas + "Sem conta". Sem contas, é o saldo acumulado de sempre. */
  total: number;
};

/** Saldo atual de uma conta: saldo inicial + lançamentos dela a partir de `balanceDate`. */
export function accountBalance(account: Account, transactions: Transaction[]): number {
  let balance = account.initialBalance;
  for (const t of transactions) {
    if (t.accountId === account.id && dayOf(t) >= account.balanceDate) balance += net(t);
  }
  return Math.round(balance * 100) / 100;
}

export function computeBalances(accounts: Account[], transactions: Transaction[]): BalanceSummary {
  const active = accounts.filter((a) => !a.archived);

  if (active.length === 0) {
    const total = transactions.reduce((s, t) => s + net(t), 0);
    return { hasAccounts: false, accounts: [], unassigned: 0, total: Math.round(total * 100) / 100 };
  }

  const known = new Set(accounts.map((a) => a.id));
  // Lançamentos de antes das contas já estão embutidos nos saldos informados.
  const adoption = accounts.map((a) => a.balanceDate).sort()[0]!;
  let unassigned = 0;
  for (const t of transactions) {
    const orphan = !t.accountId || !known.has(t.accountId);
    if (orphan && dayOf(t) >= adoption) unassigned += net(t);
  }
  unassigned = Math.round(unassigned * 100) / 100;

  const balances = active.map((account) => ({ account, balance: accountBalance(account, transactions) }));
  const total = Math.round((balances.reduce((s, b) => s + b.balance, 0) + unassigned) * 100) / 100;
  return { hasAccounts: true, accounts: balances, unassigned, total };
}

/** Saldo inicial que faz a conta mostrar `desired` hoje (usado ao corrigir o saldo). */
export function initialBalanceFor(account: Account, transactions: Transaction[], desired: number): number {
  const linked = accountBalance({ ...account, initialBalance: 0 }, transactions);
  return Math.round((desired - linked) * 100) / 100;
}

/** Conta pré-selecionada no formulário: a última usada, senão a padrão; só se ainda estiver ativa. */
export function preselectedAccountId(
  accounts: Account[],
  lastAccountId?: string,
  defaultAccountId?: string,
): string | undefined {
  const active = new Set(accounts.filter((a) => !a.archived).map((a) => a.id));
  if (lastAccountId && active.has(lastAccountId)) return lastAccountId;
  if (defaultAccountId && active.has(defaultAccountId)) return defaultAccountId;
  return undefined;
}
