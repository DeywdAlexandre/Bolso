import type { Account, AccountKind, PaymentMethod, Transaction, Transfer } from "./types";

export const ACCOUNT_KINDS: { value: AccountKind; label: string; icon: "briefcase" | "dollar-sign" | "trending-up" | "credit-card" }[] = [
  { value: "bank", label: "Banco", icon: "briefcase" },
  { value: "wallet", label: "Carteira", icon: "dollar-sign" },
  { value: "savings", label: "Poupança", icon: "trending-up" },
  { value: "card", label: "Cartão de crédito", icon: "credit-card" },
];

export const ACCOUNT_COLORS = ["#8b5cf6", "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#64748b"];

/** "Crédito" só aparece ao lançar em uma conta de cartão (o app o define sozinho); nas demais contas ficaria errado. */
export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "debit", label: "Débito" },
  { value: "credit", label: "Crédito" },
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
  /** Bancos, carteira e poupança (sem cartões). */
  accounts: AccountBalance[];
  /** Cartões de crédito: o saldo é negativo quando há dívida. Não entram no total em dinheiro. */
  cards: AccountBalance[];
  /** Lançamentos feitos depois que as contas passaram a existir, mas sem conta. */
  unassigned: number;
  /** Dinheiro total: soma das contas (sem cartões) + "Sem conta". Sem contas, é o saldo acumulado de sempre. */
  total: number;
};

/** Saldo atual de uma conta: saldo inicial + lançamentos e transferências dela a partir de `balanceDate`. */
export function accountBalance(account: Account, transactions: Transaction[], transfers: Transfer[] = []): number {
  let balance = account.initialBalance;
  for (const t of transactions) {
    if (t.accountId === account.id && dayOf(t) >= account.balanceDate) balance += net(t);
  }
  for (const tr of transfers) {
    if (tr.date.split("T")[0]! < account.balanceDate) continue;
    if (tr.toAccountId === account.id) balance += tr.amount;
    if (tr.fromAccountId === account.id) balance -= tr.amount;
  }
  return Math.round(balance * 100) / 100;
}

export type TransferInput = { fromAccountId: string; toAccountId: string; amount: number };

/** Mensagem de erro se a transferência não for válida; null se estiver ok. */
export function validateTransfer(accounts: Account[], input: TransferInput): string | null {
  const active = (id: string) => accounts.some((a) => a.id === id && !a.archived);
  if (!(input.amount > 0)) return "Informe um valor maior que zero.";
  if (!active(input.fromAccountId)) return "Escolha a conta de origem.";
  if (!active(input.toAccountId)) return "Escolha a conta de destino.";
  if (input.fromAccountId === input.toAccountId) return "Origem e destino precisam ser contas diferentes.";
  return null;
}

export function computeBalances(
  accounts: Account[],
  transactions: Transaction[],
  transfers: Transfer[] = [],
): BalanceSummary {
  const active = accounts.filter((a) => !a.archived);

  if (active.length === 0) {
    const total = transactions.reduce((s, t) => s + net(t), 0);
    return { hasAccounts: false, accounts: [], cards: [], unassigned: 0, total: Math.round(total * 100) / 100 };
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

  const all = active.map((account) => ({ account, balance: accountBalance(account, transactions, transfers) }));
  const balances = all.filter((b) => b.account.kind !== "card");
  const cards = all.filter((b) => b.account.kind === "card");
  const total = Math.round((balances.reduce((s, b) => s + b.balance, 0) + unassigned) * 100) / 100;
  return { hasAccounts: true, accounts: balances, cards, unassigned, total };
}

/** Saldo inicial que faz a conta mostrar `desired` hoje (usado ao corrigir o saldo). */
export function initialBalanceFor(
  account: Account,
  transactions: Transaction[],
  desired: number,
  transfers: Transfer[] = [],
): number {
  const linked = accountBalance({ ...account, initialBalance: 0 }, transactions, transfers);
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

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Procura uma conta ativa pelo nome (sem acento/caixa): exato, depois começa com, depois contém. */
export function findAccount(accounts: Account[], query: string | undefined): Account | undefined {
  const q = normalize(query ?? "");
  if (!q) return undefined;
  const active = accounts.filter((a) => !a.archived);
  return (
    active.find((a) => normalize(a.name) === q) ??
    active.find((a) => normalize(a.name).startsWith(q)) ??
    active.find((a) => normalize(a.name).includes(q)) ??
    active.find((a) => q.includes(normalize(a.name)))
  );
}

const METHOD_ALIASES: Record<string, PaymentMethod> = {
  pix: "pix",
  credito: "credit",
  "cartao de credito": "credit",
  credit: "credit",
  debito: "debit",
  "cartao de debito": "debit",
  debit: "debit",
  dinheiro: "cash",
  especie: "cash",
  cash: "cash",
  boleto: "boleto",
  ted: "transfer",
  doc: "transfer",
  transferencia: "transfer",
  transfer: "transfer",
  outro: "other",
  other: "other",
};

/** Aceita o valor interno ("pix") ou o nome em português ("Débito", "dinheiro"). */
export function parsePaymentMethod(input: string | undefined): PaymentMethod | undefined {
  if (!input) return undefined;
  return METHOD_ALIASES[normalize(input)];
}
