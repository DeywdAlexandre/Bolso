export type NotificationCategory = "loans" | "recurring" | "vehicles" | "shifts" | "cards";

export const NOTIFICATION_CATEGORIES: { key: NotificationCategory; label: string; hint: string; icon: string }[] = [
  { key: "loans", label: "Empréstimos", hint: "Vencimento de juros e parcelas", icon: "users" },
  { key: "recurring", label: "Gastos fixos e assinaturas", hint: "No dia e na véspera", icon: "repeat" },
  { key: "vehicles", label: "Veículos", hint: "IPVA, seguro, revisão e troca de óleo", icon: "truck" },
  { key: "shifts", label: "Escalas", hint: "Plantões da semana", icon: "calendar" },
  { key: "cards", label: "Faturas de cartão", hint: "3 dias antes e no vencimento", icon: "credit-card" },
];

export type NotificationSettings = {
  enabled: boolean;
  categories: Record<NotificationCategory, boolean>;
  /** Hora (0-23) dos avisos de vencimento. */
  hour: number;
  /** Aviso na véspera, às 20h, dos plantões do dia seguinte. */
  shiftEve: boolean;
  /** Minutos de antecedência do aviso antes de cada plantão (0 = desligado). */
  shiftLeadMinutes: number;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  categories: { loans: true, recurring: true, vehicles: true, shifts: true, cards: true },
  hour: 9,
  shiftEve: true,
  shiftLeadMinutes: 60,
};

export const NOTIFICATION_HOURS = [7, 8, 9, 10, 12, 18, 20];
export const SHIFT_LEAD_OPTIONS = [0, 30, 60, 120];

/** Completa e valida o que veio do armazenamento (campos novos ou valores inválidos viram o padrão). */
export function normalizeNotificationSettings(raw: unknown): NotificationSettings {
  const d = DEFAULT_NOTIFICATION_SETTINGS;
  if (!raw || typeof raw !== "object") return { ...d, categories: { ...d.categories } };
  const r = raw as Partial<NotificationSettings>;
  const cats = { ...d.categories };
  for (const k of Object.keys(cats) as NotificationCategory[]) {
    if (typeof r.categories?.[k] === "boolean") cats[k] = r.categories[k];
  }
  const hour = typeof r.hour === "number" && Number.isInteger(r.hour) && r.hour >= 0 && r.hour <= 23 ? r.hour : d.hour;
  const lead =
    typeof r.shiftLeadMinutes === "number" && r.shiftLeadMinutes >= 0 && r.shiftLeadMinutes <= 600
      ? Math.round(r.shiftLeadMinutes)
      : d.shiftLeadMinutes;
  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : d.enabled,
    categories: cats,
    hour,
    shiftEve: typeof r.shiftEve === "boolean" ? r.shiftEve : d.shiftEve,
    shiftLeadMinutes: lead,
  };
}
