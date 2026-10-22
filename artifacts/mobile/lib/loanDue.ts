import { localDayStart, toIsoDay } from "./format";
import type { Loan, LoanPayment } from "./types";

export type LoanDueStatus = "overdue" | "today" | "upcoming";

export type LoanDue = {
  loanId: string;
  direction: Loan["direction"];
  /** Vencimento mais antigo ainda em aberto (YYYY-MM-DD). */
  dueDate: string;
  /** O que vence: só juros (ou a parcela). Nunca o principal. Soma todos os períodos já vencidos. */
  amount: number;
  /** Quantos períodos (meses/parcelas) estão em aberto e já venceram; 0 se ainda não venceu. */
  overdueCount: number;
  /** Dias de atraso do vencimento mais antigo (0 se não venceu). */
  daysOverdue: number;
  /** Dias até o vencimento (0 se hoje, negativo se vencido). */
  daysUntil: number;
  status: LoanDueStatus;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Soma meses mantendo o dia do contrato; em meses curtos usa o último dia (31/01 + 1 mês = 28/02). */
export function addMonthsClamped(start: Date, months: number): Date {
  const target = new Date(start.getFullYear(), start.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(start.getDate(), lastDay));
  return target;
}

const DAY_MS = 86_400_000;
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY_MS);

/**
 * Próximo vencimento de um empréstimo ativo, ou null se nada mais vence.
 * - Juros mensais: um vencimento por mês a partir de 1 mês após o início; cada pagamento que quitou
 *   juros fecha um período. O valor é o juro sobre o principal que ainda resta.
 * - Parcelas fixas: parcela k vence k meses após o início; parcelas pagas = total pago ÷ valor da parcela.
 */
export function nextDue(loan: Loan, payments: LoanPayment[], today: Date): LoanDue | null {
  if (loan.status !== "active") return null;
  const start = localDayStart(loan.startDate);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const mine = payments.filter((p) => p.loanId === loan.id);

  let periodsPaid: number;
  let periodAmount: number;
  let maxPeriods: number;

  if (loan.type === "fixed_installments") {
    const count = loan.installmentsCount || 1;
    const installment = (loan.principalAmount * (1 + loan.interestRate / 100)) / count;
    const paidTotal = mine.reduce((s, p) => s + p.amount, 0);
    periodsPaid = Math.floor((paidTotal + 0.01) / (installment || 1));
    periodAmount = installment;
    maxPeriods = count;
  } else {
    const paidPrincipal = mine.reduce((s, p) => s + p.principalPaid, 0);
    const remaining = loan.principalAmount - paidPrincipal;
    if (remaining <= 0.005) return null;
    periodsPaid = mine.filter((p) => p.interestPaid > 0).length;
    periodAmount = (remaining * loan.interestRate) / 100;
    maxPeriods = Infinity;
  }

  if (periodsPaid >= maxPeriods || periodAmount <= 0) return null;

  const firstDue = addMonthsClamped(start, periodsPaid + 1);
  // Períodos em aberto cujo vencimento já passou (hoje ainda não conta como atrasado).
  let overdueCount = 0;
  while (periodsPaid + overdueCount < maxPeriods && addMonthsClamped(start, periodsPaid + overdueCount + 1) < todayStart) {
    overdueCount++;
  }

  const daysUntil = daysBetween(todayStart, firstDue);
  const status: LoanDueStatus = daysUntil < 0 ? "overdue" : daysUntil === 0 ? "today" : "upcoming";
  return {
    loanId: loan.id,
    direction: loan.direction,
    dueDate: toIsoDay(firstDue),
    amount: round2(periodAmount * Math.max(overdueCount, 1)),
    overdueCount,
    daysOverdue: Math.max(0, -daysUntil),
    daysUntil,
    status,
  };
}

/** Vencidos, de hoje e dos próximos `windowDays` dias, do mais atrasado ao mais distante. */
export function dueSoon(loans: Loan[], payments: LoanPayment[], today: Date, windowDays = 7): LoanDue[] {
  return loans
    .map((l) => nextDue(l, payments, today))
    .filter((d): d is LoanDue => d !== null && d.daysUntil <= windowDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

/** "Vencido há 3 dias", "Vence hoje", "Vence amanhã", "Vence em 5 dias". */
export function dueLabel(d: Pick<LoanDue, "status" | "daysOverdue" | "daysUntil">): string {
  if (d.status === "overdue") return d.daysOverdue === 1 ? "Vencido ontem" : `Vencido há ${d.daysOverdue} dias`;
  if (d.status === "today") return "Vence hoje";
  return d.daysUntil === 1 ? "Vence amanhã" : `Vence em ${d.daysUntil} dias`;
}
