import { describe, expect, it } from "vitest";

import { DEFAULT_MODEL, describeOpenRouterError, migrateModel, SUGGESTED_MODELS } from "./models";

describe("modelo padrão", () => {
  it("é o Claude Haiku 5.5 e aparece primeiro na lista", () => {
    expect(DEFAULT_MODEL).toBe("anthropic/claude-haiku-5.5");
    expect(SUGGESTED_MODELS[0]!.value).toBe(DEFAULT_MODEL);
  });

  it("migra só o padrão antigo; escolhas do usuário são preservadas", () => {
    expect(migrateModel("openai/gpt-4o-mini")).toBe(DEFAULT_MODEL);
    expect(migrateModel(undefined)).toBe(DEFAULT_MODEL);
    expect(migrateModel("")).toBe(DEFAULT_MODEL);
    expect(migrateModel("deepseek/deepseek-chat")).toBe("deepseek/deepseek-chat");
    expect(migrateModel(DEFAULT_MODEL)).toBe(DEFAULT_MODEL);
  });
});

describe("describeOpenRouterError", () => {
  it("explica modelo não encontrado, chave inválida e falta de créditos", () => {
    expect(describeOpenRouterError(404, "x/y", "")).toContain('"x/y"');
    expect(describeOpenRouterError(401, "m", "")).toMatch(/chave/i);
    expect(describeOpenRouterError(402, "m", "")).toMatch(/créditos/i);
    expect(describeOpenRouterError(500, "m", "boom")).toBe("OpenRouter retornou 500. boom");
  });
});
