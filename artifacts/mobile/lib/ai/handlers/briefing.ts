import type { Shift, Recurring, Loan, Goal } from "../../types";

export function buildBriefingHandlers(deps: {
  shifts: Shift[];
  recurring: Recurring[];
  loans: Loan[];
  goals: Goal[];
}) {
  return {
    get_morning_briefing: async () => {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
      const currentDay = now.getDate();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // 1. Escalas do dia de hoje
      const todayShifts = deps.shifts.filter(s => s.date === todayStr);

      // 2. Contas recorrentes vencendo hoje ou atrasadas
      const accountsVencendoHoje: Recurring[] = [];
      const accountsAtrasadas: Recurring[] = [];

      deps.recurring.forEach(rec => {
        if (!rec.active) return;

        const isAppliedThisMonth = rec.lastApplied && 
          new Date(rec.lastApplied).getMonth() === currentMonth &&
          new Date(rec.lastApplied).getFullYear() === currentYear;

        if (!isAppliedThisMonth) {
          if (rec.dayOfMonth === currentDay) {
            accountsVencendoHoje.push(rec);
          } else if (rec.dayOfMonth < currentDay) {
            accountsAtrasadas.push(rec);
          }
        }
      });

      // 3. Empréstimos ativos e com saldo pendente
      const activeLoans = deps.loans.filter(l => l.status === "active" || l.status === undefined);

      // 4. Metas de economia
      const goalsSummary = deps.goals.map(g => ({
        name: g.name,
        target: g.targetAmount,
        current: g.currentAmount,
        percent: g.targetAmount ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0,
      }));

      return {
        success: true,
        date: todayStr,
        briefing: {
          shiftsToday: todayShifts.map(s => ({
            name: s.name,
            type: s.type === "ordinary" ? "Ordinário" : "Extra",
            time: `${s.startTime} - ${s.endTime}`,
            value: s.value,
          })),
          bills: {
            vencendoHoje: accountsVencendoHoje.map(b => ({
              description: b.description,
              amount: b.amount,
              type: b.type === "income" ? "Recebimento" : "Pagamento",
            })),
            atrasadas: accountsAtrasadas.map(b => ({
              description: b.description,
              amount: b.amount,
              dayOfMonth: b.dayOfMonth,
              type: b.type === "income" ? "Recebimento" : "Pagamento",
            })),
          },
          loans: activeLoans.map(l => ({
            description: l.description,
            amount: l.principalAmount,
            type: l.direction === "lend" ? "Emprestado para alguém" : "Devendo para alguém",
          })),
          goals: goalsSummary,
        },
      };
    },
  };
}
