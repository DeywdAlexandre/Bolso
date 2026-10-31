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

export type SkipReason = "allDay" | "noTitle" | "invalidDate" | "sameTime";

/** Por que um evento não vira plantão (null se vira). */
export function skipReason(event: CalendarEvent): SkipReason | null {
  if (event.allDay) return "allDay";
  if (!(event.title ?? "").trim()) return "noTitle";
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "invalidDate";
  if (hhmm(start) === hhmm(end)) return "sameTime";
  return null;
}

export const SKIP_LABELS: Record<SkipReason, string> = {
  allDay: "dia inteiro",
  noTitle: "sem título",
  invalidDate: "data inválida",
  sameTime: "início e fim iguais",
};

export type ImportPlan = {
  toAdd: ImportedShift[];
  duplicates: number;
  skipped: number;
  /** Quantos eventos a agenda devolveu no período. */
  read: number;
  /** Ignorados por motivo. */
  skippedBy: Partial<Record<SkipReason, number>>;
  /** Até 3 títulos ignorados, para o usuário reconhecer. */
  skippedSamples: string[];
};

/** Separa o que é novo do que já existe nas escalas (mesmo dia, nome e horário) e do que não vira plantão. */
export function planCalendarImport(events: CalendarEvent[], existing: Shift[]): ImportPlan {
  const toAdd: ImportedShift[] = [];
  let duplicates = 0;
  let skipped = 0;
  const skippedBy: ImportPlan["skippedBy"] = {};
  const skippedSamples: string[] = [];
  const known = [...existing];
  for (const event of events) {
    const shift = eventToShift(event);
    if (!shift) {
      skipped++;
      const reason = skipReason(event) ?? "invalidDate";
      skippedBy[reason] = (skippedBy[reason] ?? 0) + 1;
      const title = (event.title ?? "").trim();
      if (title && skippedSamples.length < 3 && !skippedSamples.includes(title)) skippedSamples.push(title);
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
  return { toAdd, duplicates, skipped, read: events.length, skippedBy, skippedSamples };
}
