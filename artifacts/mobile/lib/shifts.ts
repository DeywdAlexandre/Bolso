import { addDaysIso, genId, localDayStart, parseDecimalPtBr, toIsoDay } from "./format";
import type { Shift, ShiftRule } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");
const MAX_OCCURRENCES = 5000;
/** Quantos meses à frente as escalas recorrentes mantêm plantões gerados. */
export const RULE_HORIZON_MONTHS = 3;

// ---------------------------------------------------------------------------
// Horários
// ---------------------------------------------------------------------------

/** "7", "7:5", "0700", "7h30", "19:00" → "HH:MM"; inválido → null. */
export function normalizeTime(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace("h", ":");
  let h: number, m: number;
  let match = /^(\d{1,2}):(\d{1,2})$/.exec(s);
  if (match) {
    h = Number(match[1]);
    m = Number(match[2]);
  } else if ((match = /^(\d{1,2}):?$/.exec(s))) {
    h = Number(match[1]);
    m = 0;
  } else if ((match = /^(\d{2})(\d{2})$/.exec(s))) {
    h = Number(match[1]);
    m = Number(match[2]);
  } else {
    return null;
  }
  if (h > 23 || m > 59) return null;
  return `${pad(h)}:${pad(m)}`;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
};

/** Duração em horas entre início e fim; se o fim for menor, o plantão passa da meia-noite. */
export function shiftHours(startTime: string, endTime: string): number {
  const start = normalizeTime(startTime);
  const end = normalizeTime(endTime);
  if (!start || !end) return 0;
  let minutes = toMinutes(end) - toMinutes(start);
  if (minutes <= 0) minutes += 24 * 60; // virou o dia (ex.: 19:00 → 07:00)
  return minutes / 60;
}

export function formatHours(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h${pad(m)}`;
}

/** Horas digitadas ("12", "7,5"). Negativo vira -1 para a validação recusar (o sinal não pode sumir em silêncio). */
export function parseHours(raw: string): number {
  if (/^\s*-/.test(raw)) return -1;
  return parseDecimalPtBr(raw);
}

// ---------------------------------------------------------------------------
// Validação do formulário
// ---------------------------------------------------------------------------

export type ShiftFormInput = {
  name: string;
  startTime: string;
  endTime: string;
  recurrence?: { type: "rotative"; workHours: number; offHours: number } | { type: "weekly"; weekDays: number[] };
};

/** Primeira mensagem de erro do formulário de plantão/escala, ou null se estiver tudo certo. */
export function validateShiftForm(input: ShiftFormInput): string | null {
  if (!input.name.trim()) return "Digite o nome do serviço.";
  if (!normalizeTime(input.startTime)) return "O horário de início é inválido. Use o formato 07:00.";
  if (!normalizeTime(input.endTime)) return "O horário de fim é inválido. Use o formato 19:00.";
  if (normalizeTime(input.startTime) === normalizeTime(input.endTime)) return "Início e fim não podem ser iguais.";
  const r = input.recurrence;
  if (r?.type === "weekly" && r.weekDays.length === 0) return "Escolha pelo menos um dia da semana.";
  if (r?.type === "rotative") {
    if (!(r.workHours > 0)) return "Informe as horas trabalhadas (maior que zero).";
    if (!(r.offHours >= 0)) return "As horas de folga não podem ser negativas.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Geração das escalas recorrentes
// ---------------------------------------------------------------------------

export type GenerateOptions = {
  /** Último dia a gerar (YYYY-MM-DD), inclusive. */
  until: string;
  /** Só emite plantões a partir deste dia (o ciclo continua contado desde o início da escala). */
  from?: string;
  newId?: () => string;
  now?: string;
};

function buildShift(rule: ShiftRule, date: string, startTime: string, endTime: string, newId: () => string, now: string): Shift {
  return {
    id: newId(),
    ruleId: rule.id,
    name: rule.name,
    type: rule.type,
    value: rule.value,
    date,
    startTime,
    endTime,
    color: rule.color,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Plantões de uma escala recorrente entre o início dela e `until`.
 * - Semanal: todo dia da semana marcado.
 * - Ciclo (ex.: 12x36): um plantão a cada (trabalho + folga) horas. Ciclos múltiplos de 24h (12x36, 24x48)
 *   andam em dias de calendário, com o horário da escala. Nos demais (ex.: 12x24) o horário muda a cada
 *   plantão e é calculado.
 */
export function generateRuleShifts(rule: ShiftRule, opts: GenerateOptions): Shift[] {
  const newId = opts.newId ?? (() => "sh_" + genId());
  const now = opts.now ?? new Date().toISOString();
  const from = opts.from ?? "0000-00-00";
  const out: Shift[] = [];
  const startDay = localDayStart(rule.startDate);
  const end = localDayStart(opts.until);

  if (rule.recurrenceType === "weekly") {
    const days = rule.weekDays ?? [];
    if (days.length === 0) return out;
    const cursor = new Date(startDay);
    for (let i = 0; cursor <= end && i < MAX_OCCURRENCES; i++) {
      const date = toIsoDay(cursor);
      if (days.includes(cursor.getDay()) && date >= from) out.push(buildShift(rule, date, rule.startTime, rule.endTime, newId, now));
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }

  if (rule.recurrenceType === "rotative") {
    const workHours = rule.workHours ?? 12;
    const offHours = rule.offHours ?? 36;
    const cycleHours = workHours + offHours;
    if (!(workHours > 0) || !(cycleHours > 0)) return out; // evita laço infinito com valores inválidos

    if (cycleHours % 24 === 0) {
      const stepDays = cycleHours / 24;
      const cursor = new Date(startDay);
      for (let i = 0; cursor <= end && i < MAX_OCCURRENCES; i++) {
        const date = toIsoDay(cursor);
        if (date >= from) out.push(buildShift(rule, date, rule.startTime, rule.endTime, newId, now));
        cursor.setDate(cursor.getDate() + stepDays);
      }
      return out;
    }

    const start = normalizeTime(rule.startTime) ?? "00:00";
    const first = new Date(startDay.getTime() + toMinutes(start) * 60_000);
    const endMs = end.getTime() + 24 * 3_600_000 - 1;
    for (let i = 0; i < MAX_OCCURRENCES; i++) {
      const at = new Date(first.getTime() + i * cycleHours * 3_600_000);
      if (at.getTime() > endMs) break;
      const date = toIsoDay(at);
      if (date < from) continue;
      const finish = new Date(at.getTime() + workHours * 3_600_000);
      const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      out.push(buildShift(rule, date, hhmm(at), hhmm(finish), newId, now));
    }
  }
  return out;
}

/** Último dia (YYYY-MM-DD) a manter gerado: hoje + `months` meses. */
export function horizonDay(today: string, months = RULE_HORIZON_MONTHS): string {
  const d = localDayStart(today);
  d.setMonth(d.getMonth() + months);
  return toIsoDay(d);
}

/**
 * Novos plantões para manter a escala gerada até o horizonte, sem recriar dias que o usuário
 * apagou (só gera depois de `generatedUntil`). Escalas antigas sem esse campo continuam do último
 * plantão existente; se não houver nenhum (escala que nunca gerou), geram desde o início.
 */
export function planRuleExtension(
  rule: ShiftRule,
  existing: Shift[],
  today: string,
  opts: { months?: number; newId?: () => string; now?: string } = {},
): { shifts: Shift[]; generatedUntil: string } | null {
  const until = horizonDay(today, opts.months);
  let generatedUntil = rule.generatedUntil;
  if (!generatedUntil) {
    const dates = existing.filter((s) => s.ruleId === rule.id).map((s) => s.date).sort();
    generatedUntil = dates[dates.length - 1];
  }
  if (generatedUntil && generatedUntil >= until) return null;

  const from = generatedUntil ? addDaysIso(generatedUntil, 1) : undefined;
  const have = new Set(existing.filter((s) => s.ruleId === rule.id).map((s) => s.date));
  const shifts = generateRuleShifts(rule, { until, from, newId: opts.newId, now: opts.now }).filter((s) => !have.has(s.date));
  return { shifts, generatedUntil: until };
}

/** Ao excluir uma escala: apaga só os plantões de hoje em diante que ainda não foram recebidos; o histórico fica. */
export function shiftsAfterRuleRemoval(shifts: Shift[], ruleId: string, today: string): Shift[] {
  return shifts.filter((s) => s.ruleId !== ruleId || s.date < today || s.isPaid || !!s.transactionId);
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

/** Próximo plantão: hoje só vale se ainda não terminou. */
export function nextShift(shifts: Shift[], now: Date): Shift | null {
  const today = toIsoDay(now);
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  const upcoming = shifts
    .filter((s) => {
      if (s.date > today) return true;
      if (s.date < today) return false;
      const start = normalizeTime(s.startTime);
      const end = normalizeTime(s.endTime);
      if (!start || !end) return true;
      // plantão que vira a meia-noite só termina no dia seguinte
      return toMinutes(end) > toMinutes(start) ? toMinutes(end) > minutesNow : true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  return upcoming[0] ?? null;
}

/** Já existe um plantão igual (mesmo dia, nome e horário)? */
export function findDuplicateShift(shifts: Shift[], candidate: Pick<Shift, "date" | "name" | "startTime">): Shift | undefined {
  const name = candidate.name.trim().toLowerCase();
  return shifts.find(
    (s) => s.date === candidate.date && s.name.trim().toLowerCase() === name && s.startTime === candidate.startTime,
  );
}

export type MonthStats = {
  countOrdinary: number;
  countExtra: number;
  extraTotal: number;
  extraPaid: number;
  hours: number;
};

/** Totais de um mês (YYYY-MM): quantidade, extras recebidos/a receber e horas. */
export function monthStats(shifts: Shift[], monthPrefix: string): MonthStats {
  const stats: MonthStats = { countOrdinary: 0, countExtra: 0, extraTotal: 0, extraPaid: 0, hours: 0 };
  for (const s of shifts) {
    if (!s.date.startsWith(monthPrefix)) continue;
    stats.hours += shiftHours(s.startTime, s.endTime);
    if (s.type === "ordinary") {
      stats.countOrdinary++;
      continue;
    }
    stats.countExtra++;
    const value = s.value ?? 0;
    stats.extraTotal += value;
    if (s.isPaid) stats.extraPaid += value;
  }
  stats.extraTotal = Math.round(stats.extraTotal * 100) / 100;
  stats.extraPaid = Math.round(stats.extraPaid * 100) / 100;
  return stats;
}
