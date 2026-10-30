import { describe, expect, it } from "vitest";

import {
  categoryBreakdown,
  donutSlices,
  inPeriod,
  monthlySeries,
  periodInsights,
  previousPeriod,
  shiftPeriod,
  topTransactions,
  totalsOf,
} from "./spendingAnalysis";
import type { Category, Transaction } from "./types";

const cats: Category[] = [
  { id: "food", name: "Alimentação", icon: "x", color: "#f00", type: "expense" },
  { id: "bills", name: "Contas", icon: "x", color: "#0f0", type: "expense" },
  { id: "salary", name: "Salário", icon: "x", color: "#00f", type: "income" },
];

let n = 0;
const tx = (type: "income" | "expense", amount: number, categoryId: string, date: string): Transaction => ({
  id: `t${++n}`,
  type,
  amount,
  categoryId,
  description: "d",
  date,
  createdAt: date,
});

const data: Transaction[] = [
  tx("income", 5000, "salary", "2026-03-05"),
  tx("expense", 300, "food", "2026-03-10"),
  tx("expense", 100, "food", "2026-03-10T15:00:00.000Z"),
  tx("expense", 600, "bills", "2026-03-20"),
  tx("expense", 50, "gone", "2026-03-21"),
  tx("expense", 200, "food", "2026-02-10"),
  tx("expense", 400, "bills", "2026-02-12"),
];

describe("períodos", () => {
  it("filtra por mês e por ano", () => {
    expect(inPeriod(data, { mode: "month", month: 2, year: 2026 })).toHaveLength(5);
    expect(inPeriod(data, { mode: "month", month: 1, year: 2026 })).toHaveLength(2);
    expect(inPeriod(data, { mode: "year", month: 0, year: 2026 })).toHaveLength(7);
  });

  it("anterior e avanço viram o ano", () => {
    expect(previousPeriod({ mode: "month", month: 0, year: 2026 })).toEqual({ mode: "month", month: 11, year: 2025 });
    expect(previousPeriod({ mode: "year", month: 0, year: 2026 }).year).toBe(2025);
    expect(shiftPeriod({ mode: "month", month: 11, year: 2025 }, 1)).toEqual({ mode: "month", month: 0, year: 2026 });
    expect(shiftPeriod({ mode: "month", month: 0, year: 2026 }, -1)).toEqual({ mode: "month", month: 11, year: 2025 });
  });
});

describe("categoryBreakdown", () => {
  const march = inPeriod(data, { mode: "month", month: 2, year: 2026 });
  const feb = inPeriod(data, { mode: "month", month: 1, year: 2026 });

  it("agrupa, ordena, calcula participação e variação", () => {
    const rows = categoryBreakdown(march, feb, cats, "expense");
    expect(rows.map((r) => [r.name, r.amount])).toEqual([
      ["Contas", 600],
      ["Alimentação", 400],
      ["Sem categoria", 50],
    ]);
    expect(rows[0]!.share).toBeCloseTo(600 / 1050);
    expect(rows[0]!.deltaPct).toBeCloseTo(50); // 400 -> 600
    expect(rows[1]!.deltaPct).toBeCloseTo(100); // 200 -> 400
    expect(rows[2]!.deltaPct).toBeNull();
    expect(rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1);
  });

  it("entradas ficam separadas das saídas", () => {
    const rows = categoryBreakdown(march, feb, cats, "income");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.amount).toBe(5000);
  });
});

describe("totais e séries", () => {
  it("totalsOf calcula a taxa de poupança", () => {
    const t = totalsOf(inPeriod(data, { mode: "month", month: 2, year: 2026 }));
    expect(t).toMatchObject({ income: 5000, expense: 1050, balance: 3950 });
    expect(t.savingsRate).toBeCloseTo(0.79);
    expect(totalsOf([]).savingsRate).toBeNull();
  });

  it("monthlySeries devolve os últimos meses em ordem", () => {
    const s = monthlySeries(data, { month: 2, year: 2026 }, 3);
    expect(s.map((m) => m.key)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(s[1]!.expense).toBe(600);
    expect(s[2]!.income).toBe(5000);
  });
});

describe("insights e maiores lançamentos", () => {
  const march = inPeriod(data, { mode: "month", month: 2, year: 2026 });

  it("média por dia usa os dias decorridos no mês em andamento", () => {
    const i = periodInsights(march, { mode: "month", month: 2, year: 2026 }, new Date(2026, 2, 21));
    expect(i.days).toBe(21);
    expect(i.avgPerDay).toBe(50); // 1050 / 21
    expect(i.topDay).toEqual({ date: "2026-03-20", amount: 600 });
  });

  it("mês fechado usa o mês inteiro", () => {
    expect(periodInsights(march, { mode: "month", month: 2, year: 2026 }, new Date(2026, 5, 1)).days).toBe(31);
  });

  it("topTransactions filtra por categoria, inclusive sem categoria", () => {
    expect(topTransactions(march, "expense", "food", cats, 5).map((t) => t.amount)).toEqual([300, 100]);
    expect(topTransactions(march, "expense", "none", cats).map((t) => t.amount)).toEqual([50]);
    expect(topTransactions(march, "expense", null, cats, 1).map((t) => t.amount)).toEqual([600]);
  });
});

describe("donutSlices", () => {
  it("fatias contínuas somando 1 (com espaço entre elas)", () => {
    const s = donutSlices([{ id: "a", value: 75 }, { id: "b", value: 25 }, { id: "z", value: 0 }]);
    expect(s.map((x) => x.id)).toEqual(["a", "b"]);
    expect(s[0]!.start).toBe(0);
    expect(s[1]!.start).toBeCloseTo(0.75);
    expect(s[0]!.length).toBeCloseTo(0.75 - 0.006);
  });

  it("uma fatia única fecha o círculo; sem valores não há fatias", () => {
    expect(donutSlices([{ id: "a", value: 10 }])[0]!.length).toBe(1);
    expect(donutSlices([])).toEqual([]);
  });
});
