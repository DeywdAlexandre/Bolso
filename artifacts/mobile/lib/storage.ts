import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEYS = {
  transactions: "@prisma/transactions/v1",
  recurring: "@prisma/recurring/v1",
  categories: "@prisma/categories/v1",
  settings: "@prisma/settings/v1",
  chat: "@prisma/chat/v1",
  vehicles: "@prisma/vehicles/v1",
  fuelings: "@prisma/fuelings/v1",
  oilChanges: "@prisma/oilchanges/v1",
  loanContacts: "@prisma/loan_contacts/v1",
  loans: "@prisma/loans/v1",
  loanPayments: "@prisma/loan_payments/v1",
  userName: "@prisma/user_name/v1",
  goals: "@prisma/goals/v1",
  goalDeposits: "@prisma/goal_deposits/v1",
  vehicleExpenses: "@prisma/vehicle_expenses/v1",
  vehicleReminders: "@prisma/vehicle_reminders/v1",
  shifts: "@prisma/shifts/v1",
  shiftRules: "@prisma/shiftrules/v1",
  shiftTemplates: "@prisma/shifttemplates/v1",
  snapshots: "@prisma/snapshots/v1",
  accounts: "@prisma/accounts/v1",
  transfers: "@prisma/transfers/v1",
  installDismissedAt: "@prisma/install_dismissed_at/v1",
} as const;

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

const LEGACY_PREFIX = "@bolso/";
const CURRENT_PREFIX = "@prisma/";

/**
 * Migra dados salvos sob o nome antigo do app ("@bolso/") para "@prisma/".
 * Só copia quando a chave nova ainda não existe e mantém a antiga como
 * rede de segurança. Deve rodar antes de qualquer provider ler o storage.
 */
export async function migrateLegacyStorage(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const legacy = keys.filter((k) => k.startsWith(LEGACY_PREFIX));
    if (legacy.length === 0) return;
    const existing = new Set(keys);
    const pairs = await AsyncStorage.multiGet(legacy);
    const toWrite: [string, string][] = [];
    for (const [key, value] of pairs) {
      const next = CURRENT_PREFIX + key.slice(LEGACY_PREFIX.length);
      if (value != null && !existing.has(next)) toWrite.push([next, value]);
    }
    if (toWrite.length > 0) await AsyncStorage.multiSet(toWrite);
  } catch {
    // ignore
  }
}
