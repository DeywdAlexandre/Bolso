import type { Goal, GoalDeposit } from "../../types";

export function buildGoalHandlers(deps: {
  goals: Goal[];
  goalDeposits: GoalDeposit[];
  addGoalDeposit: (d: Omit<GoalDeposit, "id" | "createdAt" | "type"> & { createTransaction?: boolean }) => Promise<GoalDeposit>;
}) {
  return {
    async listGoals() {
      const list = deps.goals.map((g) => {
        const deposits = deps.goalDeposits.filter((d) => d.goalId === g.id);
        const saved = deposits.reduce((s, d) => s + d.amount, 0);
        return {
          id: g.id,
          name: g.name,
          targetAmount: g.targetAmount,
          savedAmount: saved,
          progress: g.targetAmount ? (saved / g.targetAmount) * 100 : null,
        };
      });
      return { goals: list };
    },

    async addGoalDeposit(args: { goalTitle: string; amount: number }) {
      const goal = deps.goals.find((g) =>
        g.name.toLowerCase().includes(args.goalTitle.toLowerCase())
      );
      if (!goal) return { ok: false, error: "Meta não encontrada." };

      const deposit = await deps.addGoalDeposit({
        goalId: goal.id,
        amount: args.amount,
        date: new Date().toISOString(),
      });
      return { ok: true, goal: { name: goal.name }, deposit };
    },
  };
}
