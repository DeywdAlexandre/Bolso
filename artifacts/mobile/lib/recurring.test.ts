import { describe, expect, it } from "vitest";

import { buildRecurringTransaction } from "./recurring";
import type { Recurring } from "./types";

const rec: Recurring = {
  id: "r1", type: "expense", amount: 50, categoryId: "cat_x", description: "Streaming",
  dayOfMonth: 31, active: true, createdAt: "2026-01-01T00:00:00.000Z",
} as unknown as Recurring;

describe("buildRecurringTransaction", () => {
  it("limita o dia ao último dia do mês (31 em fevereiro)", () => {
    const r = buildRecurringTransaction(rec, new Date(2026, 1, 10, 10));
    expect(new Date(r!.tx.date).getDate()).toBe(28);
    expect(r!.tx.recurringId).toBe("r1");
  });

  it("não aplica duas vezes no mesmo mês", () => {
    const first = buildRecurringTransaction(rec, new Date(2026, 2, 5, 10))!;
    const again = buildRecurringTransaction({ ...rec, lastApplied: first.appliedAt }, new Date(2026, 2, 20, 10));
    expect(again).toBeNull();
  });

  it("aplica novamente no mês seguinte", () => {
    const again = buildRecurringTransaction({ ...rec, lastApplied: new Date(2026, 2, 31, 12).toISOString() }, new Date(2026, 3, 2, 10));
    expect(again).not.toBeNull();
  });
});
