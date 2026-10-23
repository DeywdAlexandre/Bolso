import { toIsoDay } from "./format";
import { findDuplicateShift } from "./shifts";
import type { Shift } from "./types";

/** Evento da agenda do aparelho, no formato que o expo-calendar devolve. */
export type CalendarEvent = {
  id: string;
  title?: string | null;
  startDate: string | Date;
  endDate: string | Date;
  allDay?: boolean;
};

export type ImportedShift = Pick<Shift, "name" | "date" | "startTime" | "endTime">;

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Converte um evento em plantão; eventos de dia inteiro, sem título ou com datas inválidas são ignorados. */
export function eventToShift(event: CalendarEvent): ImportedShift | null {
  if (event.allDay) return null;
  const name = (event.title ?? "").trim();
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  if (!name || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const startTime = hhmm(start);
  const endTime = hhmm(end);
  if (startTime === endTime) return null;
  return { name, date: toIsoDay(start), startTime, endTime };
}

export type ImportPlan = { toAdd: ImportedShift[]; duplicates: number; skipped: number };

/** Separa o que é novo do que já existe nas escalas (mesmo dia, nome e horário) e do que não vira plantão. */
export function planCalendarImport(events: CalendarEvent[], existing: Shift[]): ImportPlan {
  const toAdd: ImportedShift[] = [];
  let duplicates = 0;
  let skipped = 0;
  const known = [...existing];
  for (const event of events) {
    const shift = eventToShift(event);
    if (!shift) {
      skipped++;
      continue;
    }
    if (findDuplicateShift(known, shift)) {
      duplicates++;
      continue;
    }
    toAdd.push(shift);
    // evita duplicar dois eventos iguais dentro da própria importação
    known.push({ ...shift, id: `import-${toAdd.length}`, type: "ordinary", createdAt: "" });
  }
  toAdd.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  return { toAdd, duplicates, skipped };
}
