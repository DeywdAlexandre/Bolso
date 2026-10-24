import type { FuelSegment } from "./fuelSegments";
import type { Fueling, OilChange, VehicleExpense } from "./types";

export type SeriesPoint = { label: string; value: number };

/** "2026-03-25" → "25/03". */
export function shortDate(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** km/L de cada trecho medido, do mais antigo ao mais recente (últimos `limit`). */
export function consumptionSeries(segments: FuelSegment[], limit = 8): SeriesPoint[] {
  return segments.slice(-limit).map((s) => ({ label: shortDate(s.endDate), value: s.kmPerLiter }));
}

/** Preço do litro em cada abastecimento, em ordem cronológica (últimos `limit`). */
export function priceSeries(fuelings: Fueling[], limit = 8): SeriesPoint[] {
  return [...fuelings]
    .sort((a, b) => a.date.localeCompare(b.date) || a.odometer - b.odometer)
    .slice(-limit)
    .map((f) => ({ label: shortDate(f.date), value: f.pricePerLiter }));
}

export type CostBreakdown = { fuel: number; oil: number; extras: number; total: number };

/** Gasto total por categoria: combustível, óleo e gastos extras. */
export function costBreakdown(data: {
  fuelings: Fueling[];
  oilChanges: OilChange[];
  expenses: VehicleExpense[];
}): CostBreakdown {
  const fuel = data.fuelings.reduce((s, f) => s + f.totalCost, 0);
  const oil = data.oilChanges.reduce((s, o) => s + (o.cost || 0), 0);
  const extras = data.expenses.reduce((s, e) => s + e.amount, 0);
  return { fuel, oil, extras, total: fuel + oil + extras };
}

export type MonthTotal = { key: string; total: number };

/** Soma por mês (YYYY-MM) dos itens com data e valor, do mês mais recente ao mais antigo. */
export function monthTotals(items: { date: string; amount: number }[]): MonthTotal[] {
  const map = new Map<string, number>();
  for (const i of items) {
    const key = i.date.slice(0, 7);
    map.set(key, (map.get(key) ?? 0) + i.amount);
  }
  return [...map.entries()].map(([key, total]) => ({ key, total })).sort((a, b) => b.key.localeCompare(a.key));
}
