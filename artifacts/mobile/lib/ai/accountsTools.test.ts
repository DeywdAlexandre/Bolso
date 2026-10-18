import { describe, expect, it } from "vitest";

import { computeBalances, findAccount, parsePaymentMethod } from "../accounts";
import { buildTransactionHandlers } from "./handlers/transaction";
import { AI_TOOLS } from "./toolDefinitions";
import { SYSTEM_PROMPT } from "./systemPrompt";
import type { Account, Category, Recurring, Transaction, Transfer } from "../types";

const acc = (id: string, name: string, initialBalance: number, extra: Partial<Account> = {}): Account => ({
  id, name, kind: "bank", color: "#000", initialBalance, balanceDate: "2026-01-01", createdAt: "2026-01-01T00:00:00.000Z", ...extra,
});
const accounts = [acc("a1", "Nubank", 1200), acc("a2", "Itaú", 300), acc("a3", "Velha", 0, { archived: true })];
const categories: Category[] = [{ id: "cat_food", name: "Alimentação", icon: "coffee", color: "#fff", type: "expense" }];

function setup(defaultAccountId?: string, existing: Transaction[] = []) {
  const added: Transaction[] = [];
  const recs: Recurring[] = [];
  const moved: Omit<Transfer, "id" | "createdAt">[] = [];
  const handlers = buildTransactionHandlers({
    addTransfer: async (t) => { moved.push(t); return { ...t, id: "tr1", createdAt: "" }; },
    transactions: existing,
    categories,
    addTransaction: async (t) => { added.push(t); },
    removeTransaction: async () => {},
    addRecurring: async (r) => { recs.push(r); },
    accounts,
    balances: computeBalances(accounts, existing),
    defaultAccountId,
  });
  return { handlers, added, recs, moved };
}

describe("busca de conta e forma de pagamento", () => {
  it("acha conta ignorando acento, caixa e trechos; ignora arquivadas", () => {
    expect(findAccount(accounts, "nubank")?.id).toBe("a1");
    expect(findAccount(accounts, "itau")?.id).toBe("a2");
    expect(findAccount(accounts, "no Nubank")?.id).toBe("a1");
    expect(findAccount(accounts, "velha")).toBeUndefined();
    expect(findAccount(accounts, "")).toBeUndefined();
  });

  it("entende formas de pagamento em português e inglês", () => {
    expect(parsePaymentMethod("Pix")).toBe("pix");
    expect(parsePaymentMethod("débito")).toBe("debit");
    expect(parsePaymentMethod("Dinheiro")).toBe("cash");
    expect(parsePaymentMethod("TED")).toBe("transfer");
    expect(parsePaymentMethod("cheque")).toBeUndefined();
  });
});

describe("Finn: add_transaction com conta", () => {
  it("registra na conta e na forma pedidas e informa o nome da conta", async () => {
    const { handlers, added } = setup();
    const r = await handlers.addTransaction({ type: "expense", amount: 50, category: "Alimentação", account: "nubank", paymentMethod: "pix" });
    expect(r).toMatchObject({ ok: true, accountName: "Nubank" });
    expect(added[0]).toMatchObject({ accountId: "a1", paymentMethod: "pix", amount: 50 });
  });

  it("sem conta informada usa a padrão e avisa qual foi", async () => {
    const { handlers, added } = setup("a2");
    const r = await handlers.addTransaction({ type: "expense", amount: 10, category: "Alimentação" });
    expect(added[0]!.accountId).toBe("a2");
    expect(r).toMatchObject({ accountName: "Itaú" });
  });

  it("sem conta informada e sem padrão fica 'Sem conta'; padrão arquivada é ignorada", async () => {
    const a = setup();
    expect(await a.handlers.addTransaction({ type: "expense", amount: 10, category: "Alimentação" })).toMatchObject({ accountName: "Sem conta" });
    const b = setup("a3");
    await b.handlers.addTransaction({ type: "expense", amount: 10, category: "Alimentação" });
    expect(b.added[0]!.accountId).toBeUndefined();
  });

  it("conta inexistente ou forma inválida: erro claro e nada é gravado", async () => {
    const { handlers, added } = setup();
    const noAcc = await handlers.addTransaction({ type: "expense", amount: 10, category: "Alimentação", account: "Inter" });
    expect(noAcc).toMatchObject({ ok: false });
    expect((noAcc as { error: string }).error).toMatch(/Nubank, Itaú/);
    const badMethod = await handlers.addTransaction({ type: "expense", amount: 10, category: "Alimentação", paymentMethod: "cheque" });
    expect(badMethod).toMatchObject({ ok: false });
    expect(added).toHaveLength(0);
  });

  it("fixo também aceita conta e forma", async () => {
    const { handlers, recs } = setup();
    await handlers.addRecurring({ type: "expense", amount: 40, category: "Alimentação", dayOfMonth: 5, account: "Itaú", paymentMethod: "boleto" });
    expect(recs[0]).toMatchObject({ accountId: "a2", paymentMethod: "boleto" });
  });
});

describe("Finn: list_accounts e filtro por conta", () => {
  const tx = (id: string, amount: number, accountId?: string): Transaction => ({
    id, type: "expense", amount, categoryId: "cat_food", description: id, date: "2026-02-10T12:00:00.000Z", accountId, createdAt: "2026-02-10T12:00:00.000Z",
  });

  it("devolve saldos por conta, sem conta e total", async () => {
    const { handlers } = setup("a1", [tx("t1", 50, "a1"), tx("t2", 20)]);
    const r = await handlers.listAccounts();
    expect(r.accounts).toEqual([
      { name: "Nubank", kind: "bank", balance: 1150, isDefault: true },
      { name: "Itaú", kind: "bank", balance: 300, isDefault: false },
    ]);
    expect(r.unassigned).toBe(-20);
    expect(r.total).toBe(1430);
  });

  it("sem contas cadastradas explica ao Finn", async () => {
    const handlers = buildTransactionHandlers({
      transactions: [], categories, addTransaction: async () => {}, removeTransaction: async () => {}, addRecurring: async () => {},
      accounts: [], balances: computeBalances([], []), addTransfer: async (t) => ({ ...t, id: "x", createdAt: "" }),
    });
    expect((await handlers.listAccounts()).note).toMatch(/não cadastrou contas/);
  });

  it("list_transactions filtra por conta e mostra o nome da conta", async () => {
    const { handlers } = setup(undefined, [tx("t1", 50, "a1"), tx("t2", 20, "a2"), tx("t3", 5)]);
    const r = await handlers.listTransactions({ account: "itau" });
    expect(r.transactions.map((t) => t.id)).toEqual(["t2"]);
    expect(r.transactions[0]!.accountName).toBe("Itaú");
    const all = await handlers.listTransactions({});
    expect(all.transactions.find((t) => t.id === "t3")!.accountName).toBe("Sem conta");
  });
});

describe("Finn: transfer_between_accounts", () => {
  it("move dinheiro entre contas pelo nome", async () => {
    const { handlers, moved } = setup();
    const r = await handlers.transferBetweenAccounts({ from: "nubank", to: "itau", amount: 200, note: "saque" });
    expect(r).toMatchObject({ ok: true, from: "Nubank", to: "Itaú" });
    expect(moved[0]).toMatchObject({ fromAccountId: "a1", toAccountId: "a2", amount: 200, note: "saque" });
  });

  it("recusa contas inexistentes, iguais, arquivadas ou valor inválido, sem gravar nada", async () => {
    const { handlers, moved } = setup();
    expect(await handlers.transferBetweenAccounts({ from: "Inter", to: "Itaú", amount: 10 })).toMatchObject({ ok: false });
    expect(await handlers.transferBetweenAccounts({ from: "Nubank", to: "Nubank", amount: 10 })).toMatchObject({ ok: false });
    expect(await handlers.transferBetweenAccounts({ from: "Nubank", to: "Velha", amount: 10 })).toMatchObject({ ok: false });
    expect(await handlers.transferBetweenAccounts({ from: "Nubank", to: "Itaú", amount: -5 })).toMatchObject({ ok: false });
    expect(moved).toHaveLength(0);
  });

  it("a ferramenta está definida para o modelo", () => {
    expect(AI_TOOLS.some((t) => t.function.name === "transfer_between_accounts")).toBe(true);
    expect(SYSTEM_PROMPT).toMatch(/transfer_between_accounts/);
  });
});

describe("definições para o modelo", () => {
  it("expõem conta/forma e a ferramenta list_accounts; o prompt orienta o uso", () => {
    const add = AI_TOOLS.find((t) => t.function.name === "add_transaction")!;
    expect(Object.keys((add.function.parameters as { properties: object }).properties)).toEqual(expect.arrayContaining(["account", "paymentMethod"]));
    expect(AI_TOOLS.some((t) => t.function.name === "list_accounts")).toBe(true);
    expect(SYSTEM_PROMPT).toMatch(/list_accounts/);
    expect(SYSTEM_PROMPT).toMatch(/accountName/);
  });
});
