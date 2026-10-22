import { describe, expect, it } from "vitest";

import { addMonthsClamped, dueLabel, dueSoon, nextDue } from "./loanDue";
import type { Loan, LoanPayment } from "./types";

const loan = (over: Partial<Loan> = {}): Loan => ({
  id: "l1", contactId: "c", direction: "lend", type: "monthly_interest", description: "x",
  principalAmount: 1000, interestRate: 10, startDate: "2026-08-10", status: "active", createdAt: "2026-08-10", ...over,
});
const pay = (over: Partial<LoanPayment>): LoanPayment => ({
  id: "p", loanId: "l1", amount: 0, interestPaid: 0, principalPaid: 0, date: "2026-09-10", isMainExtratEntry: false, createdAt: "x", ...over,
});
const day = (iso: string) => new Date(iso + "T15:00:00");

describe("addMonthsClamped", () => {
  it("mantém o dia e usa o último dia em meses curtos", () => {
    expect(addMonthsClamped(new Date(2026, 0, 31), 1).getDate()).toBe(28);
    expect(addMonthsClamped(new Date(2026, 0, 31), 2).getDate()).toBe(31);
    expect(addMonthsClamped(new Date(2026, 10, 15), 3).getMonth()).toBe(1);
  });
});

describe("juros mensais", () => {
  it("R$ 1.000 a 10% vence R$ 100 de juros, nunca o principal", () => {
    const d = nextDue(loan(), [], day("2026-09-05"))!;
    expect(d.amount).toBe(100);
    expect(d.dueDate).toBe("2026-09-10");
    expect(d.status).toBe("upcoming");
    expect(d.daysUntil).toBe(5);
  });

  it("vence hoje não é atraso; amanhã é atraso de 1 dia", () => {
    expect(nextDue(loan(), [], day("2026-09-10"))!.status).toBe("today");
    const late = nextDue(loan(), [], day("2026-09-11"))!;
    expect(late.status).toBe("overdue");
    expect(late.daysOverdue).toBe(1);
    expect(dueLabel(late)).toBe("Vencido ontem");
  });

  it("vários meses sem pagar somam os juros de cada mês", () => {
    const d = nextDue(loan(), [], day("2026-11-20"))!; // 10/09, 10/10, 10/11 vencidos
    expect(d.overdueCount).toBe(3);
    expect(d.amount).toBe(300);
    expect(d.dueDate).toBe("2026-09-10");
    expect(d.daysOverdue).toBe(71);
  });

  it("pagamento com juros fecha o mês e o próximo vencimento mantém o dia do contrato", () => {
    const p = pay({ amount: 100, interestPaid: 100, date: "2026-09-14" }); // pago com atraso
    const d = nextDue(loan(), [p], day("2026-09-20"))!;
    expect(d.dueDate).toBe("2026-10-10");
    expect(d.status).toBe("upcoming");
  });

  it("amortizar principal reduz o juro devido", () => {
    const p = pay({ amount: 600, interestPaid: 100, principalPaid: 500 });
    expect(nextDue(loan(), [p], day("2026-09-20"))!.amount).toBe(50);
  });

  it("principal quitado ou empréstimo encerrado: nada vence", () => {
    const p = pay({ amount: 1100, interestPaid: 100, principalPaid: 1000 });
    expect(nextDue(loan(), [p], day("2026-09-20"))).toBeNull();
    expect(nextDue(loan({ status: "completed" }), [], day("2026-09-20"))).toBeNull();
  });
});

describe("parcelas fixas", () => {
  const fixed = loan({ type: "fixed_installments", installmentsCount: 4, principalAmount: 1000, interestRate: 20 }); // 4 x 300

  it("vence o valor da parcela, não o principal", () => {
    const d = nextDue(fixed, [], day("2026-09-01"))!;
    expect(d.amount).toBe(300);
    expect(d.dueDate).toBe("2026-09-10");
  });

  it("parcelas pagas avançam o vencimento", () => {
    const p = pay({ amount: 600, interestPaid: 200, principalPaid: 400 });
    expect(nextDue(fixed, [p], day("2026-09-20"))!.dueDate).toBe("2026-11-10");
  });

  it("atrasadas somam as parcelas vencidas, limitado ao total", () => {
    const d = nextDue(fixed, [], day("2026-10-20"))!;
    expect(d.overdueCount).toBe(2);
    expect(d.amount).toBe(600);
    const all = nextDue(fixed, [], day("2027-06-01"))!;
    expect(all.overdueCount).toBe(4);
    expect(all.amount).toBe(1200);
  });

  it("tudo pago: nada vence", () => {
    expect(nextDue(fixed, [pay({ amount: 1200 })], day("2026-09-20"))).toBeNull();
  });

  it("arredondamento de centavos não perde uma parcela paga", () => {
    const thirds = loan({ type: "fixed_installments", installmentsCount: 3, principalAmount: 100, interestRate: 0 }); // 33,33
    const p = pay({ amount: 66.66 });
    expect(nextDue(thirds, [p], day("2026-09-20"))!.dueDate).toBe("2026-11-10");
  });
});

describe("dueSoon", () => {
  it("traz vencidos e os próximos 7 dias, do mais atrasado ao mais distante", () => {
    const loans = [
      loan({ id: "a", startDate: "2026-08-12" }), // vence 12/09 (em 2 dias)
      loan({ id: "b", startDate: "2026-08-01" }), // venceu 01/09
      loan({ id: "c", startDate: "2026-08-30" }), // vence 30/09 (longe)
      loan({ id: "d", startDate: "2026-08-17" }), // vence 17/09 (em 7 dias)
      loan({ id: "e", startDate: "2026-08-18" }), // vence 18/09 (em 8 dias: fora)
    ];
    const list = dueSoon(loans, [], day("2026-09-10"));
    expect(list.map((d) => d.loanId)).toEqual(["b", "a", "d"]);
  });
});
