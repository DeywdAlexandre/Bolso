import { describe, expect, it } from "vitest";

import { computeGoalYields } from "./goalYield";
import type { Goal } from "./types";

const base: Goal = {
  id: "g1", name: "Reserva", type: "target", currentAmount: 1000, isYielding: true,
  estimatedYield: 1, icon: "star", color: "#10b981", createdAt: "2026-01-01T00:00:00.000Z",
} as Goal;

const day = (iso: string) => new Date(iso + "T00:00:00.000Z");

describe("computeGoalYields", () => {
  it("não rende antes de 30 dias", () => {
    const r = computeGoalYields([base], day("2026-01-20"));
    expect(r.deposits).toHaveLength(0);
    expect(r.goals[0]).toBe(base);
  });

  it("rende 1% após 30 dias", () => {
    const r = computeGoalYields([base], day("2026-02-01"));
    expect(r.deposits).toHaveLength(1);
    expect(r.deposits[0]!.amount).toBe(10);
    expect(r.deposits[0]!.type).toBe("yield");
    expect(r.goals[0]!.currentAmount).toBe(1010);
  });

  it("acumula vários ciclos com juros compostos quando o app ficou sem abrir", () => {
    const r = computeGoalYields([base], day("2026-04-05")); // 94 dias = 3 ciclos
    expect(r.deposits).toHaveLength(3);
    expect(r.goals[0]!.currentAmount).toBe(1030.3);
  });

  it("não rende sem saldo ou com rendimento desligado", () => {
    const r = computeGoalYields(
      [{ ...base, currentAmount: 0 }, { ...base, id: "g2", isYielding: false }],
      day("2027-01-01"),
    );
    expect(r.deposits).toHaveLength(0);
  });

  it("não reaplica no mesmo ciclo", () => {
    const first = computeGoalYields([base], day("2026-02-01"));
    const second = computeGoalYields(first.goals, day("2026-02-10"));
    expect(second.deposits).toHaveLength(0);
  });
});
