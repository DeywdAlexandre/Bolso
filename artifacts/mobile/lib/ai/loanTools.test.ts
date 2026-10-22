import { describe, expect, it, vi } from "vitest";

vi.mock("../reports", () => ({ generateLoanReport: async () => {} }));

import { computeBalances, resolveCashAccount } from "../accounts";
import type { Account, Loan, LoanPayment, Transaction } from "../types";
import { buildLoanHandlers } from "./handlers/loan";

const account = (id: string, name: string, kind: Account["kind"] = "bank", initialBalance = 0): Account => ({
  id, name, kind, color: "#000", initialBalance, balanceDate: "2020-01-01", createdAt: "2020-01-01",
});

const loan: Loan = {
  id: "l1", contactId: "c1", direction: "lend", type: "monthly_interest", description: "Reforma do João",
  principalAmount: 1000, interestRate: 10, startDate: "2026-09-01", status: "active", createdAt: "2026-09-01",
};

const accounts = [account("nu", "Nubank", "bank", 100), account("cx", "Carteira", "wallet"), account("cc", "Visa", "card")];

function setup(over: { defaultAccountId?: string } = {}) {
  const txs: Transaction[] = [];
  const payments: LoanPayment[] = [];
  const handlers = buildLoanHandlers({
    loanContacts: [],
    loans: [loan],
    loanPayments: [],
    addLoanContact: async () => { throw new Error("n/a"); },
    addLoan: async () => { throw new Error("n/a"); },
    addLoanPayment: async (p) => { const lp = { ...p, id: "lp" + payments.length, createdAt: "x" }; payments.push(lp); return lp; },
    addTransactionRaw: async (t) => { txs.push(t); },
    accounts,
    defaultAccountId: over.defaultAccountId,
  });
  return { handlers, txs, payments };
}

describe("resolveCashAccount", () => {
  it("acha a conta pelo nome e ignora acento e caixa", () => {
    expect(resolveCashAccount(accounts, "nubank").accountId).toBe("nu");
  });
  it("sem nome usa a padrão; sem padrão, nenhuma", () => {
    expect(resolveCashAccount(accounts, undefined, "cx").accountId).toBe("cx");
    expect(resolveCashAccount(accounts, undefined).accountId).toBeUndefined();
  });
  it("cartão de crédito não é aceito, nem por nome nem como padrão", () => {
    expect(resolveCashAccount(accounts, "Visa").error).toMatch(/não encontrada/);
    expect(resolveCashAccount(accounts, undefined, "cc").accountId).toBeUndefined();
  });
});

describe("add_loan_payment com conta", () => {
  it("o recebimento entra como receita na conta escolhida e aumenta o saldo dela", async () => {
    const { handlers, txs } = setup();
    const res = await handlers.addLoanPayment({ loanDescription: "reforma", amount: 300, account: "Nubank", paymentMethod: "pix" });
    expect(res).toMatchObject({ ok: true, account: "Nubank" });
    expect(txs[0]).toMatchObject({ type: "income", amount: 300, accountId: "nu", paymentMethod: "pix" });
    expect(txs[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const balances = computeBalances(accounts, txs, []);
    expect(balances.accounts.find((a) => a.account.id === "nu")?.balance).toBe(400);
  });

  it("sem conta informada usa a padrão", async () => {
    const { handlers, txs } = setup({ defaultAccountId: "cx" });
    await handlers.addLoanPayment({ loanDescription: "reforma", amount: 50 });
    expect(txs[0].accountId).toBe("cx");
  });

  it("conta inexistente ou cartão: erro claro e nada é gravado", async () => {
    const { handlers, txs, payments } = setup();
    const res = await handlers.addLoanPayment({ loanDescription: "reforma", amount: 50, account: "Visa" });
    expect(res).toMatchObject({ ok: false });
    expect(txs).toHaveLength(0);
    expect(payments).toHaveLength(0);
  });

  it("forma de pagamento inválida é recusada", async () => {
    const { handlers, txs } = setup();
    const res = await handlers.addLoanPayment({ loanDescription: "reforma", amount: 50, account: "Nubank", paymentMethod: "cheque" });
    expect(res).toMatchObject({ ok: false });
    expect(txs).toHaveLength(0);
  });
});
