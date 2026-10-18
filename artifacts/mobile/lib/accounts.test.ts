import { describe, expect, it } from "vitest";

import { accountBalance, computeBalances, initialBalanceFor, parsePaymentMethod, paymentMethodLabel, preselectedAccountId, validateTransfer } from "./accounts";
import type { Account, Transaction } from "./types";

const acc = (id: string, initialBalance: number, balanceDate = "2026-03-01", extra: Partial<Account> = {}): Account => ({
  id, name: id, kind: "bank", color: "#000", initialBalance, balanceDate, createdAt: "2026-03-01T00:00:00.000Z", ...extra,
});

let n = 0;
const tx = (type: "income" | "expense", amount: number, day: string, accountId?: string): Transaction => ({
  id: `t${++n}`, type, amount, categoryId: "c", description: "", date: `${day}T12:00:00.000Z`, accountId, createdAt: "2026-03-01T00:00:00.000Z",
});

describe("sem contas (comportamento de sempre)", () => {
  it("total é o saldo acumulado de todos os lançamentos", () => {
    const s = computeBalances([], [tx("income", 1000, "2026-01-10"), tx("expense", 250, "2026-02-01")]);
    expect(s).toMatchObject({ hasAccounts: false, total: 750, unassigned: 0 });
  });
});

describe("saldo por conta", () => {
  it("saldo inicial + entradas − gastos da conta a partir da data do saldo", () => {
    const a = acc("nubank", 1200);
    const t = [tx("expense", 50, "2026-03-05", "nubank"), tx("income", 300, "2026-03-10", "nubank")];
    expect(accountBalance(a, t)).toBe(1450);
  });

  it("lançamento anterior à data do saldo não altera a conta (já estava embutido)", () => {
    const a = acc("nubank", 1200, "2026-03-01");
    expect(accountBalance(a, [tx("expense", 500, "2026-02-20", "nubank")])).toBe(1200);
  });

  it("não mistura lançamentos de outras contas", () => {
    const t = [tx("expense", 50, "2026-03-05", "itau")];
    expect(accountBalance(acc("nubank", 1200), t)).toBe(1200);
  });

  it("evita resíduos de ponto flutuante", () => {
    const a = acc("c", 0);
    expect(accountBalance(a, [tx("income", 0.1, "2026-03-02", "c"), tx("income", 0.2, "2026-03-02", "c")])).toBe(0.3);
  });
});

describe("total com contas e \"Sem conta\"", () => {
  const accounts = [acc("nubank", 1200), acc("carteira", 80, "2026-03-01", { kind: "wallet" })];

  it("soma as contas e ignora lançamentos antigos sem conta (histórico)", () => {
    const old = tx("income", 5000, "2026-01-15"); // antes das contas
    const s = computeBalances(accounts, [old]);
    expect(s.unassigned).toBe(0);
    expect(s.total).toBe(1280);
  });

  it("lançamento novo sem conta entra em \"Sem conta\" e no total", () => {
    const s = computeBalances(accounts, [tx("expense", 30, "2026-03-04"), tx("expense", 20, "2026-03-04", "carteira")]);
    expect(s.unassigned).toBe(-30);
    expect(s.accounts.find((b) => b.account.id === "carteira")!.balance).toBe(60);
    expect(s.total).toBe(1200 + 60 - 30);
  });

  it("conta desconhecida (ex.: restauração de backup) cai em \"Sem conta\"", () => {
    expect(computeBalances(accounts, [tx("expense", 10, "2026-03-04", "sumiu")]).unassigned).toBe(-10);
  });

  it("conta arquivada sai da lista e do total, e seus lançamentos não viram \"Sem conta\"", () => {
    const archived = acc("velha", 999, "2026-03-01", { archived: true });
    const s = computeBalances([...accounts, archived], [tx("expense", 10, "2026-03-04", "velha")]);
    expect(s.accounts).toHaveLength(2);
    expect(s.unassigned).toBe(0);
    expect(s.total).toBe(1280);
  });

  it("se todas as contas forem arquivadas volta ao saldo acumulado de sempre", () => {
    const s = computeBalances([acc("a", 10, "2026-03-01", { archived: true })], [tx("income", 100, "2026-03-02")]);
    expect(s).toMatchObject({ hasAccounts: false, total: 100 });
  });
});

describe("corrigir saldo", () => {
  it("initialBalanceFor faz a conta mostrar exatamente o valor informado", () => {
    const a = acc("nubank", 1200);
    const t = [tx("expense", 50, "2026-03-05", "nubank")];
    const initial = initialBalanceFor(a, t, 2000);
    expect(accountBalance({ ...a, initialBalance: initial }, t)).toBe(2000);
  });
});

describe("pré-seleção e rótulos", () => {
  const accounts = [acc("a", 0), acc("b", 0, "2026-03-01", { archived: true })];

  it("usa a última conta, senão a padrão, e ignora arquivadas", () => {
    expect(preselectedAccountId(accounts, "a", undefined)).toBe("a");
    expect(preselectedAccountId(accounts, "b", "a")).toBe("a");
    expect(preselectedAccountId(accounts, undefined, undefined)).toBeUndefined();
    expect(preselectedAccountId(accounts, "x", "y")).toBeUndefined();
  });

  it("rótulos de forma de pagamento", () => {
    expect(paymentMethodLabel("pix")).toBe("Pix");
    expect(paymentMethodLabel(undefined)).toBeNull();
  });
});

describe("cartão de crédito no saldo", () => {
  const card = acc("cartao", 0, "2026-03-01", { kind: "card", closingDay: 20, dueDay: 28 });
  const accounts = [acc("banco", 1000), card];

  it("compra no cartão não reduz o dinheiro total; vira dívida na conta do cartão", () => {
    const s = computeBalances(accounts, [tx("expense", 300, "2026-03-05", "cartao")]);
    expect(s.total).toBe(1000);
    expect(s.accounts.map((b) => b.account.id)).toEqual(["banco"]);
    expect(s.cards.map((b) => [b.account.id, b.balance])).toEqual([["cartao", -300]]);
  });

  it("pagar a fatura (transferência banco → cartão) tira dinheiro do total e quita a dívida", () => {
    const tr = { id: "p", fromAccountId: "banco", toAccountId: "cartao", amount: 300, date: "2026-03-25T12:00:00.000Z", createdAt: "" };
    const s = computeBalances(accounts, [tx("expense", 300, "2026-03-05", "cartao")], [tr]);
    expect(s.total).toBe(700);
    expect(s.cards[0]!.balance).toBe(0);
  });

  it("'Crédito' é uma forma de pagamento reconhecida", () => {
    expect(paymentMethodLabel("credit")).toBe("Crédito");
    expect(parsePaymentMethod("Crédito")).toBe("credit");
  });
});

describe("transferências entre contas", () => {
  const accounts = [acc("banco", 1000), acc("carteira", 50, "2026-03-01", { kind: "wallet" })];
  const transfer = (amount: number, day: string, from = "banco", to = "carteira") => ({
    id: `tr${++n}`, fromAccountId: from, toAccountId: to, amount, date: `${day}T12:00:00.000Z`, createdAt: "",
  });

  it("tira da origem e põe no destino sem mudar o total", () => {
    const s = computeBalances(accounts, [], [transfer(200, "2026-03-05")]);
    expect(s.accounts.map((b) => b.balance)).toEqual([800, 250]);
    expect(s.total).toBe(1050);
    expect(s.unassigned).toBe(0);
  });

  it("não vira gasto nem entrada: lançamentos continuam separados", () => {
    const s = computeBalances(accounts, [tx("expense", 30, "2026-03-06", "carteira")], [transfer(200, "2026-03-05")]);
    expect(s.accounts.map((b) => b.balance)).toEqual([800, 220]);
    expect(s.total).toBe(1020);
  });

  it("transferência anterior à data do saldo já está embutida e não conta", () => {
    expect(accountBalance(accounts[1]!, [], [transfer(200, "2026-02-20")])).toBe(50);
  });

  it("para uma conta arquivada o dinheiro sai do total", () => {
    const withArchived = [...accounts, acc("velha", 0, "2026-03-01", { archived: true })];
    const s = computeBalances(withArchived, [], [transfer(100, "2026-03-05", "banco", "velha")]);
    expect(s.total).toBe(950);
  });

  it("initialBalanceFor considera as transferências ao corrigir o saldo", () => {
    const trs = [transfer(200, "2026-03-05")];
    const initial = initialBalanceFor(accounts[0]!, [], 500, trs);
    expect(accountBalance({ ...accounts[0]!, initialBalance: initial }, [], trs)).toBe(500);
  });

  it("validateTransfer barra valor inválido, contas iguais, arquivadas ou inexistentes", () => {
    const list = [...accounts, acc("velha", 0, "2026-03-01", { archived: true })];
    const ok = { fromAccountId: "banco", toAccountId: "carteira", amount: 10 };
    expect(validateTransfer(list, ok)).toBeNull();
    expect(validateTransfer(list, { ...ok, amount: 0 })).toMatch(/valor/);
    expect(validateTransfer(list, { ...ok, toAccountId: "banco" })).toMatch(/diferentes/);
    expect(validateTransfer(list, { ...ok, toAccountId: "velha" })).toMatch(/destino/);
    expect(validateTransfer(list, { ...ok, fromAccountId: "nada" })).toMatch(/origem/);
  });
});
