import type { Category, Recurring, Transaction, TransactionType, TankStatus } from "../types";

export type AddTransactionArgs = {
  type: TransactionType;
  amount: number;
  category: string;
  description?: string;
  date?: string;
};

export type ListTransactionsArgs = {
  type?: TransactionType | "all";
  category?: string;
  month?: number;
  year?: number;
  limit?: number;
};

export type SummaryArgs = {
  month?: number;
  year?: number;
};

export type AddRecurringArgs = {
  type: TransactionType;
  amount: number;
  category: string;
  description?: string;
  dayOfMonth: number;
};

export type DeleteTransactionArgs = {
  id?: string;
  description?: string;
};

export type AddVehicleExpenseArgs = {
  vehicleName: string;
  description: string;
  amount: number;
  odometer?: number;
  date?: string;
};

export type ToolHandlers = {
  addTransaction: (args: AddTransactionArgs) => Promise<{ ok: boolean; transaction?: Transaction; error?: string }>;
  listTransactions: (args: ListTransactionsArgs) => Promise<{ transactions: (Transaction & { categoryName: string })[]; total: number }>;
  getSummary: (args: SummaryArgs) => Promise<{
    period: string;
    income: number;
    expense: number;
    balance: number;
    byCategory: { category: string; type: TransactionType; total: number }[];
  }>;
  getCategories: () => Promise<{ income: { id: string; name: string }[]; expense: { id: string; name: string }[] }>;
  addRecurring: (args: AddRecurringArgs) => Promise<{ ok: boolean; recurring?: Recurring; error?: string }>;
  deleteTransaction: (args: DeleteTransactionArgs) => Promise<{ ok: boolean; deleted?: number; error?: string }>;
  addLoanContact: (args: { name: string }) => Promise<{ ok: boolean; contact?: any; error?: string }>;
  listLoanContacts: () => Promise<{ contacts: any[] }>;
  addLoan: (args: {
    contactName: string;
    direction: "lend" | "borrow";
    type: "monthly_interest" | "fixed_installments";
    amount: number;
    interestRate: number;
    description: string;
    installmentsCount?: number;
  }) => Promise<{ ok: boolean; loan?: any; error?: string }>;
  listLoans: (args: { contactName?: string }) => Promise<{ loans: any[] }>;
  addLoanPayment: (args: { loanDescription: string; amount: number; addToExtrat?: boolean }) => Promise<{ ok: boolean; payment?: any; error?: string }>;
  listVehicles: () => Promise<{ vehicles: any[] }>;
  addFueling: (args: {
    vehicleName: string;
    amount: number;
    liters: number;
    odometer: number;
    date?: string;
    tankStatus?: TankStatus;
  }) => Promise<{ ok: boolean; fueling?: any; error?: string }>;
  addOilChange: (args: {
    vehicleName: string;
    odometer: number;
    nextChangeOdometer: number;
    date?: string;
  }) => Promise<{ ok: boolean; oilChange?: any; error?: string }>;
  getVehicleStats: (args: { vehicleName: string }) => Promise<{ stats: any }>;
  listGoals: () => Promise<{ goals: any[] }>;
  addGoalDeposit: (args: { goalTitle: string; amount: number }) => Promise<{ ok: boolean; goal?: any; error?: string }>;
  generateLoanReport: (args: { loanDescription: string }) => Promise<{ ok: boolean; error?: string }>;
  addVehicleExpense: (args: AddVehicleExpenseArgs) => Promise<{ ok: boolean; expense?: any; error?: string }>;
};
