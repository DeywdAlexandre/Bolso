import type { BalanceSummary } from "./accounts";
import type {
  Account,
  Category,
  Fueling,
  Goal,
  GoalDeposit,
  Loan,
  LoanContact,
  LoanPayment,
  OilChange,
  Recurring,
  Shift,
  ShiftRule,
  Transaction,
  Transfer,
  Vehicle,
  VehicleExpense,
} from "./types";
import { buildTransactionHandlers } from "./ai/handlers/transaction";
import { buildLoanHandlers } from "./ai/handlers/loan";
import { buildVehicleHandlers } from "./ai/handlers/vehicle";
import { buildGoalHandlers } from "./ai/handlers/goal";
import { buildShiftHandlers } from "./ai/handlers/shift";
import { buildBriefingHandlers } from "./ai/handlers/briefing";
import { buildCardHandlers } from "./ai/handlers/card";

export { AI_TOOLS } from "./ai/toolDefinitions";
export { SYSTEM_PROMPT } from "./ai/systemPrompt";

/** Dados e ações do app que as ferramentas da IA podem usar. */
export type ToolDeps = {
  accounts: Account[];
  balances: BalanceSummary;
  addTransfer: (t: Omit<Transfer, "id" | "createdAt">) => Promise<Transfer>;
  transfers: Transfer[];
  defaultAccountId?: string;
  transactions: Transaction[];
  categories: Category[];
  recurring: Recurring[];
  addTransactionRaw: (t: Transaction) => Promise<void>;
  /** Cria a transação gerando id/createdAt e devolve o registro criado. */
  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => Promise<Transaction>;
  removeTransaction: (id: string) => Promise<void>;
  addRecurring: (r: Recurring) => Promise<void>;
  loanContacts: LoanContact[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  addLoanContact: (c: Omit<LoanContact, "id" | "createdAt">) => Promise<LoanContact>;
  addLoan: (l: Omit<Loan, "id" | "createdAt" | "status">) => Promise<Loan>;
  addLoanPayment: (p: Omit<LoanPayment, "id" | "createdAt">) => Promise<LoanPayment>;
  vehicles: Vehicle[];
  fuelings: Fueling[];
  oilChanges: OilChange[];
  addFueling: (f: Omit<Fueling, "id" | "createdAt">) => Promise<Fueling>;
  addOilChange: (o: Omit<OilChange, "id" | "createdAt">) => Promise<OilChange>;
  goals: Goal[];
  goalDeposits: GoalDeposit[];
  addGoalDeposit: (d: Omit<GoalDeposit, "id" | "createdAt" | "type"> & { createTransaction?: boolean }) => Promise<GoalDeposit>;
  vehicleExpenses: VehicleExpense[];
  addVehicleExpense: (e: Omit<VehicleExpense, "id" | "createdAt">) => Promise<VehicleExpense>;
  shifts: Shift[];
  shiftRules: ShiftRule[];
  addShift: (s: Omit<Shift, "id" | "createdAt">) => Promise<Shift>;
  updateShift: (id: string, patch: Partial<Shift>) => Promise<void>;
  addShiftRule: (r: Omit<ShiftRule, "id" | "createdAt">) => Promise<ShiftRule>;
  generateShiftsFromRule: (ruleId: string, limitMonths?: number) => Promise<void>;
};

export function buildToolHandlers(deps: ToolDeps) {
  const cardHandlers = buildCardHandlers({
    accounts: deps.accounts,
    categories: deps.categories,
    transactions: deps.transactions,
    transfers: deps.transfers,
  });

  const transactionHandlers = buildTransactionHandlers({
    cardSummaries: cardHandlers.summarizeCards,
    transactions: deps.transactions,
    categories: deps.categories,
    addTransaction: deps.addTransactionRaw,
    removeTransaction: deps.removeTransaction,
    addRecurring: deps.addRecurring,
    accounts: deps.accounts,
    balances: deps.balances,
    addTransfer: deps.addTransfer,
    defaultAccountId: deps.defaultAccountId,
  });

  const loanHandlers = buildLoanHandlers({
    loanContacts: deps.loanContacts,
    loans: deps.loans,
    loanPayments: deps.loanPayments,
    addLoanContact: deps.addLoanContact,
    addLoan: deps.addLoan,
    addLoanPayment: deps.addLoanPayment,
    addTransactionRaw: deps.addTransactionRaw,
  });

  const vehicleHandlers = buildVehicleHandlers({
    vehicles: deps.vehicles,
    fuelings: deps.fuelings,
    oilChanges: deps.oilChanges,
    vehicleExpenses: deps.vehicleExpenses,
    addFueling: deps.addFueling,
    addOilChange: deps.addOilChange,
    addVehicleExpense: deps.addVehicleExpense,
  });

  const goalHandlers = buildGoalHandlers({
    goals: deps.goals,
    goalDeposits: deps.goalDeposits,
    addGoalDeposit: deps.addGoalDeposit,
  });

  const shiftHandlers = buildShiftHandlers({
    shifts: deps.shifts,
    shiftRules: deps.shiftRules,
    addShift: deps.addShift,
    updateShift: deps.updateShift,
    addShiftRule: deps.addShiftRule,
    generateShiftsFromRule: deps.generateShiftsFromRule,
    addTransaction: deps.addTransaction,
    removeTransaction: deps.removeTransaction,
  });

  const briefingHandlers = buildBriefingHandlers({
    shifts: deps.shifts,
    recurring: deps.recurring,
    loans: deps.loans,
    goals: deps.goals,
  });

  return {
    ...transactionHandlers,
    getCardInvoice: cardHandlers.getCardInvoice,
    ...loanHandlers,
    ...vehicleHandlers,
    ...goalHandlers,
    ...shiftHandlers,
    ...briefingHandlers,
  };
}
