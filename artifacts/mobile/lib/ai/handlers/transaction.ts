import { findAccount, parsePaymentMethod, validateTransfer, type BalanceSummary } from "../../accounts";
import { planInstallments } from "../../cards";
import type { Account, Category, PaymentMethod, Recurring, Transaction, TransactionType, Transfer } from "../../types";
import { genId, todayIso, toIsoDay } from "../../format";
import type {
  AddTransactionArgs,
  ListTransactionsArgs,
  SummaryArgs,
  AddRecurringArgs,
  DeleteTransactionArgs,
  TransferArgs,
} from "../toolTypes";

export function findCategory(categories: Category[], name: string, type: TransactionType): Category | undefined {
  const norm = name.trim().toLowerCase();
  return (
    categories.find((c) => c.type === type && c.name.toLowerCase() === norm) ||
    categories.find((c) => c.type === type && c.name.toLowerCase().includes(norm)) ||
    categories.find((c) => c.type === type && c.id.toLowerCase().includes(norm))
  );
}

export function buildTransactionHandlers(deps: {
  transactions: Transaction[];
  categories: Category[];
  addTransaction: (t: Transaction) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  addRecurring: (r: Recurring) => Promise<void>;
  accounts: Account[];
  balances: BalanceSummary;
  /** Resumo dos cartões (fatura atual, dívida, parcelas) para list_accounts. */
  cardSummaries?: () => unknown[];
  addTransfer: (t: Omit<Transfer, "id" | "createdAt">) => Promise<Transfer>;
  /** Conta usada quando o usuário não diz qual (só se ainda estiver ativa). */
  defaultAccountId?: string;
}) {
  const activeAccounts = () => deps.accounts.filter((a) => !a.archived);

  /** Conta pedida pelo nome; sem nome, a padrão. Erro se o nome não existir ou a forma for inválida. */
  function resolveAccountAndMethod(
    accountName: string | undefined,
    method: string | undefined,
  ): { accountId?: string; paymentMethod?: PaymentMethod; error?: string } {
    let accountId: string | undefined;
    if (accountName?.trim()) {
      const found = findAccount(deps.accounts, accountName);
      if (!found) {
        const names = activeAccounts().map((a) => a.name).join(", ") || "nenhuma conta cadastrada";
        return { error: `Conta "${accountName}" não encontrada. Contas disponíveis: ${names}.` };
      }
      accountId = found.id;
    } else if (deps.defaultAccountId && activeAccounts().some((a) => a.id === deps.defaultAccountId)) {
      accountId = deps.defaultAccountId;
    }

    let paymentMethod: PaymentMethod | undefined;
    if (method?.trim()) {
      paymentMethod = parsePaymentMethod(method);
      if (!paymentMethod) return { error: `Forma de pagamento "${method}" inválida. Use: pix, debit, cash, boleto, transfer ou other.` };
    }
    return { accountId, paymentMethod };
  }

  const accountName = (id: string | undefined) => (id ? deps.accounts.find((a) => a.id === id)?.name : undefined);

  return {
    async addTransaction(args: AddTransactionArgs) {
      if (!args || typeof args.amount !== "number" || args.amount <= 0) {
        return { ok: false, error: "amount inválido" };
      }
      const cat = findCategory(deps.categories, args.category || "", args.type);
      if (!cat) {
        const list = deps.categories
          .filter((c) => c.type === args.type)
          .map((c) => c.name)
          .join(", ");
        return { ok: false, error: `Categoria não encontrada. Categorias de ${args.type === "income" ? "entrada" : "gasto"}: ${list}` };
      }
      const date = args.date ? new Date(args.date).toISOString() : todayIso();
      const where = resolveAccountAndMethod(args.account, args.paymentMethod);
      if (where.error) return { ok: false, error: where.error };
      const onCard = deps.accounts.find((a) => a.id === where.accountId)?.kind === "card";
      if (onCard) where.paymentMethod = "credit";
      else if (where.paymentMethod === "credit") where.paymentMethod = undefined;

      const count = Math.floor(args.installments ?? 1);
      if (count > 1) {
        if (!onCard || args.type !== "expense") {
          return { ok: false, error: "Parcelamento só vale para compras (gastos) em uma conta de cartão de crédito." };
        }
        const groupId = "ig_" + genId();
        const baseName = args.description?.trim() || cat.name;
        const day = toIsoDay(new Date(date));
        const created: Transaction[] = [];
        for (const p of planInstallments(args.amount, count, day)) {
          const part: Transaction = {
            id: genId(),
            type: "expense",
            amount: p.amount,
            categoryId: cat.id,
            description: `${baseName} (${p.index}/${p.total})`,
            date: new Date(`${p.date}T12:00:00`).toISOString(),
            accountId: where.accountId,
            paymentMethod: "credit",
            installmentGroupId: groupId,
            installmentIndex: p.index,
            installmentTotal: p.total,
            createdAt: new Date().toISOString(),
          };
          await deps.addTransaction(part);
          created.push(part);
        }
        return { ok: true, installments: created.length, installmentAmount: created[0]!.amount, total: args.amount, accountName: accountName(where.accountId) };
      }
      const tx: Transaction = {
        id: genId(),
        type: args.type,
        amount: args.amount,
        categoryId: cat.id,
        description: args.description?.trim() || cat.name,
        date,
        accountId: where.accountId,
        paymentMethod: where.paymentMethod,
        createdAt: new Date().toISOString(),
      };
      await deps.addTransaction(tx);
      return { ok: true, transaction: tx, accountName: accountName(tx.accountId) ?? "Sem conta" };
    },

    async transferBetweenAccounts(args: TransferArgs) {
      const from = findAccount(deps.accounts, args?.from);
      const to = findAccount(deps.accounts, args?.to);
      const names = activeAccounts().map((a) => a.name).join(", ") || "nenhuma conta cadastrada";
      if (!from) return { ok: false, error: `Conta de origem "${args?.from}" não encontrada. Contas disponíveis: ${names}.` };
      if (!to) return { ok: false, error: `Conta de destino "${args?.to}" não encontrada. Contas disponíveis: ${names}.` };
      const error = validateTransfer(deps.accounts, { fromAccountId: from.id, toAccountId: to.id, amount: args.amount });
      if (error) return { ok: false, error };
      const transfer = await deps.addTransfer({
        fromAccountId: from.id,
        toAccountId: to.id,
        amount: args.amount,
        date: args.date ? new Date(args.date).toISOString() : todayIso(),
        note: args.note?.trim() || undefined,
      });
      return { ok: true, transfer, from: from.name, to: to.name };
    },

    async listAccounts() {
      return {
        hasAccounts: deps.balances.hasAccounts,
        accounts: deps.balances.accounts.map(({ account, balance }) => ({
          name: account.name,
          kind: account.kind,
          balance,
          isDefault: account.id === deps.defaultAccountId,
        })),
        cards: deps.cardSummaries?.() ?? [],
        unassigned: deps.balances.unassigned,
        total: deps.balances.total,
        note: deps.balances.hasAccounts
          ? undefined
          : "O usuário ainda não cadastrou contas (Configurações → Bancos e carteira). O total é o saldo geral acumulado.",
      };
    },

    async listTransactions(args: ListTransactionsArgs) {
      let list = [...deps.transactions];
      if (args.type && args.type !== "all") list = list.filter((t) => t.type === args.type);
      if (args.category) {
        const cat = deps.categories.find((c) => c.name.toLowerCase() === args.category!.toLowerCase());
        if (cat) list = list.filter((t) => t.categoryId === cat.id);
      }
      if (args.account) {
        const acc = findAccount(deps.accounts, args.account);
        if (!acc) return { transactions: [], total: 0, error: `Conta "${args.account}" não encontrada.` } as never;
        list = list.filter((t) => t.accountId === acc.id);
      }
      if (args.month || args.year) {
        const now = new Date();
        const month = (args.month ?? now.getMonth() + 1) - 1;
        const year = args.year ?? now.getFullYear();
        list = list.filter((t) => {
          const d = new Date(t.date);
          return d.getMonth() === month && d.getFullYear() === year;
        });
      }
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const limit = args.limit ?? 20;
      const sliced = list.slice(0, limit);
      const enriched = sliced.map((t) => ({
        ...t,
        categoryName: deps.categories.find((c) => c.id === t.categoryId)?.name ?? "?",
        accountName: accountName(t.accountId) ?? "Sem conta",
      }));
      return { transactions: enriched, total: list.length };
    },

    async getSummary(args: SummaryArgs) {
      const now = new Date();
      const month = (args.month ?? now.getMonth() + 1) - 1;
      const year = args.year ?? now.getFullYear();
      const period = args.month ? `${(month + 1).toString().padStart(2, "0")}/${year}` : `${year}`;

      let list = deps.transactions;
      if (args.month) {
        list = list.filter((t) => {
          const d = new Date(t.date);
          return d.getMonth() === month && d.getFullYear() === year;
        });
      } else if (args.year || true) {
        list = list.filter((t) => new Date(t.date).getFullYear() === year);
      }

      const income = list.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expense = list.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

      const byCatMap = new Map<string, number>();
      for (const t of list) {
        const cat = deps.categories.find((c) => c.id === t.categoryId);
        if (!cat) continue;
        const key = `${cat.type}:${cat.name}`;
        byCatMap.set(key, (byCatMap.get(key) ?? 0) + t.amount);
      }
      const byCategory = Array.from(byCatMap.entries())
        .map(([k, total]) => {
          const [type, name] = k.split(":");
          return { category: name!, type: type as TransactionType, total };
        })
        .sort((a, b) => b.total - a.total);

      return { period, income, expense, balance: income - expense, byCategory };
    },

    async getCategories() {
      return {
        income: deps.categories.filter((c) => c.type === "income").map((c) => ({ id: c.id, name: c.name })),
        expense: deps.categories.filter((c) => c.type === "expense").map((c) => ({ id: c.id, name: c.name })),
      };
    },

    async addRecurring(args: AddRecurringArgs) {
      if (!args || typeof args.amount !== "number" || args.amount <= 0) {
        return { ok: false, error: "amount inválido" };
      }
      if (!args.dayOfMonth || args.dayOfMonth < 1 || args.dayOfMonth > 31) {
        return { ok: false, error: "dayOfMonth deve ser entre 1 e 31" };
      }
      const cat = findCategory(deps.categories, args.category || "", args.type);
      if (!cat) return { ok: false, error: "Categoria não encontrada" };
      const where = resolveAccountAndMethod(args.account, args.paymentMethod);
      if (where.error) return { ok: false, error: where.error };
      const r: Recurring = {
        id: genId(),
        type: args.type,
        amount: args.amount,
        categoryId: cat.id,
        description: args.description?.trim() || cat.name,
        dayOfMonth: args.dayOfMonth,
        active: true,
        accountId: where.accountId,
        paymentMethod: where.paymentMethod,
        createdAt: new Date().toISOString(),
      };
      await deps.addRecurring(r);
      return { ok: true, recurring: r };
    },

    async deleteTransaction(args: DeleteTransactionArgs) {
      if (args.id) {
        await deps.removeTransaction(args.id);
        return { ok: true, deleted: 1 };
      }
      if (args.description) {
        const norm = args.description.toLowerCase();
        const found = deps.transactions.filter((t) => t.description.toLowerCase().includes(norm));
        if (found.length === 0) return { ok: false, error: "Transação não encontrada" };
        if (found.length > 1) {
          return { ok: false, error: `Múltiplas transações encontradas: ${found.map((f) => `${f.description} (R$ ${f.amount})`).join(", ")}. Forneça mais detalhes.` };
        }
        await deps.removeTransaction(found[0].id);
        return { ok: true, deleted: 1 };
      }
      return { ok: false, error: "Forneça id ou descrição" };
    },
  };
}
