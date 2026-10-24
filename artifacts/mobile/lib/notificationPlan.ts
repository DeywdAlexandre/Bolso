import { formatCurrency, formatDate, localDayStart, toIsoDay } from "./format";
import { addMonthsClamped, dueLabel, nextDue } from "./loanDue";
import type { NotificationCategory, NotificationSettings } from "./notificationSettings";
import type {
  Account,
  Fueling,
  Loan,
  LoanContact,
  LoanPayment,
  OilChange,
  Recurring,
  Shift,
  Vehicle,
  VehicleExpense,
  VehicleReminder,
} from "./types";
import { daysUntil, reminderLabel, reminderStatus } from "./vehicleReminders";
import { oilStatusInfo } from "./vehicleSummary";
import { computeVehicleStats } from "./vehicleStats";

/** Quantos dias à frente os avisos são agendados (o plano é refeito sempre que os dados mudam). */
export const HORIZON_DAYS = 60;
/** Limite de avisos agendados ao mesmo tempo. */
export const MAX_PLANNED = 120;
/** Hora do aviso de véspera dos gastos fixos e empréstimos. */
const EVE_HOUR = 18;
/** Hora do aviso de véspera dos plantões. */
const SHIFT_EVE_HOUR = 20;

export type PlannedNotification = {
  /** Identifica o aviso (estável entre replanejamentos). */
  key: string;
  category: NotificationCategory;
  title: string;
  body: string;
  at: Date;
  /** Tela aberta ao tocar no aviso. */
  route?: string;
};

export type PlanInput = {
  loans: Loan[];
  loanPayments: LoanPayment[];
  loanContacts: LoanContact[];
  recurring: Recurring[];
  vehicles: Vehicle[];
  fuelings: Fueling[];
  oilChanges: OilChange[];
  vehicleExpenses: VehicleExpense[];
  vehicleReminders: VehicleReminder[];
  shifts: Shift[];
  accounts: Account[];
};

const atHour = (day: string, hour: number, minute = 0): Date => {
  const d = localDayStart(day);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const addDays = (day: string, n: number): string => {
  const d = localDayStart(day);
  d.setDate(d.getDate() + n);
  return toIsoDay(d);
};

/** Dia `dayOfMonth` do mês `monthOffset` meses à frente de `from` (31 em fevereiro vira 28/29). */
function monthDay(from: Date, monthOffset: number, dayOfMonth: number): string {
  const base = new Date(from.getFullYear(), from.getMonth() + monthOffset, 1);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  base.setDate(Math.min(dayOfMonth, last));
  return toIsoDay(base);
}

/** Próxima vez que o relógio marca `hour`: hoje, se ainda não passou; senão amanhã. */
function nextOccurrence(now: Date, hour: number): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

function whenLabel(days: number): string {
  if (days <= 0) return "vence hoje";
  if (days === 1) return "vence amanhã";
  return `vence em ${days} dias`;
}

/**
 * Lista de avisos a agendar nos próximos HORIZON_DAYS dias, já filtrada pelas preferências.
 * Função pura: quem agenda no aparelho só percorre o resultado.
 */
export function buildNotificationPlan(input: PlanInput, settings: NotificationSettings, now: Date = new Date()): PlannedNotification[] {
  if (!settings.enabled) return [];
  const on = settings.categories;
  const out: PlannedNotification[] = [];
  const today = toIsoDay(now);
  const hour = settings.hour;
  const push = (n: PlannedNotification) => out.push(n);

  // Empréstimos: vence amanhã (18h), vence hoje (hora escolhida) e, se atrasou, um aviso por abertura do app.
  if (on.loans) {
    for (const loan of input.loans) {
      const due = nextDue(loan, input.loanPayments, now);
      if (!due) continue;
      const name = input.loanContacts.find((c) => c.id === loan.contactId)?.name ?? "Empréstimo";
      const lend = loan.direction === "lend";
      const route = `/loans/loan-detail/${loan.id}`;

      if (due.status === "overdue") {
        push({
          key: `loan:${loan.id}:overdue`,
          category: "loans",
          title: `${lend ? "Recebimento atrasado" : "Pagamento atrasado"}: ${name}`,
          body: `${loan.description} · ${formatCurrency(due.amount)} · ${dueLabel(due).toLowerCase()}`,
          at: nextOccurrence(now, hour),
          route,
        });
        continue;
      }

      const start = localDayStart(loan.startDate);
      const first = localDayStart(due.dueDate);
      const n0 = (first.getFullYear() - start.getFullYear()) * 12 + first.getMonth() - start.getMonth();
      const count = loan.type === "fixed_installments" ? loan.installmentsCount || 1 : Infinity;
      for (let k = 0; k < 3 && n0 + k <= count; k++) {
        const day = toIsoDay(addMonthsClamped(start, n0 + k));
        const verb = lend ? "Receber de" : "Pagar a";
        push({
          key: `loan:${loan.id}:${day}:eve`,
          category: "loans",
          title: `${verb} ${name} amanhã`,
          body: `${loan.description} · ${formatCurrency(due.amount)}`,
          at: atHour(addDays(day, -1), EVE_HOUR),
          route,
        });
        push({
          key: `loan:${loan.id}:${day}:day`,
          category: "loans",
          title: `${verb} ${name} hoje`,
          body: `${loan.description} · ${formatCurrency(due.amount)}`,
          at: atHour(day, hour),
          route,
        });
      }
    }
  }

  // Gastos fixos e assinaturas: no dia e, para saídas, na véspera.
  if (on.recurring) {
    for (const r of input.recurring) {
      if (!r.active) continue;
      for (let m = 0; m < 3; m++) {
        const day = monthDay(now, m, r.dayOfMonth);
        const label = r.type === "income" ? "Receita fixa" : r.isSubscription ? "Assinatura" : "Gasto fixo";
        push({
          key: `rec:${r.id}:${day}:day`,
          category: "recurring",
          title: `${label} hoje: ${r.description}`,
          body: `${formatCurrency(r.amount)}. Não esqueça de registrar!`,
          at: atHour(day, hour),
          route: "/recurring",
        });
        if (r.type !== "income") {
          push({
            key: `rec:${r.id}:${day}:eve`,
            category: "recurring",
            title: `Vence amanhã: ${r.description}`,
            body: `Prepare o saldo de ${formatCurrency(r.amount)}.`,
            at: atHour(addDays(day, -1), EVE_HOUR),
            route: "/recurring",
          });
        }
      }
    }
  }

  // Veículos: vencimentos (30 e 7 dias antes e no dia; atrasado, um aviso por abertura) e troca de óleo.
  if (on.vehicles) {
    for (const v of input.vehicles) {
      const route = `/vehicle/${v.id}`;
      for (const r of input.vehicleReminders.filter((x) => x.vehicleId === v.id && !x.doneAt)) {
        const st = reminderStatus(r, today);
        if (st.state === "overdue") {
          push({
            key: `vrem:${r.id}:overdue`,
            category: "vehicles",
            title: `${r.title} · ${v.name}`,
            body: `${reminderLabel(st)} (${formatDate(r.dueDate)})`,
            at: nextOccurrence(now, hour),
            route,
          });
          continue;
        }
        for (const offset of [30, 7, 0]) {
          push({
            key: `vrem:${r.id}:${r.dueDate}:${offset}`,
            category: "vehicles",
            title: `${r.title} · ${v.name}`,
            body: `${whenLabel(offset)} (${formatDate(r.dueDate)})`,
            at: atHour(addDays(r.dueDate, -offset), hour),
            route,
          });
        }
      }
      const stats = computeVehicleStats(v, input.fuelings, input.oilChanges, input.vehicleExpenses);
      if (stats.oilStatus === "soon" || stats.oilStatus === "overdue") {
        push({
          key: `oil:${v.id}`,
          category: "vehicles",
          title: `Óleo · ${v.name}`,
          body: oilStatusInfo(stats).label,
          at: nextOccurrence(now, hour),
          route,
        });
      }
    }
  }

  // Escalas: véspera às 20h (um aviso por dia, listando os plantões) e antecedência antes de cada plantão.
  if (on.shifts) {
    const upcoming = input.shifts.filter((s) => s.date >= today && daysUntil(today, s.date) <= HORIZON_DAYS);
    if (settings.shiftEve) {
      const byDay = new Map<string, Shift[]>();
      for (const s of upcoming) byDay.set(s.date, [...(byDay.get(s.date) ?? []), s]);
      for (const [day, list] of byDay) {
        const sorted = [...list].sort((a, b) => a.startTime.localeCompare(b.startTime));
        push({
          key: `shift:${day}:eve`,
          category: "shifts",
          title: sorted.length === 1 ? "Amanhã: 1 plantão" : `Amanhã: ${sorted.length} plantões`,
          body: sorted.map((s) => `${s.name} ${s.startTime}–${s.endTime}`).join(" · "),
          at: atHour(addDays(day, -1), SHIFT_EVE_HOUR),
          route: "/(tabs)/shifts",
        });
      }
    }
    if (settings.shiftLeadMinutes > 0) {
      for (const s of upcoming) {
        const [h, m] = s.startTime.split(":").map(Number);
        const start = localDayStart(s.date);
        start.setHours(h ?? 0, m ?? 0, 0, 0);
        const lead = settings.shiftLeadMinutes;
        push({
          key: `shift:${s.id}:lead`,
          category: "shifts",
          title: `Plantão ${lead >= 60 && lead % 60 === 0 ? `em ${lead / 60}h` : `em ${lead} min`}`,
          body: `${s.name} · ${s.startTime}–${s.endTime}`,
          at: new Date(start.getTime() - lead * 60_000),
          route: "/(tabs)/shifts",
        });
      }
    }
  }

  // Cartões: 3 dias antes e no vencimento da fatura.
  if (on.cards) {
    for (const a of input.accounts) {
      if (a.kind !== "card" || a.archived || !a.dueDay) continue;
      for (let m = 0; m < 3; m++) {
        const day = monthDay(now, m, a.dueDay);
        for (const offset of [3, 0]) {
          push({
            key: `card:${a.id}:${day}:${offset}`,
            category: "cards",
            title: `Fatura ${a.name}`,
            body: `A fatura ${whenLabel(offset)} (${formatDate(day)}).`,
            at: atHour(addDays(day, -offset), hour),
            route: `/cards/${a.id}`,
          });
        }
      }
    }
  }

  const limit = now.getTime() + HORIZON_DAYS * 86_400_000;
  return out
    .filter((n) => n.at.getTime() > now.getTime() && n.at.getTime() <= limit)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_PLANNED);
}
