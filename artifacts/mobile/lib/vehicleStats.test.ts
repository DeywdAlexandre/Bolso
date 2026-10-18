import { describe, expect, it } from "vitest";

import { computeVehicleStats } from "./vehicleStats";
import type { Fueling, OilChange, Vehicle } from "./types";

const vehicle: Vehicle = { id: "v1", name: "Carro", fuelType: "gasolina", createdAt: "2026-01-01T00:00:00.000Z" };

let n = 0;
function fueling(p: Partial<Fueling> & Pick<Fueling, "date" | "odometer" | "liters" | "tankStatus">): Fueling {
  n++;
  return { id: `f${n}`, vehicleId: "v1", pricePerLiter: 5, totalCost: p.liters * 5, createdAt: p.date, ...p };
}

describe("computeVehicleStats", () => {
  it("sem abastecimentos não calcula consumo", () => {
    const s = computeVehicleStats(vehicle, [], [], []);
    expect(s.hasFuelings).toBe(false);
    expect(s.avgKmPerLiter).toBeNull();
    expect(s.oilStatus).toBe("unknown");
  });

  it("calcula km/l entre tanques cheios somando abastecimentos parciais", () => {
    const f = [
      fueling({ date: "2026-01-01", odometer: 1000, liters: 40, tankStatus: "full" }),
      fueling({ date: "2026-01-05", odometer: 1200, liters: 10, tankStatus: "partial" }),
      fueling({ date: "2026-01-10", odometer: 1400, liters: 30, tankStatus: "full" }),
    ];
    const s = computeVehicleStats(vehicle, f, [], []);
    // 400 km rodados, 10 + 30 litros (a âncora inicial não conta)
    expect(s.totalKm).toBe(400);
    expect(s.totalLitersInSegments).toBe(40);
    expect(s.avgKmPerLiter).toBeCloseTo(10);
    expect(s.avgCostPerKm).toBeCloseTo(0.5);
  });

  it("ordena por data e odômetro mesmo com lançamentos fora de ordem", () => {
    const f = [
      fueling({ date: "2026-01-10", odometer: 1400, liters: 30, tankStatus: "full" }),
      fueling({ date: "2026-01-01", odometer: 1000, liters: 40, tankStatus: "full" }),
    ];
    expect(computeVehicleStats(vehicle, f, [], []).avgKmPerLiter).toBeCloseTo(400 / 30);
  });

  it("usa reserva→reserva quando há menos de dois tanques cheios", () => {
    const f = [
      fueling({ date: "2026-01-01", odometer: 1000, liters: 20, tankStatus: "reserve" }),
      fueling({ date: "2026-01-10", odometer: 1200, liters: 20, tankStatus: "reserve" }),
    ];
    const s = computeVehicleStats(vehicle, f, [], []);
    expect(s.avgKmPerLiter).toBeCloseTo(10);
  });

  it("ignora segmentos com odômetro que não avança", () => {
    const f = [
      fueling({ date: "2026-01-01", odometer: 1000, liters: 40, tankStatus: "full" }),
      fueling({ date: "2026-01-02", odometer: 1000, liters: 40, tankStatus: "full" }),
    ];
    expect(computeVehicleStats(vehicle, f, [], []).hasComputedKmL).toBe(false);
  });

  it("classifica o status da troca de óleo", () => {
    const oil = (nextChangeKm: number): OilChange => ({
      id: "o1", vehicleId: "v1", date: "2026-01-01", odometer: 1000, nextChangeKm, createdAt: "2026-01-01",
    });
    const f = [fueling({ date: "2026-01-02", odometer: 5000, liters: 10, tankStatus: "full" })];
    expect(computeVehicleStats(vehicle, f, [oil(9000)], []).oilStatus).toBe("ok");
    expect(computeVehicleStats(vehicle, f, [oil(5300)], []).oilStatus).toBe("soon");
    expect(computeVehicleStats(vehicle, f, [oil(4900)], []).oilStatus).toBe("overdue");
  });
});
