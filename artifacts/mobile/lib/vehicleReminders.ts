import { fromIsoDay, toIsoDay } from "./format";
import type { VehicleReminder, VehicleReminderKind } from "./types";

/** Faltando quantos dias o lembrete passa a ser destacado. */
export const SOON_DAYS = 30;

export const REMINDER_KINDS: { kind: VehicleReminderKind; label: string; icon: string; yearly: boolean }[] = [
  { kind: "ipva", label: "IPVA", icon: "file-text", yearly: true },
  { kind: "seguro", label: "Seguro", icon: "shield", yearly: true },
  { kind: "licenciamento", label: "Licenciamento", icon: "clipboard", yearly: true },
  { kind: "revisao", label: "Revisão", icon: "tool", yearly: false },
  { kind: "outro", label: "Outro", icon: "bell", yearly: false },
];

export type ReminderState = "overdue" | "soon" | "ok" | "done";

export type ReminderStatus = { state: ReminderState; days: number };

/** Dias entre dois dias YYYY-MM-DD (positivo = `to` é depois de `from`). */
export function daysUntil(from: string, to: string): number {
  const a = fromIsoDay(from);
  const b = fromIsoDay(to);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function reminderStatus(r: VehicleReminder, today: string = toIsoDay(new Date())): ReminderStatus {
  if (r.doneAt) return { state: "done", days: 0 };
  const days = daysUntil(today, r.dueDate);
  return { state: days < 0 ? "overdue" : days <= SOON_DAYS ? "soon" : "ok", days };
}

/** Texto curto: "vence hoje", "vence em 12 dias", "venceu há 3 dias". */
export function reminderLabel(status: ReminderStatus): string {
  const { state, days } = status;
  if (state === "done") return "Concluído";
  if (days === 0) return "vence hoje";
  if (days === 1) return "vence amanhã";
  if (days > 0) return `vence em ${days} dias`;
  return days === -1 ? "venceu ontem" : `venceu há ${Math.abs(days)} dias`;
}

/** Mesmo dia e mês no ano seguinte (29/02 vira 28/02 em ano não bissexto). */
export function nextYear(dueDate: string): string {
  const d = fromIsoDay(dueDate);
  const day = d.getDate();
  d.setDate(1);
  d.setFullYear(d.getFullYear() + 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toIsoDay(d);
}

/** Alterações a gravar quando o usuário conclui o lembrete. */
export function completionPatch(r: VehicleReminder, now: Date = new Date()): Partial<VehicleReminder> {
  return r.repeatsYearly ? { dueDate: nextYear(r.dueDate) } : { doneAt: now.toISOString() };
}

/** Pendentes primeiro (do mais próximo ao mais distante), concluídos por último. */
export function sortReminders(list: VehicleReminder[]): VehicleReminder[] {
  return [...list].sort((a, b) => {
    if (!!a.doneAt !== !!b.doneAt) return a.doneAt ? 1 : -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

/** O pendente que vence primeiro, se houver. */
export function mostUrgent(list: VehicleReminder[]): VehicleReminder | null {
  return sortReminders(list).find((r) => !r.doneAt) ?? null;
}
