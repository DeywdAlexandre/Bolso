import type { TransactionType } from "../types";

export type AddTransactionArgs = {
  type: TransactionType;
  amount: number;
  category: string;
  description?: string;
  date?: string;
  /** Nome da conta (ex.: "Nubank"). Sem ela, usa a conta padrão. */
  account?: string;
  paymentMethod?: string;
  /** Compra parcelada no cartão: em quantas vezes. `amount` é o valor TOTAL da compra. */
  installments?: number;
};

export type CardInvoiceArgs = {
  /** Nome do cartão. */
  card: string;
  /** Mês de fechamento (YYYY-MM). Padrão: fatura atual. */
  month?: string;
};

export type ListTransactionsArgs = {
  type?: TransactionType | "all";
  category?: string;
  account?: string;
  month?: number;
  year?: number;
  limit?: number;
};

export type TransferArgs = {
  /** Nome da conta de origem. */
  from: string;
  /** Nome da conta de destino. */
  to: string;
  amount: number;
  date?: string;
  note?: string;
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
  account?: string;
  paymentMethod?: string;
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
