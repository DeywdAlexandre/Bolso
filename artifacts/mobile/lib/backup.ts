import { z } from "zod";

export const BACKUP_VERSION = 1;
/** "Bolso" era o nome anterior do app; backups antigos continuam válidos. */
const ACCEPTED_APP_NAMES = ["Prisma", "Bolso"];

const records = z.array(z.object({ id: z.string() }).passthrough()).optional();

const backupSchema = z.object({
  app: z.string(),
  version: z.number().int().positive(),
  generated_at: z.string().optional(),
  payload: z
    .object({
      transactions: records,
      recurring: records,
      categories: records,
      vehicles: records,
      fuelings: records,
      oilChanges: records,
      vehicleExpenses: records,
      loanContacts: records,
      loans: records,
      loanPayments: records,
      goals: records,
      goalDeposits: records,
      shifts: records,
      shiftRules: records,
      shiftTemplates: records,
      accounts: records,
      transfers: records,
      userName: z.string().optional(),
    })
    .passthrough(),
});

export type BackupFile = z.infer<typeof backupSchema>;

export class BackupError extends Error {}

/** Valida o conteúdo de um arquivo de backup antes de qualquer gravação. */
export function parseBackup(json: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new BackupError("O arquivo não é um JSON válido.");
  }

  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    throw new BackupError("Arquivo de backup inválido ou corrompido.");
  }
  const data = parsed.data;
  if (!ACCEPTED_APP_NAMES.includes(data.app)) {
    throw new BackupError("Este arquivo não é um backup do Prisma.");
  }
  if (data.version > BACKUP_VERSION) {
    throw new BackupError(
      `Backup de uma versão superior (${data.version}). Por favor, atualize o app.`,
    );
  }
  return data;
}
