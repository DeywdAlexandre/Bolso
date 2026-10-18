import { describe, expect, it } from "vitest";

import { buildVehicleStatsPayload } from "./vehiclePayload";
import { computeVehicleStats } from "../vehicleStats";
import { buildVehicleHandlers } from "./handlers/vehicle";
import { AI_TOOLS } from "./toolDefinitions";
import type { Fueling, TankStatus, Vehicle } from "../types";

const vehicle: Vehicle = { id: "v1", name: "Onix", fuelType: "flex", createdAt: "2026-01-01T00:00:00.000Z" };

let n = 0;
const f = (day: string, odometer: number, liters: number, tankStatus: TankStatus): Fueling => ({
  id: `f${++n}`, vehicleId: "v1", date: `2026-${day}T12:00:00.000Z`, odometer, liters,
  pricePerLiter: 6, totalCost: liters * 6, tankStatus, createdAt: "2026-01-01T00:00:00.000Z",
});

const fuelings = [
  f("01-05", 10000, 38, "reserve"),
  f("01-12", 10180, 12, "partial"),
  f("01-20", 10420, 36, "reserve"), // 420 km / 50 L = 8,4
  f("02-02", 10800, 40, "reserve"), // 380 km / 36 L = 10,56
  f("02-10", 11050, 45, "full"),
  f("02-25", 11500, 33, "full"), // 450 km / 33 L = 13,64
  f("03-05", 11700, 10, "partial"),
];

describe("buildVehicleStatsPayload", () => {
  const payload = buildVehicleStatsPayload(vehicle, computeVehicleStats(vehicle, fuelings, [], []));

  it("lista os trechos do mais recente ao mais antigo com km/L, litros e datas", () => {
    expect(payload.measuredSegments).toBe(3);
    expect(payload.segments.map((s) => s.kmPerLiter)).toEqual([13.64, 10.56, 8.4]);
    expect(payload.segments[0]).toMatchObject({
      method: "Cheio→Cheio", from: "10/02/2026", to: "25/02/2026", km: 450, liters: 33, odometerFrom: 11050, odometerTo: 11500,
    });
    expect(payload.segments[2]).toMatchObject({ method: "Reserva→Reserva", liters: 50, costPerKm: 0.71 });
  });

  it("identifica o melhor e o pior trecho", () => {
    expect(payload.bestSegment!.kmPerLiter).toBe(13.64);
    expect(payload.worstSegment!.kmPerLiter).toBe(8.4);
  });

  it("informa o trecho em andamento sem inventar km/L", () => {
    expect(payload.openSegment).toMatchObject({
      method: "Cheio→Cheio", since: "25/02/2026", kmSoFar: 200, litersSoFar: 10,
      closesAt: "próximo abastecimento Cheio",
    });
    expect(payload.openSegment).not.toHaveProperty("kmPerLiter");
  });

  it("respeita o limite de trechos devolvidos", () => {
    const limited = buildVehicleStatsPayload(vehicle, computeVehicleStats(vehicle, fuelings, [], []), 2);
    expect(limited.segments).toHaveLength(2);
    expect(limited.measuredSegments).toBe(3);
  });

  it("sem trechos medidos explica o que falta", () => {
    const empty = buildVehicleStatsPayload(vehicle, computeVehicleStats(vehicle, [f("01-05", 10000, 38, "reserve")], [], []));
    expect(empty.segments).toEqual([]);
    expect(empty.bestSegment).toBeNull();
    expect(empty.note).toMatch(/dois abastecimentos/);
    expect(empty.openSegment).toMatchObject({ method: "Reserva→Reserva", kmSoFar: 0, litersSoFar: 38 });
  });
});

describe("ferramenta get_vehicle_stats", () => {
  const handlers = buildVehicleHandlers({
    vehicles: [{ ...vehicle, plate: "ABC1D23" }],
    fuelings,
    oilChanges: [],
    vehicleExpenses: [],
    addFueling: async () => { throw new Error("não usado"); },
    addOilChange: async () => { throw new Error("não usado"); },
    addVehicleExpense: async () => { throw new Error("não usado"); },
  });

  it("encontra o veículo por nome ou placa e devolve os trechos", async () => {
    const byName = await handlers.getVehicleStats({ vehicleName: "onix" });
    const byPlate = await handlers.getVehicleStats({ vehicleName: "abc1d23", limit: 1 });
    expect(byName.stats!.segments).toHaveLength(3);
    expect(byPlate.stats!.segments).toHaveLength(1);
  });

  it("avisa quando o veículo não existe", async () => {
    expect(await handlers.getVehicleStats({ vehicleName: "moto" })).toMatchObject({ stats: null, error: "Veículo não encontrado." });
  });

  it("a definição da ferramenta aceita o limite de trechos", () => {
    const def = AI_TOOLS.find((t) => t.function.name === "get_vehicle_stats")!;
    expect(Object.keys((def.function.parameters as { properties: object }).properties)).toEqual(["vehicleName", "limit"]);
    expect(def.function.description).toMatch(/trechos/);
  });
});
