import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEYS = {
  transactions: "@bolso/transactions/v1",
  recurring: "@bolso/recurring/v1",
  categories: "@bolso/categories/v1",
  settings: "@bolso/settings/v1",
  chat: "@bolso/chat/v1",
  vehicles: "@bolso/vehicles/v1",
  fuelings: "@bolso/fuelings/v1",
  oilChanges: "@bolso/oilchanges/v1",
  loanContacts: "@bolso/loan_contacts/v1",
  loans: "@bolso/loans/v1",
  loanPayments: "@bolso/loan_payments/v1",
  userName: "@bolso/user_name/v1",
  goals: "@bolso/goals/v1",
  goalDeposits: "@bolso/goal_deposits/v1",
  vehicleExpenses: "@bolso/vehicle_expenses/v1",
  shifts: "@bolso/shifts/v1",
  shiftRules: "@bolso/shiftrules/v1",
  shiftTemplates: "@bolso/shifttemplates/v1",
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
