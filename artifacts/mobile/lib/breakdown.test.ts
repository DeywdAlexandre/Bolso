import { describe, expect, it } from "vitest";

import { breakdownByAccount, breakdownByMethod } from "./breakdown";
import type { Account, PaymentMethod, Transaction } from "./types";

const accounts: Account[] = [
  { id: "a1", name: "Nubank", kind: "bank", color: "#8b5cf6", initialBalance: 0, balanceDate: "2026-01-01", createdAt: "" },
  { id: "a2", name: "Carteira", kind: "wallet", color: "#10b981", initialBalance: 0, balanceDate: "2026-01-01", createdAt: "" },
];

let n = 0;
const tx = (type: "income" | "expense", amount: number, accountId?: string, paymentMethod?: PaymentMethod): Transaction => ({
  id: `t${++n}`, type, amount, categoryId: "c", description: "", date: "2026-03-10T12:00:00.000Z", accountId, paymentMethod, createdAt: "",
});

const list = [
  tx("expense", 300, "a1", "pix"),
  tx("expense", 100, "a1", "debit"),
  tx("expense", 100, "a2", "cash"),
  tx("income", 1000, "a1", "transfer"),
  tx("expense", 100),
];

describe("breakdownByAccount", () => {
  const rows = breakdownByAccount(list, accounts);

  it("soma gastos e entradas por conta, do maior gasto para o menor", () => {
    expect(rows.map((r) => r.label)).toEqual(["Nubank", "Carteira", "Sem conta"]);
    expect(rows[0]).toMatchObject({ expense: 400, income: 1000, count: 3, color: "#8b5cf6" });
  });

  it("a participação é calculada sobre o total de gastos", () => {
    expect(rows[0]!.share).toBeCloseTo(400 / 600);
    expect(rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1);
  });

  it("conta desconhecida cai em Sem conta", () => {
    expect(breakdownByAccount([tx("expense", 10, "sumiu")], accounts)[0]!.label).toBe("Sem conta");
  });

  it("sem lançamentos não há linhas; sem gastos a participação é zero", () => {
    expect(breakdownByAccount([], accounts)).toEqual([]);
    expect(breakdownByAccount([tx("income", 50, "a1")], accounts)[0]!.share).toBe(0);
  });
});

describe("breakdownByMethod", () => {
  it("agrupa por forma de pagamento com rótulos em português", () => {
    const rows = breakdownByMethod(list);
    expect(rows.map((r) => r.label)).toEqual(["Pix", "Débito", "Dinheiro", "Sem forma informada", "Transferência"]);
    expect(rows[0]).toMatchObject({ expense: 300, share: 0.5 });
    expect(rows.find((r) => r.label === "Transferência")).toMatchObject({ income: 1000, expense: 0 });
  });
});
