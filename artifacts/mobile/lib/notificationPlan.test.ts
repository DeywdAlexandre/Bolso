import { describe, expect, it } from "vitest";

import { buildNotificationPlan, MAX_PLANNED, type PlanInput } from "./notificationPlan";
import { DEFAULT_NOTIFICATION_SETTINGS, normalizeNotificationSettings, type NotificationSettings } from "./notificationSettings";
import { toIsoDay } from "./format";

const now = new Date(2026, 5, 10, 10, 0, 0); // 10/06/2026 10:00 (local)

const empty: PlanInput = {
  loans: [],
  loanPayments: [],
  loanContacts: [],
  recurring: [],
  vehicles: [],
  fuelings: [],
  oilChanges: [],
  vehicleExpenses: [],
  vehicleReminders: [],
  shifts: [],
  accounts: [],
};

const settings = (over: Partial<NotificationSettings> = {}): NotificationSettings => ({
  ...DEFAULT_NOTIFICATION_SETTINGS,
  categories: { ...DEFAULT_NOTIFICATION_SETTINGS.categories },
  ...over,
});

const day = (d: Date) => toIsoDay(d);
const hm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

describe("buildNotificationPlan", () => {
  it("desligado não gera nada", () => {
    const input = { ...empty, recurring: [{ id: "r", type: "expense", amount: 10, categoryId: "c", description: "Luz", dayOfMonth: 15, active: true, createdAt: "x" } as const] };
    expect(buildNotificationPlan(input, settings({ enabled: false }), now)).toEqual([]);
  });

  it("gasto fixo: véspera às 18h e dia na hora escolhida, só no futuro", () => {
    const input: PlanInput = {
      ...empty,
      recurring: [{ id: "r", type: "expense", amount: 50, categoryId: "c", description: "Luz", dayOfMonth: 15, active: true, createdAt: "x" }],
    };
    const plan = buildNotificationPlan(input, settings({ hour: 8 }), now);
    const first = plan.slice(0, 2);
    expect(first.map((n) => [day(n.at), hm(n.at)])).toEqual([
      ["2026-06-14", "18:00"],
      ["2026-06-15", "08:00"],
    ]);
    expect(plan.every((n) => n.at > now)).toBe(true);
  });

  it("gasto fixo do dia 31 cai no último dia de fevereiro/abril", () => {
    const input: PlanInput = {
      ...empty,
      recurring: [{ id: "r", type: "expense", amount: 5, categoryId: "c", description: "X", dayOfMonth: 31, active: true, createdAt: "x" }],
    };
    const days = buildNotificationPlan(input, settings(), new Date(2026, 1, 1, 10)).map((n) => day(n.at));
    expect(days).toContain("2026-02-28");
  });

  it("receita fixa não tem aviso de véspera; inativo é ignorado", () => {
    const input: PlanInput = {
      ...empty,
      recurring: [
        { id: "a", type: "income", amount: 1, categoryId: "c", description: "Salário", dayOfMonth: 20, active: true, createdAt: "x" },
        { id: "b", type: "expense", amount: 1, categoryId: "c", description: "Off", dayOfMonth: 20, active: false, createdAt: "x" },
      ],
    };
    const plan = buildNotificationPlan(input, settings(), now);
    expect(plan.map((n) => n.key)).toEqual(["rec:a:2026-06-20:day", "rec:a:2026-07-20:day"]);
  });

  it("categoria desligada some do plano", () => {
    const input: PlanInput = {
      ...empty,
      recurring: [{ id: "r", type: "expense", amount: 50, categoryId: "c", description: "Luz", dayOfMonth: 15, active: true, createdAt: "x" }],
    };
    const s = settings();
    s.categories.recurring = false;
    expect(buildNotificationPlan(input, s, now)).toEqual([]);
  });

  it("empréstimo a vencer gera véspera e dia; atrasado gera um aviso na próxima hora", () => {
    const loan = {
      id: "l1", contactId: "c1", type: "monthly_interest" as const, direction: "lend" as const, description: "Moto",
      principalAmount: 1000, interestRate: 10, startDate: "2026-05-20", status: "active" as const, createdAt: "x",
    };
    const contacts = [{ id: "c1", name: "João", createdAt: "x" }];
    const plan = buildNotificationPlan({ ...empty, loans: [loan], loanContacts: contacts }, settings(), now);
    expect(plan[0]!.key).toBe("loan:l1:2026-06-20:eve");
    expect(plan[0]!.title).toContain("Receber de João");
    expect(plan[0]!.route).toBe("/loans/loan-detail/l1");

    const late = buildNotificationPlan({ ...empty, loans: [{ ...loan, startDate: "2026-04-01" }], loanContacts: contacts }, settings(), now);
    expect(late).toHaveLength(1);
    expect(late[0]!.key).toBe("loan:l1:overdue");
    expect(day(late[0]!.at)).toBe("2026-06-11"); // 9h de hoje já passou (são 10h)
  });

  it("vencimento de veículo: 30, 7 e 0 dias antes; atrasado: um aviso", () => {
    const v = { id: "v1", name: "Celta", fuelType: "gasolina" as const, createdAt: "x" };
    const rem = (id: string, dueDate: string) => ({ id, vehicleId: "v1", kind: "ipva" as const, title: "IPVA", dueDate, createdAt: "x" });
    const plan = buildNotificationPlan({ ...empty, vehicles: [v], vehicleReminders: [rem("a", "2026-07-20")] }, settings(), now);
    expect(plan.map((n) => day(n.at))).toEqual(["2026-06-20", "2026-07-13", "2026-07-20"]);

    const late = buildNotificationPlan({ ...empty, vehicles: [v], vehicleReminders: [rem("b", "2026-06-01")] }, settings(), now);
    expect(late.map((n) => n.key)).toEqual(["vrem:b:overdue"]);
    expect(late[0]!.body).toContain("venceu há 9 dias");
  });

  it("óleo perto de vencer gera aviso", () => {
    const v = { id: "v1", name: "Celta", fuelType: "gasolina" as const, createdAt: "x" };
    const oil = { id: "o", vehicleId: "v1", date: "2026-03-01", odometer: 1000, nextChangeKm: 1300, createdAt: "x" };
    const fu = { id: "f", vehicleId: "v1", date: "2026-06-01", odometer: 1200, liters: 10, pricePerLiter: 5, totalCost: 50, tankStatus: "full" as const, createdAt: "x" };
    const plan = buildNotificationPlan({ ...empty, vehicles: [v], oilChanges: [oil], fuelings: [fu] }, settings(), now);
    expect(plan.map((n) => n.key)).toEqual(["oil:v1"]);
  });

  it("escalas: véspera agrupada às 20h e aviso antes do início", () => {
    const sh = (id: string, date: string, start: string, end: string) => ({ id, name: "UTI", type: "ordinary" as const, date, startTime: start, endTime: end, createdAt: "x" });
    const plan = buildNotificationPlan({ ...empty, shifts: [sh("a", "2026-06-12", "07:00", "19:00"), sh("b", "2026-06-12", "19:00", "23:00")] }, settings(), now);
    const eve = plan.find((n) => n.key === "shift:2026-06-12:eve")!;
    expect([day(eve.at), hm(eve.at)]).toEqual(["2026-06-11", "20:00"]);
    expect(eve.title).toBe("Amanhã: 2 plantões");
    const lead = plan.find((n) => n.key === "shift:a:lead")!;
    expect([day(lead.at), hm(lead.at)]).toEqual(["2026-06-12", "06:00"]);
    expect(lead.title).toBe("Plantão em 1h");

    const off = buildNotificationPlan({ ...empty, shifts: [sh("a", "2026-06-12", "07:00", "19:00")] }, settings({ shiftEve: false, shiftLeadMinutes: 0 }), now);
    expect(off).toEqual([]);
  });

  it("cartão: 3 dias antes e no vencimento", () => {
    const card = { id: "c1", name: "Nubank", kind: "card" as const, color: "#fff", initialBalance: 0, balanceDate: "2026-01-01", dueDay: 20, createdAt: "x" };
    const plan = buildNotificationPlan({ ...empty, accounts: [card] }, settings(), now);
    expect(plan.slice(0, 2).map((n) => day(n.at))).toEqual(["2026-06-17", "2026-06-20"]);
    expect(buildNotificationPlan({ ...empty, accounts: [{ ...card, archived: true }] }, settings(), now)).toEqual([]);
  });

  it("limita a quantidade e mantém a ordem cronológica", () => {
    const recurring = Array.from({ length: 80 }, (_, i) => ({
      id: `r${i}`, type: "expense" as const, amount: 1, categoryId: "c", description: `G${i}`, dayOfMonth: (i % 28) + 1, active: true, createdAt: "x",
    }));
    const plan = buildNotificationPlan({ ...empty, recurring }, settings(), now);
    expect(plan.length).toBe(MAX_PLANNED);
    for (let i = 1; i < plan.length; i++) expect(plan[i]!.at.getTime()).toBeGreaterThanOrEqual(plan[i - 1]!.at.getTime());
  });
});

describe("normalizeNotificationSettings", () => {
  it("preenche padrões e rejeita valores inválidos", () => {
    expect(normalizeNotificationSettings(null)).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
    const s = normalizeNotificationSettings({ enabled: false, hour: 99, categories: { loans: false, x: true }, shiftLeadMinutes: -5 });
    expect(s.enabled).toBe(false);
    expect(s.hour).toBe(9);
    expect(s.categories.loans).toBe(false);
    expect(s.categories.cards).toBe(true);
    expect(s.shiftLeadMinutes).toBe(60);
  });
});
