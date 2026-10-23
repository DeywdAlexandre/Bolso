import { describe, expect, it } from "vitest";

import { eventToShift, planCalendarImport } from "./calendarImport";
import type { Shift } from "./types";

const ev = (id: string, title: string, start: string, end: string, allDay = false) => ({
  id,
  title,
  startDate: start,
  endDate: end,
  allDay,
});

describe("eventToShift", () => {
  it("usa data e horário locais do evento", () => {
    const s = eventToShift(ev("1", " UTI Noturno ", "2026-11-03T19:00:00", "2026-11-04T07:00:00"));
    expect(s).toEqual({ name: "UTI Noturno", date: "2026-11-03", startTime: "19:00", endTime: "07:00" });
  });

  it("ignora dia inteiro, sem título, datas inválidas e início igual ao fim", () => {
    expect(eventToShift(ev("1", "Feriado", "2026-11-15T00:00:00", "2026-11-16T00:00:00", true))).toBeNull();
    expect(eventToShift(ev("2", "  ", "2026-11-03T07:00:00", "2026-11-03T19:00:00"))).toBeNull();
    expect(eventToShift(ev("3", "X", "lixo", "2026-11-03T19:00:00"))).toBeNull();
    expect(eventToShift(ev("4", "X", "2026-11-03T07:00:00", "2026-11-03T07:00:00"))).toBeNull();
  });
});

describe("planCalendarImport", () => {
  const existing: Shift[] = [
    { id: "a", name: "uti diurno", type: "ordinary", date: "2026-11-03", startTime: "07:00", endTime: "19:00", createdAt: "" },
  ];

  it("não duplica o que já existe nem repetidos na própria agenda", () => {
    const plan = planCalendarImport(
      [
        ev("1", "UTI Diurno", "2026-11-03T07:00:00", "2026-11-03T19:00:00"),
        ev("2", "UTI Noturno", "2026-11-05T19:00:00", "2026-11-06T07:00:00"),
        ev("3", "UTI Noturno", "2026-11-05T19:00:00", "2026-11-06T07:00:00"),
        ev("4", "Aniversário", "2026-11-07T00:00:00", "2026-11-08T00:00:00", true),
        ev("5", "Plantão", "2026-11-01T07:00:00", "2026-11-01T19:00:00"),
      ],
      existing,
    );
    expect(plan.duplicates).toBe(2);
    expect(plan.skipped).toBe(1);
    expect(plan.toAdd.map((s) => s.date)).toEqual(["2026-11-01", "2026-11-05"]);
  });
});
