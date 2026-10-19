import { describe, expect, it } from "vitest";

import { parseDecimalPtBr } from "./format";
import {
  findDuplicateShift, formatHours, generateRuleShifts, horizonDay, monthStats, nextShift, normalizeTime,
  parseHours, planRuleExtension, shiftHours, shiftsAfterRuleRemoval, validateShiftForm,
} from "./shifts";
import type { Shift, ShiftRule } from "./types";

const rule = (over: Partial<ShiftRule> = {}): ShiftRule => ({
  id: "r1", name: "Escala", type: "ordinary", recurrenceType: "rotative", workHours: 12, offHours: 36,
  startDate: "2026-10-01", startTime: "07:00", endTime: "19:00", createdAt: "2026-10-01T00:00:00.000Z", ...over,
});
let n = 0;
const ids = () => `id${++n}`;
const dates = (list: Shift[]) => list.map((s) => s.date);
const shift = (over: Partial<Shift>): Shift => ({
  id: `s${++n}`, name: "Plantão", type: "ordinary", date: "2026-10-10", startTime: "07:00", endTime: "19:00", createdAt: "", ...over,
});

describe("parseDecimalPtBr", () => {
  it("entende o jeito brasileiro de digitar valores", () => {
    expect(parseDecimalPtBr("1.500,50")).toBe(1500.5);
    expect(parseDecimalPtBr("150,5")).toBe(150.5);
    expect(parseDecimalPtBr("1500")).toBe(1500);
    expect(parseDecimalPtBr("1.500")).toBe(1500);
    expect(parseDecimalPtBr("150.5")).toBe(150.5);
    expect(parseDecimalPtBr("R$ 2.000,00")).toBe(2000);
    expect(parseDecimalPtBr("")).toBe(0);
    expect(parseDecimalPtBr("abc")).toBe(0);
    expect(parseDecimalPtBr("-50")).toBe(50); // o sinal é descartado: valor de plantão nunca é negativo
  });
});

describe("parseHours", () => {
  it("lê horas em português e recusa negativas em vez de descartar o sinal", () => {
    expect(parseHours("12")).toBe(12);
    expect(parseHours("7,5")).toBe(7.5);
    expect(parseHours("-40")).toBe(-1);
    expect(parseHours(" -3")).toBe(-1);
    expect(parseHours("")).toBe(0);
  });
});

describe("horários", () => {
  it("normalizeTime aceita formatos comuns e rejeita inválidos", () => {
    expect(normalizeTime("7")).toBe("07:00");
    expect(normalizeTime("7:5")).toBe("07:05");
    expect(normalizeTime("0700")).toBe("07:00");
    expect(normalizeTime("19h30")).toBe("19:30");
    expect(normalizeTime(" 19:00 ")).toBe("19:00");
    expect(normalizeTime("25:00")).toBeNull();
    expect(normalizeTime("12:60")).toBeNull();
    expect(normalizeTime("abc")).toBeNull();
    expect(normalizeTime("")).toBeNull();
  });

  it("shiftHours considera plantão que passa da meia-noite", () => {
    expect(shiftHours("07:00", "19:00")).toBe(12);
    expect(shiftHours("19:00", "07:00")).toBe(12);
    expect(shiftHours("22:30", "06:00")).toBe(7.5);
    expect(shiftHours("x", "07:00")).toBe(0);
    expect(formatHours(12)).toBe("12h");
    expect(formatHours(7.5)).toBe("7h30");
  });
});

describe("validateShiftForm", () => {
  const ok = { name: "Hospital", startTime: "07:00", endTime: "19:00" };

  it("exige nome, horários válidos e diferentes", () => {
    expect(validateShiftForm(ok)).toBeNull();
    expect(validateShiftForm({ ...ok, name: "  " })).toMatch(/nome/);
    expect(validateShiftForm({ ...ok, startTime: "7h" })).toBeNull(); // normalizável
    expect(validateShiftForm({ ...ok, startTime: "99:00" })).toMatch(/início/);
    expect(validateShiftForm({ ...ok, endTime: "abc" })).toMatch(/fim/);
    expect(validateShiftForm({ ...ok, endTime: "07:00" })).toMatch(/iguais/);
  });

  it("escala semanal precisa de dias; ciclo precisa de horas válidas", () => {
    expect(validateShiftForm({ ...ok, recurrence: { type: "weekly", weekDays: [] } })).toMatch(/dia da semana/);
    expect(validateShiftForm({ ...ok, recurrence: { type: "weekly", weekDays: [1] } })).toBeNull();
    expect(validateShiftForm({ ...ok, recurrence: { type: "rotative", workHours: 0, offHours: 36 } })).toMatch(/trabalhadas/);
    expect(validateShiftForm({ ...ok, recurrence: { type: "rotative", workHours: -40, offHours: 36 } })).toMatch(/trabalhadas/);
    expect(validateShiftForm({ ...ok, recurrence: { type: "rotative", workHours: 12, offHours: -1 } })).toMatch(/folga/);
    expect(validateShiftForm({ ...ok, recurrence: { type: "rotative", workHours: 12, offHours: 36 } })).toBeNull();
  });
});

describe("generateRuleShifts", () => {
  it("12x36: um plantão a cada 2 dias, com o horário da escala", () => {
    const list = generateRuleShifts(rule(), { until: "2026-10-10", newId: ids });
    expect(dates(list)).toEqual(["2026-10-01", "2026-10-03", "2026-10-05", "2026-10-07", "2026-10-09"]);
    expect(list.every((s) => s.startTime === "07:00" && s.endTime === "19:00" && s.ruleId === "r1")).toBe(true);
  });

  it("24x48: a cada 3 dias", () => {
    const list = generateRuleShifts(rule({ workHours: 24, offHours: 48 }), { until: "2026-10-10", newId: ids });
    expect(dates(list)).toEqual(["2026-10-01", "2026-10-04", "2026-10-07", "2026-10-10"]);
  });

  it("12x24 (36h): o horário se desloca e é calculado a cada plantão", () => {
    const list = generateRuleShifts(rule({ workHours: 12, offHours: 24 }), { until: "2026-10-06", newId: ids });
    expect(list.map((s) => `${s.date} ${s.startTime}-${s.endTime}`)).toEqual([
      "2026-10-01 07:00-19:00", "2026-10-02 19:00-07:00", "2026-10-04 07:00-19:00", "2026-10-05 19:00-07:00",
    ]);
  });

  it("semanal: dias marcados; segunda e quarta", () => {
    const list = generateRuleShifts(rule({ recurrenceType: "weekly", weekDays: [1, 3], startDate: "2026-10-19" }), { until: "2026-10-31", newId: ids });
    expect(dates(list)).toEqual(["2026-10-19", "2026-10-21", "2026-10-26", "2026-10-28"]);
  });

  it("semanal sem dias não gera nada", () => {
    expect(generateRuleShifts(rule({ recurrenceType: "weekly", weekDays: [] }), { until: "2026-12-31" })).toEqual([]);
  });

  it("valores inválidos não travam (antes um ciclo negativo gerava laço infinito)", () => {
    expect(generateRuleShifts(rule({ workHours: -40, offHours: 36 }), { until: "2027-12-31" })).toEqual([]);
    expect(generateRuleShifts(rule({ workHours: 0, offHours: 0 }), { until: "2027-12-31" })).toEqual([]);
  });

  it("'from' só filtra o que é emitido: o ciclo continua contado desde o início", () => {
    const list = generateRuleShifts(rule(), { until: "2026-10-10", from: "2026-10-04", newId: ids });
    expect(dates(list)).toEqual(["2026-10-05", "2026-10-07", "2026-10-09"]); // dia 4 não é dia de plantão
  });

  it("não pula nem repete dia na virada de mês e de ano", () => {
    const list = generateRuleShifts(rule({ startDate: "2026-12-30" }), { until: "2027-01-08", newId: ids });
    expect(dates(list)).toEqual(["2026-12-30", "2027-01-01", "2027-01-03", "2027-01-05", "2027-01-07"]);
  });
});

describe("planRuleExtension (manter a escala sempre gerada à frente)", () => {
  const today = "2026-10-19";
  const until = horizonDay(today); // 3 meses à frente

  it("horizonDay soma meses", () => {
    expect(until).toBe("2027-01-19");
  });

  it("escala que nunca gerou nada (ex.: criada com o bug) gera desde o início até o horizonte", () => {
    const plan = planRuleExtension(rule({ startDate: "2026-10-01" }), [], today, { newId: ids })!;
    expect(plan.generatedUntil).toBe(until);
    expect(plan.shifts[0]!.date).toBe("2026-10-01");
    expect(plan.shifts.at(-1)!.date <= until).toBe(true);
    expect(plan.shifts.length).toBeGreaterThan(40);
  });

  it("com generatedUntil só gera depois dele (dia apagado pelo usuário não volta)", () => {
    const r = rule({ startDate: "2026-10-01", generatedUntil: "2026-12-01" });
    const plan = planRuleExtension(r, [], today, { newId: ids })!;
    expect(plan.shifts[0]!.date > "2026-12-01").toBe(true);
    expect(plan.shifts.some((s) => s.date === "2026-10-03")).toBe(false);
  });

  it("escala antiga (sem generatedUntil) continua do último plantão existente", () => {
    const existing = [shift({ ruleId: "r1", date: "2026-10-01" }), shift({ ruleId: "r1", date: "2026-12-31" })];
    const plan = planRuleExtension(rule(), existing, today, { newId: ids })!;
    expect(plan.shifts[0]!.date).toBe("2027-01-01");
  });

  it("já no horizonte: nada a fazer", () => {
    expect(planRuleExtension(rule({ generatedUntil: until }), [], today)).toBeNull();
    expect(planRuleExtension(rule({ generatedUntil: "2027-06-01" }), [], today)).toBeNull();
  });

  it("não duplica datas que já existem", () => {
    const existing = [shift({ ruleId: "r1", date: "2026-10-01" })];
    const plan = planRuleExtension(rule({ startDate: "2026-10-01" }), existing, today, { newId: ids });
    // o último plantão existente é 10/10... mas sem generatedUntil começa depois dele
    expect(plan!.shifts.every((s) => s.date > "2026-10-01")).toBe(true);
  });
});

describe("excluir uma escala", () => {
  const list = [
    shift({ id: "past", ruleId: "r1", date: "2026-10-05" }),
    shift({ id: "future", ruleId: "r1", date: "2026-10-25" }),
    shift({ id: "today", ruleId: "r1", date: "2026-10-19" }),
    shift({ id: "paid", ruleId: "r1", date: "2026-10-27", type: "extra", isPaid: true }),
    shift({ id: "tx", ruleId: "r1", date: "2026-10-29", transactionId: "t" }),
    shift({ id: "other", ruleId: "r2", date: "2026-10-25" }),
    shift({ id: "manual", date: "2026-10-25" }),
  ];

  it("remove só os futuros não recebidos; mantém histórico, recebidos e as demais escalas", () => {
    const kept = shiftsAfterRuleRemoval(list, "r1", "2026-10-19").map((s) => s.id);
    expect(kept.sort()).toEqual(["manual", "other", "paid", "past", "tx"].sort());
  });
});

describe("próximo plantão", () => {
  const at = (day: string, h: number, m = 0) => new Date(`${day}T00:00:00`.replace("T00:00:00", `T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`));

  it("hoje já terminado não é o próximo", () => {
    const list = [shift({ id: "a", date: "2026-10-19", startTime: "07:00", endTime: "19:00" }), shift({ id: "b", date: "2026-10-21" })];
    expect(nextShift(list, at("2026-10-19", 20))!.id).toBe("b");
    expect(nextShift(list, at("2026-10-19", 10))!.id).toBe("a"); // em andamento
    expect(nextShift(list, at("2026-10-19", 6))!.id).toBe("a");
  });

  it("plantão noturno de hoje ainda conta e o passado não", () => {
    const list = [shift({ id: "n", date: "2026-10-19", startTime: "19:00", endTime: "07:00" }), shift({ id: "old", date: "2026-10-01" })];
    expect(nextShift(list, at("2026-10-19", 23))!.id).toBe("n");
    expect(nextShift([shift({ date: "2026-10-01" })], at("2026-10-19", 9))).toBeNull();
  });
});

describe("duplicatas e totais do mês", () => {
  it("findDuplicateShift compara dia, nome (sem caixa) e início", () => {
    const list = [shift({ id: "x", name: "GT Extra", date: "2026-10-10", startTime: "07:00" })];
    expect(findDuplicateShift(list, { date: "2026-10-10", name: " gt extra ", startTime: "07:00" })?.id).toBe("x");
    expect(findDuplicateShift(list, { date: "2026-10-11", name: "GT Extra", startTime: "07:00" })).toBeUndefined();
    expect(findDuplicateShift(list, { date: "2026-10-10", name: "GT Extra", startTime: "19:00" })).toBeUndefined();
  });

  it("monthStats soma quantidade, extras recebidos/a receber e horas", () => {
    const list = [
      shift({ date: "2026-10-01" }),
      shift({ date: "2026-10-02", type: "extra", value: 300, isPaid: true, startTime: "19:00", endTime: "07:00" }),
      shift({ date: "2026-10-03", type: "extra", value: 150.5, startTime: "08:00", endTime: "14:00" }),
      shift({ date: "2026-11-01", type: "extra", value: 999 }),
    ];
    expect(monthStats(list, "2026-10")).toEqual({ countOrdinary: 1, countExtra: 2, extraTotal: 450.5, extraPaid: 300, hours: 30 });
  });
});
