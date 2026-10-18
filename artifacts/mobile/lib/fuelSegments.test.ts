import { describe, expect, it } from "vitest";

import { computeFuelSegments, computeOpenSegment } from "./fuelSegments";
import { computeVehicleStats } from "./vehicleStats";
import type { Fueling, TankStatus, Vehicle } from "./types";

const vehicle: Vehicle = { id: "v1", name: "Carro", fuelType: "gasolina", createdAt: "2026-01-01T00:00:00.000Z" };

let seq = 0;
/** Abastecimento: odômetro, litros, status do tanque (preço fixo de R$ 5/L). */
function f(odometer: number, liters: number, tankStatus: TankStatus, extra: Partial<Fueling> = {}): Fueling {
  seq++;
  return {
    id: `f${seq}`,
    vehicleId: "v1",
    date: `2026-01-${String((seq % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
    odometer,
    liters,
    pricePerLiter: 5,
    totalCost: liters * 5,
    tankStatus,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

describe("Reserva → Reserva", () => {
  it("dois abastecimentos em reserva: usa os litros da reserva inicial, não os da final", () => {
    const [seg, ...rest] = computeFuelSegments([f(1000, 40, "reserve"), f(1400, 30, "reserve")]);
    expect(rest).toHaveLength(0);
    expect(seg!.method).toBe("reserve");
    expect(seg!.km).toBe(400);
    expect(seg!.liters).toBe(40); // os 30 L da reserva final só contam no próximo trecho
    expect(seg!.kmPerLiter).toBeCloseTo(10);
  });

  it("parcial entre duas reservas é somado ao trecho", () => {
    const [seg] = computeFuelSegments([f(1000, 40, "reserve"), f(1200, 10, "partial"), f(1500, 35, "reserve")]);
    expect(seg!.km).toBe(500);
    expect(seg!.liters).toBe(50);
    expect(seg!.kmPerLiter).toBeCloseTo(10);
  });

  it("abastecimento cheio entre duas reservas também conta para o trecho", () => {
    const [seg] = computeFuelSegments([f(1000, 40, "reserve"), f(1300, 45, "full"), f(1600, 30, "reserve")]);
    expect(seg!.liters).toBe(85);
    expect(seg!.kmPerLiter).toBeCloseTo(600 / 85);
  });

  it("a reserva final vira o início do próximo trecho (encadeia sem perder litros)", () => {
    const segs = computeFuelSegments([
      f(1000, 40, "reserve"),
      f(1200, 10, "partial"),
      f(1500, 50, "reserve"),
      f(1700, 5, "partial"),
      f(1800, 5, "partial"),
      f(2100, 40, "reserve"),
    ]);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({ km: 500, liters: 50 });
    expect(segs[1]).toMatchObject({ km: 600, liters: 60 }); // 50 (reserva) + 5 + 5
  });

  it("parcial depois da última reserva só entra quando a próxima reserva chegar", () => {
    const segs = computeFuelSegments([f(1000, 40, "reserve"), f(1400, 30, "reserve"), f(1500, 10, "partial")]);
    expect(segs).toHaveLength(1);
    expect(segs[0]!.liters).toBe(40);
  });

  it("parcial antes da primeira reserva é ignorado", () => {
    const [seg] = computeFuelSegments([f(900, 10, "partial"), f(1000, 40, "reserve"), f(1400, 30, "reserve")]);
    expect(seg!.liters).toBe(40);
  });

  it("uma única reserva (ou só parciais) não gera consumo", () => {
    expect(computeFuelSegments([f(1000, 40, "reserve")])).toHaveLength(0);
    expect(computeFuelSegments([f(1000, 40, "reserve"), f(1200, 10, "partial")])).toHaveLength(0);
    expect(computeFuelSegments([f(1000, 10, "partial"), f(1200, 10, "partial")])).toHaveLength(0);
  });
});

describe("Cheio → Cheio", () => {
  it("usa os litros do cheio final e dos parciais, sem os do cheio inicial", () => {
    const [seg] = computeFuelSegments([f(1000, 40, "full"), f(1200, 10, "partial"), f(1400, 30, "full")]);
    expect(seg!.method).toBe("full");
    expect(seg!.liters).toBe(40);
    expect(seg!.kmPerLiter).toBeCloseTo(10);
  });

  it("reserva entre dois cheios conta como litros do trecho", () => {
    const [seg] = computeFuelSegments([f(1000, 40, "full"), f(1200, 10, "reserve"), f(1400, 30, "full")]);
    expect(seg!.liters).toBe(40);
  });
});

describe("Cheio e Reserva juntos", () => {
  it("trechos que não se sobrepõem são todos usados", () => {
    const segs = computeFuelSegments([
      f(1000, 40, "reserve"),
      f(1400, 35, "reserve"), // reserva→reserva: 1000..1400
      f(1500, 45, "full"),
      f(1900, 40, "full"), // cheio→cheio: 1500..1900
    ]);
    expect(segs.map((s) => s.method)).toEqual(["reserve", "full"]);
    expect(segs.reduce((s, g) => s + g.km, 0)).toBe(800);
  });

  it("não conta o mesmo trecho duas vezes: fica o que mede mais km", () => {
    const segs = computeFuelSegments([
      f(1000, 40, "full"),
      f(1100, 10, "reserve"),
      f(1300, 10, "reserve"),
      f(1400, 30, "full"),
    ]);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toMatchObject({ method: "full", km: 400, liters: 50 });
  });

  it("com vários cheios e uma reserva isolada, a reserva não atrapalha", () => {
    const segs = computeFuelSegments([
      f(1000, 40, "full"),
      f(1300, 20, "reserve"),
      f(1600, 40, "full"),
      f(2200, 50, "full"),
    ]);
    expect(segs).toHaveLength(2);
    expect(segs.every((s) => s.method === "full")).toBe(true);
    expect(segs.reduce((s, g) => s + g.km, 0)).toBe(1200);
  });
});

describe("Robustez dos dados", () => {
  it("aceita lançamentos fora de ordem", () => {
    const [seg] = computeFuelSegments([f(1400, 30, "reserve"), f(1000, 40, "reserve")]);
    expect(seg).toMatchObject({ km: 400, liters: 40 });
  });

  it("mesmo odômetro (digitação duplicada) não gera trecho com km zero", () => {
    expect(computeFuelSegments([f(1000, 40, "reserve"), f(1000, 30, "reserve")])).toHaveLength(0);
  });

  it("ignora trecho sem litros", () => {
    expect(computeFuelSegments([f(1000, 0, "reserve"), f(1400, 30, "reserve")])).toHaveLength(0);
  });

  it("calcula o custo do trecho a partir dos abastecimentos que entraram nele", () => {
    const [seg] = computeFuelSegments([f(1000, 40, "reserve"), f(1200, 10, "partial"), f(1500, 35, "reserve")]);
    expect(seg!.cost).toBe(250); // (40 + 10) L × R$ 5
  });
});

describe("computeVehicleStats com reserva", () => {
  it("média, último trecho, km medidos e custo por km", () => {
    const s = computeVehicleStats(
      vehicle,
      [
        f(1000, 40, "reserve"),
        f(1200, 10, "partial"),
        f(1500, 50, "reserve"), // 500 km / 50 L = 10
        f(2100, 40, "reserve"), // 600 km / 50 L = 12
      ],
      [],
      [],
    );
    expect(s.segments).toHaveLength(2);
    expect(s.totalKm).toBe(1100);
    expect(s.totalLitersInSegments).toBe(100);
    expect(s.avgKmPerLiter).toBeCloseTo(11);
    expect(s.recentKmPerLiter).toBeCloseTo(12);
    expect(s.avgCostPerKm).toBeCloseTo(500 / 1100);
  });

  it("só considera os abastecimentos do veículo", () => {
    const other = f(1000, 99, "reserve", { vehicleId: "v2" });
    const s = computeVehicleStats(vehicle, [other, f(1000, 40, "reserve"), f(1400, 30, "reserve")], [], []);
    expect(s.totalLitersInSegments).toBe(40);
  });
});

describe("Trecho em andamento", () => {
  it("sem Cheio nem Reserva não há trecho aberto", () => {
    expect(computeOpenSegment([])).toBeNull();
    expect(computeOpenSegment([f(1000, 10, "partial")])).toBeNull();
  });

  it("parte da última Reserva, contando os litros dela e o que veio depois", () => {
    const open = computeOpenSegment([
      f(1000, 40, "reserve"),
      f(1400, 30, "reserve"),
      f(1600, 12, "partial"),
    ]);
    expect(open).toMatchObject({ method: "reserve", startOdometer: 1400, kmSoFar: 200, litersSoFar: 42 });
  });

  it("parte do último Cheio sem contar os litros dele", () => {
    const open = computeOpenSegment([f(1000, 40, "full"), f(1200, 10, "partial")]);
    expect(open).toMatchObject({ method: "full", startOdometer: 1000, kmSoFar: 200, litersSoFar: 10 });
  });

  it("logo após o ponto de medição ainda não rodou nada", () => {
    expect(computeOpenSegment([f(1000, 40, "full")])).toMatchObject({ kmSoFar: 0, litersSoFar: 0 });
  });

  it("aparece em computeVehicleStats junto com os trechos medidos e as datas", () => {
    const s = computeVehicleStats(
      vehicle,
      [f(1000, 40, "reserve"), f(1400, 30, "reserve"), f(1500, 10, "partial")],
      [],
      [],
    );
    expect(s.segments[0]).toMatchObject({ startOdometer: 1000, endOdometer: 1400 });
    expect(s.segments[0]!.startDate).toBeTruthy();
    expect(s.openSegment).toMatchObject({ method: "reserve", kmSoFar: 100, litersSoFar: 40 });
  });
});
