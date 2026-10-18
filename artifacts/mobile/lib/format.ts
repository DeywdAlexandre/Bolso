export function formatCurrency(value: number, currency = "BRL"): string {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `R$ ${value.toFixed(2).replace(".", ",")}`;
  }
}

export function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1).replace(".", ",")}M`;
  }
  if (Math.abs(value) >= 10_000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toFixed(1).replace(".", ",")}k`;
  }
  return formatCurrency(value);
}

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const monthShort = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function getMonthName(monthIndex: number): string {
  return monthNames[monthIndex] ?? "";
}

export function getMonthShort(monthIndex: number): string {
  return monthShort[monthIndex] ?? "";
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getDate()} de ${getMonthName(d.getMonth()).toLowerCase()} de ${d.getFullYear()}`;
}

export function todayIso(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export function isSameMonth(iso: string, month: number, year: number): boolean {
  const d = new Date(iso);
  return d.getMonth() === month && d.getFullYear() === year;
}

export function isSameYear(iso: string, year: number): boolean {
  const d = new Date(iso);
  return d.getFullYear() === year;
}

export function toIsoDay(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromIsoDay(s: string): Date {
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

/** Meia-noite local do dia "YYYY-MM-DD" (aceita também um ISO completo, usando só a data). */
export function localDayStart(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

export function isoDayOf(iso: string): string {
  const d = new Date(iso);
  return toIsoDay(d);
}

export function formatDayShort(iso: string): string {
  const d = fromIsoDay(iso);
  const day = d.getDate().toString().padStart(2, "0");
  return `${day} ${getMonthShort(d.getMonth()).toLowerCase()}`;
}

export function formatRangeLabel(start: string, end: string): string {
  const s = fromIsoDay(start);
  const e = fromIsoDay(end);
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const sameYear = s.getFullYear() === e.getFullYear();
  if (start === end) return formatDayShort(start);
  if (sameMonth) {
    return `${s.getDate()} – ${e.getDate()} ${getMonthShort(e.getMonth()).toLowerCase()}`;
  }
  if (sameYear) {
    return `${s.getDate()} ${getMonthShort(s.getMonth()).toLowerCase()} – ${e.getDate()} ${getMonthShort(e.getMonth()).toLowerCase()}`;
  }
  return `${s.getDate()}/${s.getMonth() + 1}/${s.getFullYear()} – ${e.getDate()}/${e.getMonth() + 1}/${e.getFullYear()}`;
}

export function addDaysIso(iso: string, days: number): string {
  const d = fromIsoDay(iso);
  d.setDate(d.getDate() + days);
  return toIsoDay(d);
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function parseAmountInput(raw: string): number {
  const cleaned = raw.replace(/[^\d]/g, "");
  if (!cleaned) return 0;
  const cents = parseInt(cleaned, 10);
  return cents / 100;
}

export function formatAmountInput(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
