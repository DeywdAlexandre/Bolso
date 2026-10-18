import { genId } from "./format";
import { roundMoney } from "./money";
import type { Goal, GoalDeposit } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const MONTH_DAYS = 30;

/**
 * Calcula os rendimentos mensais pendentes das metas com rendimento ativo.
 * Gera um depósito do tipo "yield" para cada ciclo de 30 dias completo desde o
 * último rendimento (juros compostos), mesmo que o app tenha ficado dias sem abrir.
 */
export function computeGoalYields(
  goals: Goal[],
  now: Date,
): { goals: Goal[]; deposits: GoalDeposit[] } {
  const deposits: GoalDeposit[] = [];

  const updated = goals.map((g) => {
    if (!g.isYielding || g.currentAmount <= 0) return g;

    const last = g.lastInterestAccrual ? new Date(g.lastInterestAccrual) : new Date(g.createdAt);
    const cycles = Math.floor((now.getTime() - last.getTime()) / DAY_MS / MONTH_DAYS);
    if (!(cycles >= 1)) return g;

    let amount = g.currentAmount;
    for (let i = 1; i <= cycles; i++) {
      const yieldAmount = roundMoney(amount * (g.estimatedYield / 100));
      amount = roundMoney(amount + yieldAmount);
      const at = new Date(last.getTime() + i * MONTH_DAYS * DAY_MS).toISOString();
      deposits.push({
        id: "gd_" + genId(),
        goalId: g.id,
        amount: yieldAmount,
        type: "yield",
        date: at,
        createdAt: at,
        updatedAt: at,
      });
    }

    const accruedUntil = new Date(last.getTime() + cycles * MONTH_DAYS * DAY_MS).toISOString();
    return { ...g, currentAmount: amount, lastInterestAccrual: accruedUntil, updatedAt: now.toISOString() };
  });

  return { goals: updated, deposits };
}
