import { describe, expect, it } from "vitest";

import { buildInvoicePrompt } from "./invoicePrompt";
import type { Category } from "./types";

const categories: Category[] = [
  { id: "a", name: "Alimentação", icon: "x", color: "#fff", type: "expense" },
  { id: "b", name: "Salário", icon: "x", color: "#fff", type: "income" },
  { id: "c", name: "Lazer", icon: "x", color: "#fff", type: "expense" },
];

describe("buildInvoicePrompt", () => {
  const prompt = buildInvoicePrompt({ name: "Nubank", closingDay: 25, dueDay: 5 }, categories);

  it("cita o cartão e só as categorias de gasto", () => {
    expect(prompt).toContain('cartão "Nubank"');
    expect(prompt).toContain("Alimentação, Lazer");
    expect(prompt).not.toContain("Salário");
  });

  it("pede só JSON, com parcelas, estornos negativos e sem linhas de resumo", () => {
    expect(prompt).toMatch(/SOMENTE com um JSON/);
    expect(prompt).toMatch(/"installment"/);
    expect(prompt).toMatch(/NEGATIVO para estornos/);
    expect(prompt).toMatch(/NÃO inclua linhas de resumo/);
    expect(prompt).toMatch(/fecha no dia 25 e vence no dia 5/);
  });
});
