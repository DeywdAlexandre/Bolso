import { describe, expect, it } from "vitest";

import { computeMonthComparison, oilStatusInfo, previousMonthKey } from "./vehicleSummary";
import type { Fueling, OilChange, VehicleExpense } from "./types";

const f = (date: string, odometer: number, liters: number, totalCost: number): Fueling => ({
  id: date + odometer,
  vehicleId: "v1",
  date,
  odometer,
  liters,
  pricePerLiter: totalCost / liters,
  totalCost,
  tankStatus: "full",
  createdAt: date,
});

describe("previousMonthKey", () => {
  it("volta um mês e vira o ano", () => {
    expect(previousMonthKey("2026-03")).toBe("2026-02");
    expect(previousMonthKey("2026-01")).toBe("2025-12");
  });
});

describe("computeMonthComparison", () => {
  const oil: OilChange = { id: "o", vehicleId: "v1", date: "2026-03-10", odometer: 1500, nextChangeKm: 6500, cost: 100, createdAt: "x" };
  const extra: VehicleExpense = { id: "e", vehicleId: "v1", date: "2026-03-12", description: "Lavagem", amount: 50, createdAt: "x" };
  const data = {
    fuelings: [f("2026-02-20", 1000, 40, 200), f("2026-03-05", 1400, 30, 150), f("2026-03-25", 1900, 40, 220)],
    oilChanges: [oil],
    expenses: [extra],
  };

  it("soma gastos, litros e km do mês e compara com o anterior", () => {
    const s = computeMonthComparison(data, "2026-03");
    expect(s.spent).toBe(150 + 220 + 100 + 50);
    expect(s.liters).toBe(70);
    expect(s.km).toBe(900);
    expect(s.fuelings).toBe(2);
    expect(s.previousSpent).toBe(200);
    expect(s.deltaPct).toBeCloseTo(160);
  });

  it("sem dados no mês anterior não há variação", () => {
    expect(computeMonthComparison(data, "2026-02").deltaPct).toBeNull();
  });

  it("mês sem abastecimento tem km zero", () => {
    expect(computeMonthComparison(data, "2026-04").km).toBe(0);
  });
});

describe("oilStatusInfo", () => {
  it("descreve cada estado", () => {
    expect(oilStatusInfo({ oilStatus: "unknown", kmRemainingOil: null }).tone).toBe("unknown");
    expect(oilStatusInfo({ oilStatus: "overdue", kmRemainingOil: -200 }).label).toContain("200");
    expect(oilStatusInfo({ oilStatus: "soon", kmRemainingOil: 300 }).tone).toBe("soon");
    expect(oilStatusInfo({ oilStatus: "ok", kmRemainingOil: 3000 }).label).toContain("3.000");
  });
});
