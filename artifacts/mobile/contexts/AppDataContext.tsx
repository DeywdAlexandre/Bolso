import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import { BACKUP_VERSION, parseBackup } from "@/lib/backup";
import { maybeAutoSnapshot, saveSnapshot } from "@/lib/snapshots";
import { saveJson, STORAGE_KEYS, loadJson } from "@/lib/storage";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { 
  requestNotificationPermissions, 
  scheduleLoanReminder, 
  cancelAllNotifications,
  scheduleRecurringReminder 
} from "@/lib/notifications";
import type {
  Category,
  Fueling,
  OilChange,
  Recurring,
  Transaction,
  Vehicle,
  VehicleExpense,
  LoanContact,
  Loan,
  LoanPayment,
  Goal,
  GoalDeposit,
  Shift,
  ShiftRule,
  ShiftTemplate,
} from "@/lib/types";

// Importação dos hooks de domínio
import { useTransactionsState } from "@/hooks/state/useTransactionsState";
import { useVehiclesState } from "@/hooks/state/useVehiclesState";
import { useLoansState } from "@/hooks/state/useLoansState";
import { useGoalsState } from "@/hooks/state/useGoalsState";
import { useShiftsState } from "@/hooks/state/useShiftsState";

type AppDataContextValue = {
  ready: boolean;
  userName: string;
  setUserName: (name: string) => Promise<void>;
  transactions: Transaction[];
  recurring: Recurring[];
  categories: Category[];
  vehicles: Vehicle[];
  fuelings: Fueling[];
  oilChanges: OilChange[];
  vehicleExpenses: VehicleExpense[];
  loanContacts: LoanContact[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  goals: Goal[];
  goalDeposits: GoalDeposit[];
  shifts: Shift[];
  shiftRules: ShiftRule[];
  shiftTemplates: ShiftTemplate[];
  
  addTransaction: (input: Omit<Transaction, "id" | "createdAt">) => Promise<Transaction>;
  addTransactionRaw: (tx: Transaction) => Promise<void>;
  updateTransaction: (id: string, patch: Partial<Transaction>) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  addRecurring: (input: Omit<Recurring, "id" | "createdAt" | "active"> & { active?: boolean; isSubscription?: boolean }) => Promise<Recurring>;
  addRecurringRaw: (r: Recurring) => Promise<void>;
  updateRecurring: (id: string, patch: Partial<Recurring>) => Promise<void>;
  removeRecurring: (id: string) => Promise<void>;
  applyRecurring: (id: string) => Promise<void>;
  addCategory: (input: Omit<Category, "id">) => Promise<Category>;
  removeCategory: (id: string) => Promise<void>;
  addVehicle: (input: Omit<Vehicle, "id" | "createdAt">) => Promise<Vehicle>;
  updateVehicle: (id: string, patch: Partial<Vehicle>) => Promise<void>;
  removeVehicle: (id: string) => Promise<void>;
  addFueling: (input: Omit<Fueling, "id" | "createdAt">) => Promise<Fueling>;
  updateFueling: (id: string, patch: Partial<Fueling>) => Promise<void>;
  removeFueling: (id: string) => Promise<void>;
  addOilChange: (input: Omit<OilChange, "id" | "createdAt">) => Promise<OilChange>;
  updateOilChange: (id: string, patch: Partial<OilChange>) => Promise<void>;
  removeOilChange: (id: string) => Promise<void>;
  addVehicleExpense: (input: Omit<VehicleExpense, "id" | "createdAt">) => Promise<VehicleExpense>;
  removeVehicleExpense: (id: string) => Promise<void>;
  addLoanContact: (input: Omit<LoanContact, "id" | "createdAt">) => Promise<LoanContact>;
  updateLoanContact: (id: string, patch: Partial<LoanContact>) => Promise<void>;
  removeLoanContact: (id: string) => Promise<void>;
  addLoan: (input: Omit<Loan, "id" | "createdAt" | "status">) => Promise<Loan>;
  updateLoan: (id: string, patch: Partial<Loan>) => Promise<void>;
  removeLoan: (id: string) => Promise<void>;
  addLoanPayment: (input: Omit<LoanPayment, "id" | "createdAt">) => Promise<LoanPayment>;
  removeLoanPayment: (id: string) => Promise<void>;
  addGoal: (input: Omit<Goal, "id" | "createdAt" | "currentAmount">) => Promise<Goal>;
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  addGoalDeposit: (input: Omit<GoalDeposit, "id" | "createdAt" | "type"> & { type?: GoalDeposit["type"]; createTransaction?: boolean }) => Promise<GoalDeposit>;
  
  // SHIFTS FUNCTIONS
  addShiftRule: (input: Omit<ShiftRule, "id" | "createdAt">) => Promise<ShiftRule>;
  updateShiftRule: (id: string, patch: Partial<ShiftRule>) => Promise<void>;
  removeShiftRule: (id: string) => Promise<void>;
  addShift: (input: Omit<Shift, "id" | "createdAt">) => Promise<Shift>;
  addShiftRaw: (shift: Shift) => Promise<void>;
  updateShift: (id: string, patch: Partial<Shift>) => Promise<void>;
  removeShift: (id: string) => Promise<void>;
  generateShiftsFromRule: (ruleId: string, limitMonths?: number) => Promise<void>;

  // SHIFT TEMPLATES FUNCTIONS
  addShiftTemplate: (input: Omit<ShiftTemplate, "id" | "createdAt" | "updatedAt">) => Promise<ShiftTemplate>;
  updateShiftTemplate: (id: string, patch: Partial<ShiftTemplate>) => Promise<void>;
  removeShiftTemplate: (id: string) => Promise<void>;

  resetAll: () => Promise<void>;
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<void>;
};


type BackupPayload = {
  transactions?: Transaction[];
  recurring?: Recurring[];
  categories?: Category[];
  vehicles?: Vehicle[];
  fuelings?: Fueling[];
  oilChanges?: OilChange[];
  vehicleExpenses?: VehicleExpense[];
  loanContacts?: LoanContact[];
  loans?: Loan[];
  loanPayments?: LoanPayment[];
  goals?: Goal[];
  goalDeposits?: GoalDeposit[];
  shifts?: Shift[];
  shiftRules?: ShiftRule[];
  shiftTemplates?: ShiftTemplate[];
  userName?: string;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [userNameReady, setUserNameReady] = useState(false);
  const [userName, setUserNameState] = useState("");

  // Inicialização dos hooks específicos por domínio
  const txState = useTransactionsState();
  const vehState = useVehiclesState({
    addTransaction: txState.addTransaction,
    removeTransaction: txState.removeTransaction,
  });
  const loanState = useLoansState({
    removeTransaction: txState.removeTransaction,
  });
  const goalState = useGoalsState({
    addTransaction: txState.addTransaction,
  });
  const shiftState = useShiftsState();

  // Carregamento do Nome do Usuário
  useEffect(() => {
    (async () => {
      const name = await loadJson<string>(STORAGE_KEYS.userName, "");
      setUserNameState(name);
      setUserNameReady(true);
    })();
  }, []);

  const setUserName = useCallback(async (name: string) => {
    setUserNameState(name);
    await saveJson(STORAGE_KEYS.userName, name);
  }, []);

  // Sinalizador pronto consolidado
  const ready = 
    txState.ready && 
    vehState.ready && 
    loanState.ready && 
    goalState.ready && 
    shiftState.ready && 
    userNameReady;

  // Lógica central de agendamento de notificações
  useEffect(() => {
    if (!ready || Platform.OS === "web") return;

    (async () => {
      const granted = await requestNotificationPermissions();
      if (!granted) return;

      await cancelAllNotifications();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Agendar notificações de empréstimos ativos
      loanState.loans.forEach(async (loan) => {
        if (loan.status !== "active") return;

        const contact = loanState.loanContacts.find(c => c.id === loan.contactId);
        const payments = loanState.loanPayments.filter(p => p.loanId === loan.id);
        
        let nextDueDate: Date | null = null;
        let amountDue = 0;

        if (loan.type === "fixed_installments") {
          const totalContracted = loan.principalAmount * (1 + loan.interestRate / 100);
          const installmentValue = totalContracted / (loan.installmentsCount || 1);
          const paidTotal = payments.reduce((s, p) => s + p.amount, 0);
          const installmentsPaid = Math.floor(paidTotal / (installmentValue - 0.01));

          if (installmentsPaid < (loan.installmentsCount || 0)) {
            const date = new Date(loan.startDate);
            date.setMonth(date.getMonth() + installmentsPaid + 1);
            nextDueDate = date;
            amountDue = installmentValue;
          }
        } else {
            const start = new Date(loan.startDate);
            nextDueDate = new Date(today.getFullYear(), today.getMonth(), start.getDate());
            const paidPrincipal = payments.reduce((s, p) => s + p.principalPaid, 0);
            amountDue = ((loan.principalAmount - paidPrincipal) * loan.interestRate) / 100;
        }

        if (nextDueDate && amountDue > 0) {
          await scheduleLoanReminder(
            loan.id,
            contact?.name || "Empréstimo",
            loan.description,
            amountDue,
            nextDueDate.toISOString()
          );
        }
      });

      // Agendar Lembretes de Gastos Fixos / Assinaturas
      txState.recurring.forEach(async (r) => {
        if (!r.active) return;
        await scheduleRecurringReminder(
          r.description,
          r.amount,
          r.dayOfMonth,
          !!r.isSubscription
        );
      });
    })();
  }, [ready, loanState.loans, loanState.loanPayments, loanState.loanContacts, txState.recurring]);

  const resetAll = useCallback(async () => {
    await Promise.all([
      txState.clearState(),
      vehState.clearState(),
      loanState.clearState(),
      goalState.clearState(),
      shiftState.clearState(),
      saveJson(STORAGE_KEYS.userName, ""),
    ]);
    setUserNameState("");
  }, [txState.clearState, vehState.clearState, loanState.clearState, goalState.clearState, shiftState.clearState]);

  const exportData = useCallback(async () => {
    const payload = {
      version: BACKUP_VERSION,
      generated_at: new Date().toISOString(),
      app: "Prisma",
      payload: {
        transactions: txState.transactions,
        recurring: txState.recurring,
        categories: txState.categories,
        vehicles: vehState.vehicles,
        fuelings: vehState.fuelings,
        oilChanges: vehState.oilChanges,
        loanContacts: loanState.loanContacts,
        loans: loanState.loans,
        loanPayments: loanState.loanPayments,
        goals: goalState.goals,
        goalDeposits: goalState.goalDeposits,
        vehicleExpenses: vehState.vehicleExpenses,
        userName,
        shifts: shiftState.shifts,
        shiftRules: shiftState.shiftRules,
        shiftTemplates: shiftState.shiftTemplates,
      }
    };
    return JSON.stringify(payload);
  }, [
    txState.transactions, txState.recurring, txState.categories,
    vehState.vehicles, vehState.fuelings, vehState.oilChanges, vehState.vehicleExpenses,
    loanState.loanContacts, loanState.loans, loanState.loanPayments,
    goalState.goals, goalState.goalDeposits, userName,
    shiftState.shifts, shiftState.shiftRules, shiftState.shiftTemplates
  ]);

  // Cópia local automática semanal (as 3 mais recentes ficam em AsyncStorage).
  const exportDataRef = useRef(exportData);
  exportDataRef.current = exportData;
  useEffect(() => {
    if (!ready) return;
    void maybeAutoSnapshot(() => exportDataRef.current()).catch(() => {});
  }, [ready]);

  const importData = useCallback(async (json: string) => {
    try {
      // Valida tudo antes de gravar e guarda uma cópia do estado atual para desfazer.
      const data = parseBackup(json);
      await saveSnapshot(await exportData(), "before_import");

      // Os registros já foram validados (ids e listas); os demais campos seguem os tipos do app.
      const p = data.payload as unknown as BackupPayload;
      
      await Promise.all([
        txState.importState({
          transactions: p.transactions,
          recurring: p.recurring,
          categories: p.categories,
        }),
        vehState.importState({
          vehicles: p.vehicles,
          fuelings: p.fuelings,
          oilChanges: p.oilChanges,
          vehicleExpenses: p.vehicleExpenses,
        }),
        loanState.importState({
          loanContacts: p.loanContacts,
          loans: p.loans,
          loanPayments: p.loanPayments,
        }),
        goalState.importState({
          goals: p.goals,
          goalDeposits: p.goalDeposits,
        }),
        shiftState.importState({
          shifts: p.shifts,
          shiftRules: p.shiftRules,
          shiftTemplates: p.shiftTemplates,
        }),
        saveJson(STORAGE_KEYS.userName, p.userName || ""),
      ]);
      setUserNameState(p.userName || "");
    } catch (err) {
      console.error("Erro ao importar backup:", err);
      throw err;
    }
  }, [exportData, txState.importState, vehState.importState, loanState.importState, goalState.importState, shiftState.importState]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      ready,
      userName,
      setUserName,
      // Transações
      transactions: txState.transactions,
      recurring: txState.recurring,
      categories: txState.categories,
      addTransaction: txState.addTransaction,
      addTransactionRaw: txState.addTransactionRaw,
      updateTransaction: txState.updateTransaction,
      removeTransaction: txState.removeTransaction,
      addRecurring: txState.addRecurring,
      addRecurringRaw: txState.addRecurringRaw,
      updateRecurring: txState.updateRecurring,
      removeRecurring: txState.removeRecurring,
      applyRecurring: txState.applyRecurring,
      addCategory: txState.addCategory,
      removeCategory: txState.removeCategory,
      // Veículos
      vehicles: vehState.vehicles,
      fuelings: vehState.fuelings,
      oilChanges: vehState.oilChanges,
      vehicleExpenses: vehState.vehicleExpenses,
      addVehicle: vehState.addVehicle,
      updateVehicle: vehState.updateVehicle,
      removeVehicle: vehState.removeVehicle,
      addFueling: vehState.addFueling,
      updateFueling: vehState.updateFueling,
      removeFueling: vehState.removeFueling,
      addOilChange: vehState.addOilChange,
      updateOilChange: vehState.updateOilChange,
      removeOilChange: vehState.removeOilChange,
      addVehicleExpense: vehState.addVehicleExpense,
      removeVehicleExpense: vehState.removeVehicleExpense,
      // Empréstimos
      loanContacts: loanState.loanContacts,
      loans: loanState.loans,
      loanPayments: loanState.loanPayments,
      addLoanContact: loanState.addLoanContact,
      updateLoanContact: loanState.updateLoanContact,
      removeLoanContact: loanState.removeLoanContact,
      addLoan: loanState.addLoan,
      updateLoan: loanState.updateLoan,
      removeLoan: loanState.removeLoan,
      addLoanPayment: loanState.addLoanPayment,
      removeLoanPayment: loanState.removeLoanPayment,
      // Metas
      goals: goalState.goals,
      goalDeposits: goalState.goalDeposits,
      addGoal: goalState.addGoal,
      updateGoal: goalState.updateGoal,
      removeGoal: goalState.removeGoal,
      addGoalDeposit: goalState.addGoalDeposit,
      // Plantões
      shifts: shiftState.shifts,
      shiftRules: shiftState.shiftRules,
      shiftTemplates: shiftState.shiftTemplates,
      addShiftRule: shiftState.addShiftRule,
      updateShiftRule: shiftState.updateShiftRule,
      removeShiftRule: shiftState.removeShiftRule,
      addShift: shiftState.addShift,
      addShiftRaw: shiftState.addShiftRaw,
      updateShift: shiftState.updateShift,
      removeShift: shiftState.removeShift,
      generateShiftsFromRule: shiftState.generateShiftsFromRule,
      addShiftTemplate: shiftState.addShiftTemplate,
      updateShiftTemplate: shiftState.updateShiftTemplate,
      removeShiftTemplate: shiftState.removeShiftTemplate,
      // Backup & Reset
      resetAll,
      exportData,
      importData,
    }),
    [
      ready, userName, setUserName,
      txState, vehState, loanState, goalState, shiftState,
      resetAll, exportData, importData
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
