import { describe, expect, it } from "vitest";

import { addDaysIso, formatDate, fromIsoDay, getRecentTransactions, isSameMonth, isSameYear, localDayStart, parseAmountInput, toIsoDay } from "./format";
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

describe("formatDate", () => {
  it("data sem hora mostra o mesmo dia em qualquer fuso", () => {
    expect(formatDate("2026-09-10")).toBe("10/09/2026");
    expect(formatDate("2026-01-01")).toBe("01/01/2026");
  });
  it("data com hora continua funcionando", () => {
    expect(formatDate("2026-09-10T15:00:00")).toBe("10/09/2026");
    expect(formatDate("lixo")).toBe("");
  });
});

describe("isSameMonth e isSameYear", () => {
  it("não sofrem com fuso horário negativo (ex: UTC-3)", () => {
    // 2026-05-01 em UTC é meia-noite; em UTC-3 new Date viraria 30/04
    expect(isSameMonth("2026-05-01", 4, 2026)).toBe(true);
    expect(isSameMonth("2026-05-01T00:00:00.000Z", 4, 2026)).toBe(true);
    expect(isSameMonth("2026-04-30", 4, 2026)).toBe(false);
    expect(isSameYear("2026-01-01", 2026)).toBe(true);
  });
});

describe("getRecentTransactions", () => {
  const sampleTransactions = [
    { id: "futura_2", description: "TV (3/3)", date: "2027-01-10T12:00:00.000Z", createdAt: "2026-11-10T14:00:00.000Z" },
    { id: "futura_1", description: "TV (2/3)", date: "2026-12-10T12:00:00.000Z", createdAt: "2026-11-10T14:00:00.000Z" },
    { id: "hoje_2", description: "Almoço", date: "2026-11-14T13:00:00.000Z", createdAt: "2026-11-14T13:05:00.000Z" },
    { id: "hoje_1", description: "Café", date: "2026-11-14T08:00:00.000Z", createdAt: "2026-11-14T08:05:00.000Z" },
    { id: "passada", description: "TV (1/3)", date: "2026-11-10T12:00:00.000Z", createdAt: "2026-11-10T14:00:00.000Z" },
    { id: "antiga", description: "Mercado", date: "2026-11-01T10:00:00.000Z", createdAt: "2026-11-01T10:00:00.000Z" },
  ];

  it("exclui parcelas e lançamentos futuros posteriores a asOf", () => {
    const recent = getRecentTransactions(sampleTransactions, 10, "2026-11-14");
    const ids = recent.map((t) => t.id);
    expect(ids).not.toContain("futura_1");
    expect(ids).not.toContain("futura_2");
    expect(ids).toEqual(["hoje_2", "hoje_1", "passada", "antiga"]);
  });

  it("desempata no mesmo dia pelo createdAt mais recente", () => {
    const recent = getRecentTransactions(sampleTransactions, 2, "2026-11-14");
    expect(recent[0]?.id).toBe("hoje_2");
    expect(recent[1]?.id).toBe("hoje_1");
  });

  it("respeita o limite informado", () => {
    const recent = getRecentTransactions(sampleTransactions, 1, "2026-11-14");
    expect(recent).toHaveLength(1);
    expect(recent[0]?.id).toBe("hoje_2");
  });

  it("retorna lista vazia se todas as transações forem futuras", () => {
    const futureOnly = [
      { id: "f1", date: "2027-01-01", createdAt: "2026-11-14" },
    ];
    expect(getRecentTransactions(futureOnly, 5, "2026-11-14")).toEqual([]);
  });
});
