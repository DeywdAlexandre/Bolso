import { formatDate } from "../format";
import type { FuelSegment, OpenSegment } from "../fuelSegments";
import type { Vehicle } from "../types";
import { formatKm, formatKmPerLiter, type VehicleStats } from "../vehicleStats";

const DEFAULT_SEGMENT_LIMIT = 10;
const METHOD_LABEL = { full: "Cheio→Cheio", reserve: "Reserva→Reserva" } as const;

const round = (n: number, digits = 2) => Number(n.toFixed(digits));

function describeSegment(seg: FuelSegment) {
  return {
    method: METHOD_LABEL[seg.method],
    from: formatDate(seg.startDate),
    to: formatDate(seg.endDate),
    odometerFrom: seg.startOdometer,
    odometerTo: seg.endOdometer,
    km: round(seg.km, 1),
    liters: round(seg.liters),
    kmPerLiter: round(seg.kmPerLiter),
    costPerKm: round(seg.cost / seg.km),
    totalCost: round(seg.cost),
  };
}

function describeOpenSegment(open: OpenSegment) {
  return {
    method: METHOD_LABEL[open.method],
    since: formatDate(open.startDate),
    kmSoFar: round(open.kmSoFar, 1),
    litersSoFar: round(open.litersSoFar),
    closesAt: open.method === "full" ? "próximo abastecimento Cheio" : "próximo abastecimento em Reserva",
  };
}

/**
 * Resumo do veículo para o Finn. `segments` vem do mais recente ao mais antigo; `openSegment` é o
 * trecho ainda sem ponto final (não tem km/L: só fecha no próximo Cheio/Reserva).
 */
export function buildVehicleStatsPayload(vehicle: Vehicle, stats: VehicleStats, limit?: number) {
  const max = Math.max(1, Math.floor(limit ?? DEFAULT_SEGMENT_LIMIT));
  const ordered = [...stats.segments].reverse();
  const byConsumption = [...stats.segments].sort((a, b) => a.kmPerLiter - b.kmPerLiter);

  return {
    vehicleName: vehicle.name,
    avgKmL: stats.avgKmPerLiter ? formatKmPerLiter(stats.avgKmPerLiter) + " km/L" : "N/A",
    lastOdometer: stats.lastOdometer ? formatKm(stats.lastOdometer) + " km" : "N/A",
    oilStatus: stats.oilStatus,
    kmRemainingOil: stats.kmRemainingOil ? formatKm(stats.kmRemainingOil) + " km" : "N/A",
    avgCostPerKm: stats.avgCostPerKm ? "R$ " + stats.avgCostPerKm.toFixed(2) + " / km" : "N/A",
    measuredSegments: stats.segments.length,
    segments: ordered.slice(0, max).map(describeSegment),
    bestSegment: byConsumption.length ? describeSegment(byConsumption[byConsumption.length - 1]!) : null,
    worstSegment: byConsumption.length ? describeSegment(byConsumption[0]!) : null,
    openSegment: stats.openSegment ? describeOpenSegment(stats.openSegment) : null,
    note:
      stats.segments.length === 0
        ? "Ainda não há trechos medidos: são necessários dois abastecimentos Cheio ou dois em Reserva."
        : undefined,
  };
}
