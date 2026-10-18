import { describe, expect, it } from "vitest";

import { BackupError, parseBackup } from "./backup";

const valid = (over: object = {}) =>
  JSON.stringify({ app: "Prisma", version: 1, payload: { transactions: [{ id: "t1", amount: 10 }] }, ...over });

describe("parseBackup", () => {
  it("aceita backup válido e o formato antigo (Bolso)", () => {
    expect(parseBackup(valid()).payload.transactions).toHaveLength(1);
    expect(parseBackup(valid({ app: "Bolso" })).app).toBe("Bolso");
  });

  it("rejeita JSON inválido, app errado e versão futura", () => {
    expect(() => parseBackup("{")).toThrow(BackupError);
    expect(() => parseBackup(valid({ app: "Outro" }))).toThrow(/não é um backup do Prisma/);
    expect(() => parseBackup(valid({ version: 99 }))).toThrow(/versão superior/);
  });

  it("aceita backups com e sem contas", () => {
    expect(parseBackup(valid({ payload: { accounts: [{ id: "a1", name: "Nubank" }] } })).payload.accounts).toHaveLength(1);
    expect(parseBackup(valid()).payload.accounts).toBeUndefined();
    expect(() => parseBackup(valid({ payload: { accounts: [{ name: "sem id" }] } }))).toThrow(BackupError);
  });

  it("rejeita listas com registros sem id ou tipos errados", () => {
    expect(() => parseBackup(valid({ payload: { transactions: [{ amount: 1 }] } }))).toThrow(BackupError);
    expect(() => parseBackup(valid({ payload: { loans: "x" } }))).toThrow(BackupError);
    expect(() => parseBackup(valid({ payload: undefined }))).toThrow(BackupError);
  });
});
