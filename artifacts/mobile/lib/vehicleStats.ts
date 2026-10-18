import { computeFuelSegments, computeOpenSegment, sortFuelings, type FuelSegment, type OpenSegment } from "./fuelSegments";
import type { Fueling, OilChange, Vehicle, VehicleExpense } from "./types";

export type VehicleStats = {
  hasFuelings: boolean;
  hasComputedKmL: boolean;
  avgKmPerLiter: number | null;
  recentKmPerLiter: number | null;
  avgCostPerKm: number | null;
  totalKm: number;
  totalLitersInSegments: number;
  totalCostInSegments: number;
  totalSpentAllTime: number;
  totalLitersAllTime: number;
  totalExtraExpenses: number;
  lastFueling: Fueling | null;
  lastOilChange: OilChange | null;
  lastOdometer: number | null;
  nextOilChangeAt: number | null;
  kmRemainingOil: number | null;
  oilStatus: "ok" | "soon" | "overdue" | "unknown";
  /** Trechos usados no cálculo do consumo, em ordem cronológica. */
  segments: FuelSegment[];
  /** Trecho em andamento (ainda sem ponto final), se houver. */
  openSegment: OpenSegment | null;
};

const SOON_THRESHOLD_KM = 500;

export function computeVehicleStats(
  vehicle: Vehicle,
  allFuelings: Fueling[],
  allOilChanges: OilChange[],
  allExtraExpenses: VehicleExpense[],
): VehicleStats {
  const fuelings = sortFuelings(allFuelings.filter((f) => f.vehicleId === vehicle.id));

  const oilChanges = [...allOilChanges]
    .filter((o) => o.vehicleId === vehicle.id)
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.odometer - b.odometer;
    });

  const extraExpenses = allExtraExpenses.filter((e) => e.vehicleId === vehicle.id);

  const lastFueling = fuelings.length ? fuelings[fuelings.length - 1]! : null;
  const lastOilChange = oilChanges.length
    ? oilChanges[oilChanges.length - 1]!
    : null;

  const totalSpentFuel = fuelings.reduce((s, f) => s + f.totalCost, 0);
  const totalSpentOil = oilChanges.reduce((s, o) => s + (o.cost || 0), 0);
  const totalExtraExpenses = extraExpenses.reduce((s, e) => s + e.amount, 0);
  
  const totalSpentAllTime = totalSpentFuel + totalSpentOil + totalExtraExpenses;
  const totalLitersAllTime = fuelings.reduce((s, f) => s + f.liters, 0);

  // Trechos medidos (Cheio→Cheio e Reserva→Reserva), sem sobreposição. Ver lib/fuelSegments.ts
  const segments = computeFuelSegments(fuelings);
  const totalKm = segments.reduce((s, g) => s + g.km, 0);
  const totalLitersInSegments = segments.reduce((s, g) => s + g.liters, 0);
  const totalCostInSegments = segments.reduce((s, g) => s + g.cost, 0);

  const hasComputedKmL = totalLitersInSegments > 0;
  const avgKmPerLiter = hasComputedKmL ? totalKm / totalLitersInSegments : null;
  const avgCostPerKm = totalKm > 0 ? totalCostInSegments / totalKm : null;
  const recentSegment = segments[segments.length - 1] ?? null;
  const recentKmPerLiter = recentSegment ? recentSegment.kmPerLiter : null;

  const odometers: number[] = [];
  for (const f of fuelings) odometers.push(f.odometer);
  for (const o of oilChanges) odometers.push(o.odometer);
  if (vehicle.initialOdometer != null) odometers.push(vehicle.initialOdometer);
  const lastOdometer = odometers.length ? Math.max(...odometers) : null;

  const nextOilChangeAt = lastOilChange ? lastOilChange.nextChangeKm : null;
  const kmRemainingOil =
    nextOilChangeAt != null && lastOdometer != null
      ? nextOilChangeAt - lastOdometer
      : null;

  let oilStatus: VehicleStats["oilStatus"] = "unknown";
  if (kmRemainingOil != null) {
    if (kmRemainingOil <= 0) oilStatus = "overdue";
    else if (kmRemainingOil <= SOON_THRESHOLD_KM) oilStatus = "soon";
    else oilStatus = "ok";
  }

  return {
    hasFuelings: fuelings.length > 0,
    hasComputedKmL,
    avgKmPerLiter,
    recentKmPerLiter,
    avgCostPerKm,
    totalKm,
    totalLitersInSegments,
    totalCostInSegments,
    totalSpentAllTime,
    totalExtraExpenses,
    totalLitersAllTime,
    lastFueling,
    lastOilChange,
    lastOdometer,
    nextOilChangeAt,
    kmRemainingOil,
    oilStatus,
    segments,
    openSegment: computeOpenSegment(fuelings),
  };
}

export const FUEL_TYPE_LABELS: Record<string, string> = {
  gasolina: "Gasolina",
  etanol: "Etanol",
  diesel: "Diesel",
  gnv: "GNV",
  flex: "Flex",
};

export function formatKm(km: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(km);
}

export function formatKmPerLiter(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(v);
}

export function formatLiters(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(v);
}
