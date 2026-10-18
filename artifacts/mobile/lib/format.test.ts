import { describe, expect, it } from "vitest";

import { addDaysIso, fromIsoDay, localDayStart, parseAmountInput, toIsoDay } from "./format";
import { roundMoney, sumMoney } from "./money";

describe("format", () => {
  it("parseAmountInput interpreta dígitos como centavos", () => {
    expect(parseAmountInput("")).toBe(0);
    expect(parseAmountInput("1")).toBe(0.01);
    expect(parseAmountInput("R$ 1.234,56")).toBe(1234.56);
  });

  it("datas ISO de dia não sofrem deslocamento de fuso", () => {
    expect(toIsoDay(fromIsoDay("2026-03-01"))).toBe("2026-03-01");
    expect(addDaysIso("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("money", () => {
  it("evita resíduos de ponto flutuante", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(roundMoney(1.005)).toBe(1.01);
  });
});

describe("localDayStart", () => {
  it("cria meia-noite local do dia, sem deslocar o dia da semana", () => {
    const d = localDayStart("2026-03-05"); // quinta-feira
    expect(d.getDay()).toBe(4);
    expect(d.getHours()).toBe(0);
    expect(toIsoDay(d)).toBe("2026-03-05");
    expect(toIsoDay(localDayStart("2026-03-05T23:30:00.000Z"))).toBe("2026-03-05");
  });
});
