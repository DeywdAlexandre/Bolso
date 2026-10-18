import { genId } from "./format";
import type { Recurring, Transaction } from "./types";

/**
 * Monta a transação do mês corrente para uma recorrência, ou null se ela já foi
 * aplicada neste mês. Dias maiores que o mês (ex.: 31 em fevereiro) caem no último dia.
 */
export function buildRecurringTransaction(
  r: Recurring,
  now: Date,
): { tx: Transaction; appliedAt: string } | null {
  const month = now.getMonth();
  const year = now.getFullYear();

  if (r.lastApplied) {
    const last = new Date(r.lastApplied);
    if (last.getMonth() === month && last.getFullYear() === year) return null;
  }

  const targetDay = Math.min(r.dayOfMonth, new Date(year, month + 1, 0).getDate());
  const targetDate = new Date(year, month, targetDay, 12, 0, 0);
  const nowIso = now.toISOString();

  return {
    appliedAt: targetDate.toISOString(),
    tx: {
      id: genId(),
      type: r.type,
      amount: r.amount,
      categoryId: r.categoryId,
      description: r.description,
      date: targetDate.toISOString(),
      recurringId: r.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  };
}
