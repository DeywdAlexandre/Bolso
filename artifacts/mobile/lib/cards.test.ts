import { describe, expect, it } from "vitest";

import { addMonthsToDay, computeCardSummary, invoiceFor, planInstallments } from "./cards";
import type { Account, Transaction, Transfer } from "./types";

const card = (extra: Partial<Account> = {}): Account => ({
  id: "card", name: "Nubank Cartão", kind: "card", color: "#8b5cf6", initialBalance: 0, balanceDate: "2026-01-01",
  closingDay: 20, dueDay: 28, creditLimit: 5000, createdAt: "2026-01-01T00:00:00.000Z", ...extra,
});

let n = 0;
const buy = (amount: number, day: string, extra: Partial<Transaction> = {}): Transaction => ({
  id: `t${++n}`, type: "expense", amount, categoryId: "c", description: `compra ${n}`, date: `${day}T12:00:00.000Z`,
  accountId: "card", createdAt: "", ...extra,
});
const pay = (amount: number, day: string): Transfer => ({
  id: `p${++n}`, fromAccountId: "banco", toAccountId: "card", amount, date: `${day}T12:00:00.000Z`, createdAt: "",
});

describe("datas e fatura", () => {
  it("addMonthsToDay mantém o dia ou usa o último dia do mês", () => {
    expect(addMonthsToDay("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsToDay("2026-11-15", 3)).toBe("2027-02-15");
    expect(addMonthsToDay("2024-01-31", 1)).toBe("2024-02-29");
  });

  it("compra até o dia do fechamento cai na fatura do mês; depois, na do seguinte", () => {
    expect(invoiceFor(card(), "2026-03-20").key).toBe("2026-03");
    expect(invoiceFor(card(), "2026-03-21").key).toBe("2026-04");
    expect(invoiceFor(card(), "2026-12-25").key).toBe("2027-01");
  });

  it("vencimento: mesmo mês se o dia for maior que o fechamento, senão o mês seguinte", () => {
    expect(invoiceFor(card({ closingDay: 20, dueDay: 28 }), "2026-03-10").dueDate).toBe("2026-03-28");
    expect(invoiceFor(card({ closingDay: 25, dueDay: 5 }), "2026-03-10").dueDate).toBe("2026-04-05");
    expect(invoiceFor(card({ closingDay: 25, dueDay: 5 }), "2026-03-10").closingDate).toBe("2026-03-25");
  });

  it("fechamento no dia 31 usa o último dia dos meses curtos", () => {
    expect(invoiceFor(card({ closingDay: 31, dueDay: 10 }), "2026-02-15").closingDate).toBe("2026-02-28");
  });
});

describe("planInstallments", () => {
  it("divide em parcelas mensais e a soma é exatamente o total", () => {
    const plan = planInstallments(100, 3, "2026-03-10");
    expect(plan.map((p) => p.amount)).toEqual([33.33, 33.33, 33.34]);
    expect(plan.reduce((s, p) => s + p.amount, 0)).toBeCloseTo(100, 10);
    expect(plan.map((p) => p.date)).toEqual(["2026-03-10", "2026-04-10", "2026-05-10"]);
    expect(plan.map((p) => `${p.index}/${p.total}`)).toEqual(["1/3", "2/3", "3/3"]);
  });

  it("uma parcela é a compra à vista; parcelas inválidas viram 1", () => {
    expect(planInstallments(59.9, 1, "2026-03-10")).toEqual([{ index: 1, total: 1, amount: 59.9, date: "2026-03-10" }]);
    expect(planInstallments(10, 0, "2026-03-10")).toHaveLength(1);
  });

  it("compra no dia 31 mantém o último dia de cada mês", () => {
    expect(planInstallments(30, 3, "2026-01-31").map((p) => p.date)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });
});

describe("computeCardSummary", () => {
  // hoje = 2026-03-10: a fatura de março (fecha 20/03) está aberta
  const asOf = "2026-03-10";

  it("agrupa em faturas pelo fechamento e soma cada uma", () => {
    const s = computeCardSummary(card(), [buy(100, "2026-02-25"), buy(50, "2026-03-05"), buy(30, "2026-03-22")], [], asOf);
    expect(s.invoices.map((i) => [i.key, i.total])).toEqual([["2026-03", 150], ["2026-04", 30]]);
    expect(s.current!.key).toBe("2026-03");
    expect(s.current!.status).toBe("open");
    expect(s.futureTotal).toBe(30);
    expect(s.debt).toBe(180);
  });

  it("estorno reduz a fatura", () => {
    const refund = buy(40, "2026-03-06", { type: "income" });
    const s = computeCardSummary(card(), [buy(100, "2026-03-05"), refund], [], asOf);
    expect(s.invoices[0]!.total).toBe(60);
  });

  it("pagamentos (transferências para o cartão) quitam as faturas mais antigas primeiro", () => {
    const txs = [buy(200, "2026-01-10"), buy(300, "2026-02-10"), buy(50, "2026-03-05")];
    const s = computeCardSummary(card(), txs, [pay(200, "2026-02-25")], "2026-03-10");
    const byKey = Object.fromEntries(s.invoices.map((i) => [i.key, i]));
    expect(byKey["2026-01"]).toMatchObject({ status: "paid", remaining: 0 });
    expect(byKey["2026-02"]).toMatchObject({ remaining: 300, status: "overdue" });
    expect(byKey["2026-03"]).toMatchObject({ status: "open", remaining: 50 });
    expect(s.debt).toBe(350);
    expect(s.overdueOrClosed).toBe(300);
  });

  it("fatura fechada e ainda no prazo fica 'closed'; pagamento parcial abate", () => {
    const s = computeCardSummary(card(), [buy(500, "2026-02-10")], [pay(100, "2026-02-22")], "2026-02-25");
    expect(s.invoices[0]).toMatchObject({ key: "2026-02", status: "closed", paid: 100, remaining: 400 });
  });

  it("dívida que já existia ao cadastrar o cartão entra na fatura mais antiga", () => {
    const s = computeCardSummary(card({ initialBalance: -800, balanceDate: "2026-03-01" }), [buy(50, "2026-03-05")], [], asOf);
    expect(s.debt).toBe(850);
    expect(s.invoices[0]!.remaining).toBe(850);
    // compras anteriores à data do cadastro já estão na dívida informada
    const ignored = computeCardSummary(card({ initialBalance: -800, balanceDate: "2026-03-01" }), [buy(999, "2026-02-10")], [], asOf);
    expect(ignored.debt).toBe(800);
  });

  it("parcelas faltantes por compra: só as que estão em faturas ainda não fechadas", () => {
    const plan = planInstallments(1200, 12, "2026-01-15");
    const txs = plan.map((p) =>
      buy(p.amount, p.date, { description: `Notebook (${p.index}/${p.total})`, installmentGroupId: "g1", installmentIndex: p.index, installmentTotal: p.total }),
    );
    const s = computeCardSummary(card(), txs, [], "2026-03-10");
    // fechadas: jan e fev (2 parcelas); faltam 10 (março em diante)
    expect(s.groups).toHaveLength(1);
    expect(s.groups[0]).toMatchObject({ description: "Notebook", remaining: 10, remainingAmount: 1000, total: 12, installmentAmount: 100 });
    expect(s.debt).toBe(1200);
    expect(s.futureTotal).toBe(900); // depois da fatura atual (março)
  });

  it("limite usado e disponível", () => {
    const s = computeCardSummary(card({ creditLimit: 1000 }), [buy(300, "2026-03-05")], [], asOf);
    expect(s).toMatchObject({ limitUsed: 300, limitAvailable: 700 });
    expect(computeCardSummary(card({ creditLimit: undefined }), [], [], asOf).limitAvailable).toBeNull();
  });

  it("sem movimento: sem faturas e dívida zero", () => {
    const s = computeCardSummary(card(), [], [], asOf);
    expect(s).toMatchObject({ debt: 0, invoices: [], current: null, futureTotal: 0 });
  });
});
