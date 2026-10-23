import type { Fueling, OilChange, VehicleExpense } from "./types";
import type { VehicleStats } from "./vehicleStats";

export type MonthSummary = {
  spent: number;
  liters: number;
  km: number;
  fuelings: number;
};

export type MonthComparison = MonthSummary & {
  /** Gasto do mês anterior, para comparar. */
  previousSpent: number;
  /** Variação percentual do gasto; null se o mês anterior não teve gastos. */
  deltaPct: number | null;
};

type Data = {
  fuelings: Fueling[];
  oilChanges: OilChange[];
  expenses: VehicleExpense[];
};

/** "2026-03" → "2026-02" (e dezembro do ano anterior em janeiro). */
export function previousMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

function spentInMonth(data: Data, key: string): number {
  const inMonth = (d: string) => d.slice(0, 7) === key;
  return (
    data.fuelings.filter((f) => inMonth(f.date)).reduce((s, f) => s + f.totalCost, 0) +
    data.oilChanges.filter((o) => inMonth(o.date)).reduce((s, o) => s + (o.cost || 0), 0) +
    data.expenses.filter((e) => inMonth(e.date)).reduce((s, e) => s + e.amount, 0)
  );
}

/**
 * Resumo do mês (YYYY-MM) somando os veículos recebidos em `data`.
 * Km rodados = maior odômetro do mês menos o último odômetro anterior ao mês
 * (ou o menor do mês, se não houver registro antes).
 */
export function computeMonthComparison(data: Data, monthKey: string): MonthComparison {
  const inMonth = data.fuelings.filter((f) => f.date.slice(0, 7) === monthKey);
  const before = data.fuelings.filter((f) => f.date.slice(0, 7) < monthKey);
  let km = 0;
  if (inMonth.length > 0) {
    const top = Math.max(...inMonth.map((f) => f.odometer));
    const base = before.length > 0 ? Math.max(...before.map((f) => f.odometer)) : Math.min(...inMonth.map((f) => f.odometer));
    km = Math.max(top - base, 0);
  }
  const spent = spentInMonth(data, monthKey);
  const previousSpent = spentInMonth(data, previousMonthKey(monthKey));
  return {
    spent,
    liters: inMonth.reduce((s, f) => s + f.liters, 0),
    km,
    fuelings: inMonth.length,
    previousSpent,
    deltaPct: previousSpent > 0 ? ((spent - previousSpent) / previousSpent) * 100 : null,
  };
}

export type OilStatusInfo = {
  label: string;
  tone: "ok" | "soon" | "overdue" | "unknown";
};

/** Texto curto do estado da troca de óleo, para faixas e chips. */
export function oilStatusInfo(stats: Pick<VehicleStats, "oilStatus" | "kmRemainingOil">): OilStatusInfo {
  const km = stats.kmRemainingOil;
  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n);
  switch (stats.oilStatus) {
    case "overdue":
      return { label: `Óleo atrasado ${fmt(Math.abs(km ?? 0))} km`, tone: "overdue" };
    case "soon":
      return { label: `Trocar óleo em ${fmt(km ?? 0)} km`, tone: "soon" };
    case "ok":
      return { label: `Óleo em dia · faltam ${fmt(km ?? 0)} km`, tone: "ok" };
    default:
      return { label: "Troca de óleo não registrada", tone: "unknown" };
  }
}
