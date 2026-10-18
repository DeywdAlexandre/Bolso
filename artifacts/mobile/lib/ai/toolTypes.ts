import type { TransactionType } from "../types";

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
