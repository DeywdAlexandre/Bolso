export function buildGoalHandlers(deps: {
  goals: any[];
  goalDeposits: any[];
  addGoalDeposit: (d: any) => Promise<any>;
}) {
  return {
    async listGoals() {
      const list = deps.goals.map((g) => {
        const deposits = deps.goalDeposits.filter((d) => d.goalId === g.id);
        const saved = deposits.reduce((s, d) => s + d.amount, 0);
        return {
          id: g.id,
          title: g.title,
          targetAmount: g.targetAmount,
          savedAmount: saved,
          progress: (saved / g.targetAmount) * 100,
        };
      });
      return { goals: list };
    },

    async addGoalDeposit(args: { goalTitle: string; amount: number }) {
      const goal = deps.goals.find((g) =>
        g.title.toLowerCase().includes(args.goalTitle.toLowerCase())
      );
      if (!goal) return { ok: false, error: "Meta não encontrada." };

      const deposit = await deps.addGoalDeposit({
        goalId: goal.id,
        amount: args.amount,
        date: new Date().toISOString(),
        description: "Depósito via IA",
      });
      return { ok: true, goal: { title: goal.title }, deposit };
    },
  };
}
