import { describe, expect, it } from "vitest";

import { completionPatch, daysUntil, mostUrgent, nextYear, reminderLabel, reminderStatus, sortReminders } from "./vehicleReminders";
import type { VehicleReminder } from "./types";

const r = (dueDate: string, extra: Partial<VehicleReminder> = {}): VehicleReminder => ({
  id: dueDate,
  vehicleId: "v",
  kind: "ipva",
  title: "IPVA",
  dueDate,
  createdAt: "x",
  ...extra,
});

describe("vehicleReminders", () => {
  it("daysUntil conta dias de calendário", () => {
    expect(daysUntil("2026-03-01", "2026-03-11")).toBe(10);
    expect(daysUntil("2026-03-11", "2026-03-01")).toBe(-10);
  });

  it("status: atrasado, em breve, ok e concluído", () => {
    const today = "2026-06-10";
    expect(reminderStatus(r("2026-06-09"), today).state).toBe("overdue");
    expect(reminderStatus(r("2026-06-10"), today)).toEqual({ state: "soon", days: 0 });
    expect(reminderStatus(r("2026-07-10"), today).state).toBe("soon");
    expect(reminderStatus(r("2026-07-11"), today).state).toBe("ok");
    expect(reminderStatus(r("2026-01-01", { doneAt: "x" }), today).state).toBe("done");
  });

  it("rótulos em português", () => {
    expect(reminderLabel({ state: "soon", days: 0 })).toBe("vence hoje");
    expect(reminderLabel({ state: "soon", days: 12 })).toBe("vence em 12 dias");
    expect(reminderLabel({ state: "overdue", days: -3 })).toBe("venceu há 3 dias");
    expect(reminderLabel({ state: "overdue", days: -1 })).toBe("venceu ontem");
  });

  it("nextYear avança um ano e ajusta 29/02", () => {
    expect(nextYear("2026-03-15")).toBe("2027-03-15");
    expect(nextYear("2028-02-29")).toBe("2029-02-28");
  });

  it("concluir lembrete anual avança o vencimento; o pontual fica concluído", () => {
    expect(completionPatch(r("2026-03-15", { repeatsYearly: true }))).toEqual({ dueDate: "2027-03-15" });
    expect(completionPatch(r("2026-03-15"), new Date("2026-03-16T10:00:00Z")).doneAt).toBe("2026-03-16T10:00:00.000Z");
  });

  it("ordena pendentes por data e concluídos por último; mostUrgent ignora concluídos", () => {
    const list = [r("2026-09-01"), r("2026-01-01", { doneAt: "x" }), r("2026-05-01")];
    expect(sortReminders(list).map((x) => x.dueDate)).toEqual(["2026-05-01", "2026-09-01", "2026-01-01"]);
    expect(mostUrgent(list)?.dueDate).toBe("2026-05-01");
    expect(mostUrgent([r("2026-01-01", { doneAt: "x" })])).toBeNull();
  });
});
