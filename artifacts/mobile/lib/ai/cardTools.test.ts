import { describe, expect, it } from "vitest";

import { computeBalances } from "../accounts";
import { toIsoDay } from "../format";
import { buildCardHandlers } from "./handlers/card";
import { buildTransactionHandlers } from "./handlers/transaction";
import { AI_TOOLS } from "./toolDefinitions";
import type { Account, Category, Transaction, Transfer } from "../types";

const today = new Date();
const iso = (offsetDays: number) => {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offsetDays, 12);
  return d.toISOString();
};

// Cartão que fecha no dia de ontem: compras de hoje caem na fatura seguinte.
const closingDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).getDate();
const accounts: Account[] = [
  { id: "bank", name: "Itaú", kind: "bank", color: "#000", initialBalance: 1000, balanceDate: "2020-01-01", createdAt: "" },
  { id: "card", name: "Nubank Cartão", kind: "card", color: "#8b5cf6", initialBalance: 0, balanceDate: "2020-01-01", closingDay, dueDay: 28, creditLimit: 5000, createdAt: "" },
];
const categories: Category[] = [{ id: "cat_shop", name: "Compras", icon: "shopping-bag", color: "#fff", type: "expense" }];

function setup(existing: Transaction[] = [], transfers: Transfer[] = []) {
  const added: Transaction[] = [];
  const cards = buildCardHandlers({ accounts, categories, transactions: existing, transfers });
  const handlers = buildTransactionHandlers({
    transactions: existing, categories, accounts, balances: computeBalances(accounts, existing, transfers),
    addTransaction: async (t) => { added.push(t); }, removeTransaction: async () => {}, addRecurring: async () => {},
    addTransfer: async (t) => ({ ...t, id: "x", createdAt: "" }), cardSummaries: cards.summarizeCards,
  });
  return { handlers, cards, added };
}

describe("Finn: compra parcelada no cartão", () => {
  it("12x de 100: cria 12 lançamentos ligados, em meses seguidos, forma crédito", async () => {
    const { handlers, added } = setup();
    const r = await handlers.addTransaction({ type: "expense", amount: 1200, category: "Compras", description: "Notebook", account: "nubank", installments: 12 });
    expect(r).toMatchObject({ ok: true, installments: 12, installmentAmount: 100, total: 1200 });
    expect(added).toHaveLength(12);
    expect(new Set(added.map((t) => t.installmentGroupId)).size).toBe(1);
    expect(added[0]).toMatchObject({ description: "Notebook (1/12)", paymentMethod: "credit", accountId: "card", installmentIndex: 1, installmentTotal: 12 });
    expect(added[11]).toMatchObject({ description: "Notebook (12/12)", installmentIndex: 12 });
    expect(added.reduce((s, t) => s + t.amount, 0)).toBeCloseTo(1200, 10);
    const months = added.map((t) => t.date.slice(0, 7));
    expect(new Set(months).size).toBe(12);
  });

  it("parcelar fora de cartão (ou entrada) é recusado e nada é gravado", async () => {
    const { handlers, added } = setup();
    expect(await handlers.addTransaction({ type: "expense", amount: 300, category: "Compras", account: "Itaú", installments: 3 })).toMatchObject({ ok: false });
    expect(await handlers.addTransaction({ type: "income", amount: 300, category: "Compras", account: "Nubank", installments: 3 })).toMatchObject({ ok: false });
    expect(added).toHaveLength(0);
  });

  it("compra à vista no cartão vira crédito automaticamente; 'crédito' fora do cartão é ignorado", async () => {
    const { handlers, added } = setup();
    await handlers.addTransaction({ type: "expense", amount: 50, category: "Compras", account: "Nubank" });
    await handlers.addTransaction({ type: "expense", amount: 20, category: "Compras", account: "Itaú", paymentMethod: "credit" });
    expect(added[0]).toMatchObject({ accountId: "card", paymentMethod: "credit" });
    expect(added[1]).toMatchObject({ accountId: "bank" });
    expect(added[1]!.paymentMethod).toBeUndefined();
  });
});

describe("Finn: faturas e cartões", () => {
  const buy = (amount: number, offset: number, extra: Partial<Transaction> = {}): Transaction => ({
    id: `t${Math.random()}`, type: "expense", amount, categoryId: "cat_shop", description: "Compra", date: iso(offset),
    accountId: "card", createdAt: "", ...extra,
  });

  it("list_accounts traz cartões com fatura atual, dívida e limite", async () => {
    const { handlers } = setup([buy(300, 0), buy(100, 0)]);
    const r = await handlers.listAccounts();
    expect(r.cards).toHaveLength(1);
    expect(r.cards[0]).toMatchObject({ name: "Nubank Cartão", debt: 400, creditLimit: 5000, limitAvailable: 4600 });
    expect(r.total).toBe(1000); // compra no cartão não reduz o dinheiro
  });

  it("get_card_invoice detalha a fatura e as parcelas faltantes", async () => {
    const parts = [1, 2, 3].map((i) => buy(100, 0, { description: `Geladeira (${i}/3)`, installmentGroupId: "g", installmentIndex: i, installmentTotal: 3, date: iso(i === 1 ? 0 : i * 31) }));
    const { cards } = setup(parts);
    const r = await cards.getCardInvoice({ card: "nubank" });
    expect(r).toMatchObject({ ok: true, card: "Nubank Cartão" });
    expect((r as { invoice: { items: unknown[] } }).invoice.items.length).toBeGreaterThan(0);
    expect((r as { pendingInstallments: { description: string; remaining: number }[] }).pendingInstallments[0]).toMatchObject({ description: "Geladeira", remaining: 3 });
  });

  it("cartão inexistente, mês sem fatura e cartão sem compras", async () => {
    const { cards } = setup([buy(10, 0)]);
    expect(await cards.getCardInvoice({ card: "Inter" })).toMatchObject({ ok: false });
    expect(await cards.getCardInvoice({ card: "Nubank", month: "1999-01" })).toMatchObject({ ok: true, invoice: null });
    expect(await setup().cards.getCardInvoice({ card: "Nubank" })).toMatchObject({ ok: true, invoice: null });
    expect(toIsoDay(today)).toBeTruthy();
  });

  it("as ferramentas estão definidas e aceitam parcelas", () => {
    const add = AI_TOOLS.find((t) => t.function.name === "add_transaction")!;
    expect(Object.keys((add.function.parameters as { properties: object }).properties)).toContain("installments");
    expect(AI_TOOLS.some((t) => t.function.name === "get_card_invoice")).toBe(true);
  });
});
