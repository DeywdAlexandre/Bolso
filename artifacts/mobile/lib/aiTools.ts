import type { Category, Recurring, Transaction } from "./types";
import { AI_TOOLS } from "./ai/toolDefinitions";
import { buildTransactionHandlers } from "./ai/handlers/transaction";
import { buildLoanHandlers } from "./ai/handlers/loan";
import { buildVehicleHandlers } from "./ai/handlers/vehicle";
import { buildGoalHandlers } from "./ai/handlers/goal";
import { buildShiftHandlers } from "./ai/handlers/shift";
import { buildBriefingHandlers } from "./ai/handlers/briefing";

export { AI_TOOLS } from "./ai/toolDefinitions";
export { SYSTEM_PROMPT } from "./ai/systemPrompt";
export type {
  AddTransactionArgs,
  ListTransactionsArgs,
  SummaryArgs,
  AddRecurringArgs,
  DeleteTransactionArgs,
  AddVehicleExpenseArgs,
  ToolHandlers,
} from "./ai/toolTypes";

export function buildToolHandlers(deps: {
  transactions: Transaction[];
  categories: Category[];
  recurring: Recurring[];
  addTransaction: (t: Transaction) => Promise<void>;
  addTransactionRaw: (t: Transaction) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  addRecurring: (r: Recurring) => Promise<void>;
  loanContacts: any[];
  loans: any[];
  loanPayments: any[];
  addLoanContact: (c: any) => Promise<any>;
  addLoan: (l: any) => Promise<any>;
  addLoanPayment: (p: any) => Promise<any>;
  vehicles: any[];
  fuelings: any[];
  oilChanges: any[];
  addFueling: (f: any) => Promise<any>;
  addOilChange: (o: any) => Promise<any>;
  goals: any[];
  goalDeposits: any[];
  addGoalDeposit: (d: any) => Promise<any>;
  vehicleExpenses: any[];
  addVehicleExpense: (e: any) => Promise<any>;
  shifts: any[];
  shiftRules: any[];
  addShift: (s: any) => Promise<any>;
  updateShift: (id: string, patch: any) => Promise<void>;
  addShiftRule: (r: any) => Promise<any>;
  generateShiftsFromRule: (ruleId: string, limitMonths?: number) => Promise<void>;
}): any {
  const transactionHandlers = buildTransactionHandlers({
    transactions: deps.transactions,
    categories: deps.categories,
    addTransaction: deps.addTransaction,
    removeTransaction: deps.removeTransaction,
    addRecurring: deps.addRecurring,
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
    ...loanHandlers,
    ...vehicleHandlers,
    ...goalHandlers,
    ...shiftHandlers,
    ...briefingHandlers,
  };
}
