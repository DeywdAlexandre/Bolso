import { describe, expect, it } from "vitest";

import { invoiceFor } from "./cards";
import {
  detectInvoiceKey, InvoiceParseError, parseDateString, parseInvoiceJson, parseMoney, planInvoiceImport,
  similarity, stripInstallmentMarker, type ExtractedInvoice,
} from "./invoiceImport";
import type { Account, Category, Transaction } from "./types";

const card: Account = {
  id: "card", name: "Nubank", kind: "card", color: "#8b5cf6", initialBalance: 0, balanceDate: "2026-01-01",
  closingDay: 25, dueDay: 5, creditLimit: 5000, createdAt: "",
};
const categories: Category[] = [
  { id: "cat_food", name: "Alimentação", icon: "x", color: "#fff", type: "expense" },
  { id: "cat_leisure", name: "Lazer", icon: "x", color: "#fff", type: "expense" },
  { id: "cat_expense_other", name: "Outros", icon: "x", color: "#fff", type: "expense" },
  { id: "cat_income_other", name: "Outros", icon: "x", color: "#fff", type: "income" },
];
const dayOf = (iso: string) => iso.split("T")[0];

describe("parseMoney / parseDateString", () => {
  it("entende formatos brasileiros e americanos", () => {
    expect(parseMoney(12.5)).toBe(12.5);
    expect(parseMoney("R$ 1.234,56")).toBe(1234.56);
    expect(parseMoney("1,234.56")).toBe(1234.56);
    expect(parseMoney("59,90")).toBe(59.9);
    expect(parseMoney("1.234.567")).toBe(1234567);
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
  });

  it("crédito/negativo vira negativo", () => {
    expect(parseMoney("-50,00")).toBe(-50);
    expect(parseMoney("(50,00)")).toBe(-50);
    expect(parseMoney("50,00 CR")).toBe(-50);
    expect(parseMoney("50,00-")).toBe(-50);
  });

  it("datas em vários formatos; inválidas viram null", () => {
    expect(parseDateString("2026-03-05")).toBe("2026-03-05");
    expect(parseDateString("05/03/2026")).toBe("2026-03-05");
    expect(parseDateString("05/03/26")).toBe("2026-03-05");
    expect(parseDateString("31/02/2026")).toBeNull();
    expect(parseDateString("ontem")).toBeNull();
    expect(parseDateString(undefined)).toBeNull();
  });

  it("remove marcadores de parcela da descrição", () => {
    expect(stripInstallmentMarker("Notebook (3/12)")).toBe("Notebook");
    expect(stripInstallmentMarker("Notebook Parcela 03/12")).toBe("Notebook");
    expect(stripInstallmentMarker("Notebook 3 de 12")).toBe("Notebook");
    expect(stripInstallmentMarker("Mercado 24")).toBe("Mercado 24");
  });
});

describe("parseInvoiceJson", () => {
  const body = {
    closingDate: "25/10/2026", dueDate: "2026-11-05", total: "R$ 380,00",
    items: [
      { date: "2026-10-02", description: "Mercado Central", amount: "120,50", category: "Alimentação" },
      { date: "03/10/2026", description: "Notebook Parcela 03/12", amount: 200 },
      { date: "2026-10-10", description: "Estorno loja", amount: "-39,50" },
    ],
  };

  it("lê JSON puro, em bloco ```json e com texto em volta", () => {
    const plain = parseInvoiceJson(JSON.stringify(body)).invoice;
    const fenced = parseInvoiceJson("Aqui está:\n```json\n" + JSON.stringify(body) + "\n```\nPronto!").invoice;
    expect(fenced).toEqual(plain);
    expect(plain.items).toHaveLength(3);
  });

  it("normaliza datas, valores, parcelas (do campo ou do texto) e total", () => {
    const inv = parseInvoiceJson(JSON.stringify(body)).invoice;
    expect(inv).toMatchObject({ closingDate: "2026-10-25", dueDate: "2026-11-05", total: 380 });
    expect(inv.items[0]).toEqual({ date: "2026-10-02", description: "Mercado Central", amount: 120.5, category: "Alimentação", installment: undefined });
    expect(inv.items[1]).toMatchObject({ date: "2026-10-03", description: "Notebook", installment: { index: 3, total: 12 } });
    expect(inv.items[2]!.amount).toBe(-39.5);
  });

  it("aceita parcela estruturada e descarta itens inválidos contando quantos", () => {
    const r = parseInvoiceJson(JSON.stringify({ items: [
      { date: "2026-10-02", description: "TV", amount: 100, installment: { index: "2", total: "10" } },
      { date: "xx", description: "ruim", amount: 5 },
      { date: "2026-10-02", description: "", amount: 5 },
      { date: "2026-10-02", description: "zero", amount: 0 },
    ] }));
    expect(r.invoice.items).toHaveLength(1);
    expect(r.invoice.items[0]!.installment).toEqual({ index: 2, total: 10 });
    expect(r.dropped).toBe(3);
  });

  it("respostas sem dados geram erro claro", () => {
    expect(() => parseInvoiceJson("não consegui ler")).toThrow(InvoiceParseError);
    expect(() => parseInvoiceJson("{ quebrado")).toThrow(InvoiceParseError);
    expect(() => parseInvoiceJson('{"items": "x"}')).toThrow(InvoiceParseError);
    expect(() => parseInvoiceJson('{"items": []}')).toThrow(/lançamentos válidos/);
  });

  it("similarity compara descrições ignorando acento, caixa e parcela", () => {
    expect(similarity("MERCADO Central", "mercado central (2/3)")).toBe(1);
    expect(similarity("Padaria do Zé", "padaria")).toBe(1);
    expect(similarity("Uber Trip", "Netflix")).toBe(0);
  });
});

describe("detectInvoiceKey", () => {
  const inv = (extra: Partial<ExtractedInvoice>): ExtractedInvoice => ({ items: [{ date: "2026-10-02", description: "x", amount: 1 }], ...extra });

  it("pelo fechamento, pelo vencimento ou pelas compras", () => {
    expect(detectInvoiceKey(card, inv({ closingDate: "2026-10-25" }))).toBe("2026-10");
    // vence dia 5 (< fechamento 25): vence no mês seguinte ao do fechamento
    expect(detectInvoiceKey(card, inv({ dueDate: "2026-11-05" }))).toBe("2026-10");
    expect(detectInvoiceKey({ ...card, closingDay: 20, dueDay: 28 }, inv({ dueDate: "2026-10-28" }))).toBe("2026-10");
    expect(detectInvoiceKey(card, inv({}))).toBe("2026-10");
  });
});

describe("planInvoiceImport", () => {
  const exist = (over: Partial<Transaction>): Transaction => ({
    id: `e${Math.random()}`, type: "expense", amount: 0, categoryId: "cat_food", description: "", date: "2026-10-02T15:00:00.000Z",
    accountId: "card", createdAt: "", ...over,
  });
  let g = 0;
  const run = (invoice: ExtractedInvoice, existing: Transaction[] = []) =>
    planInvoiceImport({ card, existing, invoice, categories, newId: () => `ig${++g}` });

  it("compras novas viram gastos no cartão (crédito), com categoria resolvida", () => {
    const plan = run({ closingDate: "2026-10-25", items: [
      { date: "2026-10-02", description: "Mercado Central", amount: 120.5, category: "alimentacao" },
      { date: "2026-10-05", description: "Cinema", amount: 40, category: "Entretenimento?" },
    ] });
    expect(plan.invoiceKey).toBe("2026-10");
    expect(plan.toCreate).toHaveLength(2);
    expect(plan.toCreate[0]!.tx).toMatchObject({ type: "expense", amount: 120.5, categoryId: "cat_food", accountId: "card", paymentMethod: "credit" });
    expect(plan.toCreate[1]!.tx.categoryId).toBe("cat_expense_other"); // categoria desconhecida → Outros
  });

  it("estorno vira entrada na categoria de entrada; pagamento da fatura anterior é ignorado", () => {
    const plan = run({ items: [
      { date: "2026-10-10", description: "Estorno Loja X", amount: -39.5 },
      { date: "2026-10-01", description: "Pagamento recebido - obrigado", amount: -800 },
      { date: "2026-10-12", description: "Mercado", amount: 100 },
    ], closingDate: "2026-10-25" });
    expect(plan.ignored).toHaveLength(1);
    expect(plan.toCreate.map((p) => p.tx.type)).toEqual(["income", "expense"]);
    expect(plan.toCreate[0]!.tx).toMatchObject({ amount: 39.5, categoryId: "cat_income_other" });
    expect(plan.itemsTotal).toBe(60.5); // 100 − 39,50 (o pagamento não conta)
  });

  it("não duplica o que já foi lançado (mesmo valor, data próxima, descrição parecida)", () => {
    const existing = [exist({ amount: 120.5, description: "mercado", date: "2026-10-03T15:00:00.000Z" })];
    const plan = run({ closingDate: "2026-10-25", items: [
      { date: "2026-10-02", description: "MERCADO CENTRAL", amount: 120.5 },
      { date: "2026-10-06", description: "Cinema", amount: 40 },
    ] }, existing);
    expect(plan.duplicates).toHaveLength(1);
    expect(plan.toCreate.map((p) => p.label)).toEqual(["Cinema"]);
  });

  it("dois itens idênticos na fatura e só um já lançado: importa o que falta", () => {
    const existing = [exist({ amount: 10, description: "Café" })];
    const plan = run({ closingDate: "2026-10-25", items: [
      { date: "2026-10-02", description: "Café", amount: 10 },
      { date: "2026-10-02", description: "Café", amount: 10 },
    ] }, existing);
    expect(plan.duplicates).toHaveLength(1);
    expect(plan.toCreate).toHaveLength(1);
  });

  it("assinatura do mês passado (mesma descrição e valor) não é duplicata da deste mês", () => {
    const existing = [exist({ amount: 39.9, description: "Netflix", date: "2026-09-10T15:00:00.000Z" })];
    const plan = run({ closingDate: "2026-10-25", items: [{ date: "2026-10-10", description: "Netflix", amount: 39.9 }] }, existing);
    expect(plan.duplicates).toHaveLength(0);
    expect(plan.toCreate).toHaveLength(1);
  });

  it("valor igual em outro dia/descrição não é tratado como duplicata", () => {
    const existing = [exist({ amount: 50, description: "Farmácia", date: "2026-09-01T15:00:00.000Z" })];
    const plan = run({ closingDate: "2026-10-25", items: [{ date: "2026-10-12", description: "Posto Shell", amount: 50 }] }, existing);
    expect(plan.duplicates).toHaveLength(0);
    expect(plan.toCreate).toHaveLength(1);
  });

  describe("compras parceladas", () => {
    const invoice: ExtractedInvoice = {
      closingDate: "2026-10-25",
      items: [{ date: "2026-08-14", description: "Notebook Dell", amount: 100, installment: { index: 3, total: 6 } }],
    };

    it("cria a parcela desta fatura e as faltantes nas próximas, todas no mesmo grupo", () => {
      const plan = run(invoice);
      expect(plan.toCreate.map((p) => p.tx.installmentIndex)).toEqual([3, 4, 5, 6]);
      expect(new Set(plan.toCreate.map((p) => p.tx.installmentGroupId)).size).toBe(1);
      expect(plan.toCreate.map((p) => p.origin)).toEqual(["statement", "future_installment", "future_installment", "future_installment"]);
      expect(plan.toCreate[0]!.tx.description).toBe("Notebook Dell (3/6)");
      expect(plan.toCreate.every((p) => p.tx.amount === 100 && p.tx.installmentTotal === 6)).toBe(true);
    });

    it("a parcela da fatura cai na fatura lida e as seguintes em meses consecutivos", () => {
      const plan = run(invoice);
      const keys = plan.toCreate.map((p) => invoiceFor(card, dayOf(p.tx.date)!).key);
      // a data impressa é da compra original (agosto): a parcela 3 é ajustada para cair em outubro
      expect(keys).toEqual(["2026-10", "2026-11", "2026-12", "2027-01"]);
    });

    it("completa uma compra já lançada pela metade, sem repetir parcelas existentes", () => {
      const grp = (i: number, date: string) => exist({ amount: 100, description: `Notebook Dell (${i}/6)`, installmentGroupId: "gx", installmentIndex: i, installmentTotal: 6, date: `${date}T15:00:00.000Z` });
      const plan = run(invoice, [grp(3, "2026-10-15"), grp(4, "2026-11-15")]);
      expect(plan.duplicates).toHaveLength(1); // a 3/6 já estava
      expect(plan.toCreate.map((p) => p.tx.installmentIndex)).toEqual([5, 6]);
      expect(plan.toCreate.every((p) => p.tx.installmentGroupId === "gx")).toBe(true);
    });

    it("importar a mesma fatura de novo não cria nada", () => {
      const first = run(invoice);
      const saved = first.toCreate.map((p, i) => ({ ...p.tx, id: `s${i}`, createdAt: "" }) as Transaction);
      const again = run(invoice, saved);
      expect(again.toCreate).toHaveLength(0);
    });

    it("última parcela não gera futuras", () => {
      const plan = run({ closingDate: "2026-10-25", items: [{ date: "2026-10-03", description: "TV", amount: 50, installment: { index: 6, total: 6 } }] });
      expect(plan.toCreate).toHaveLength(1);
    });
  });

  it("avisa quando a soma dos itens não bate com o total da fatura", () => {
    const plan = run({ closingDate: "2026-10-25", total: 500, items: [{ date: "2026-10-02", description: "Mercado", amount: 120 }] });
    expect(plan.difference).toBe(380);
    expect(plan.warnings.join(" ")).toMatch(/difere do total/);
    const ok = run({ closingDate: "2026-10-25", total: 120, items: [{ date: "2026-10-02", description: "Mercado", amount: 120 }] });
    expect(ok.difference).toBe(0);
    expect(ok.warnings).toEqual([]);
  });

  it("só considera lançamentos do próprio cartão ao procurar duplicatas", () => {
    const other = exist({ amount: 120.5, description: "Mercado Central", accountId: "outra" });
    const plan = run({ closingDate: "2026-10-25", items: [{ date: "2026-10-02", description: "Mercado Central", amount: 120.5 }] }, [other]);
    expect(plan.toCreate).toHaveLength(1);
  });
});
