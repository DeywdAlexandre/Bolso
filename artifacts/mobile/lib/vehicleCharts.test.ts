import { describe, expect, it } from "vitest";

import { consumptionSeries, costBreakdown, monthTotals, priceSeries, shortDate } from "./vehicleCharts";
import type { FuelSegment } from "./fuelSegments";
import type { Fueling } from "./types";

const fu = (date: string, odometer: number, pricePerLiter: number, totalCost = 100): Fueling => ({
  id: date,
  vehicleId: "v",
  date,
  odometer,
  liters: 10,
  pricePerLiter,
  totalCost,
  tankStatus: "full",
  createdAt: date,
});

describe("vehicleCharts", () => {
  it("shortDate formata dd/mm", () => {
    expect(shortDate("2026-03-25")).toBe("25/03");
  });

  it("consumptionSeries mantém só os últimos pontos em ordem", () => {
    const seg = (n: number) => ({ endDate: `2026-01-0${n}`, kmPerLiter: n * 10 }) as FuelSegment;
    const out = consumptionSeries([seg(1), seg(2), seg(3)], 2);
    expect(out).toEqual([
      { label: "02/01", value: 20 },
      { label: "03/01", value: 30 },
    ]);
  });

  it("priceSeries ordena por data", () => {
    const out = priceSeries([fu("2026-02-01", 2, 6), fu("2026-01-01", 1, 5)]);
    expect(out.map((p) => p.value)).toEqual([5, 6]);
  });

  it("costBreakdown soma por categoria", () => {
    const b = costBreakdown({
      fuelings: [fu("2026-01-01", 1, 5, 200)],
      oilChanges: [{ id: "o", vehicleId: "v", date: "2026-01-02", odometer: 1, nextChangeKm: 2, cost: 80, createdAt: "x" }],
      expenses: [{ id: "e", vehicleId: "v", date: "2026-01-03", description: "d", amount: 20, createdAt: "x" }],
    });
    expect(b).toEqual({ fuel: 200, oil: 80, extras: 20, total: 300 });
  });

  it("monthTotals agrupa por mês, mais recente primeiro", () => {
    const out = monthTotals([
      { date: "2026-01-05", amount: 10 },
      { date: "2026-02-01", amount: 5 },
      { date: "2026-01-20", amount: 15 },
    ]);
    expect(out).toEqual([
      { key: "2026-02", total: 5 },
      { key: "2026-01", total: 25 },
    ]);
  });
});
