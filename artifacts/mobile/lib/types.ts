export type TransactionType = "income" | "expense";

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  isDefault?: boolean;
  updatedAt?: string; // ISO
};

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  description: string;
  date: string;
  recurringId?: string;
  createdAt: string;
  updatedAt?: string; // ISO
};

export type Recurring = {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  description: string;
  dayOfMonth: number;
  active: boolean;
  isSubscription?: boolean;
  lastApplied?: string;
  createdAt: string;
  updatedAt?: string; // ISO
};

// --- NOVOS TIPOS PARA METAS ---
export type GoalType = "target_value" | "monthly_habit";

export type Goal = {
  id: string;
  name: string;
  type: GoalType;
  targetAmount?: number;
  monthlyAmount?: number;
  targetDate?: string; // ISO
  currentAmount: number;
  isYielding: boolean;
  estimatedYield: number; // Porcentagem mensal (ex: 1.0)
  icon: string;
  color: string;
  lastInterestAccrual?: string; // ISO
  createdAt: string;
  updatedAt?: string; // ISO
};

export type GoalDepositType = "deposit" | "yield";

export type GoalDeposit = {
  id: string;
  goalId: string;
  amount: number;
  type: GoalDepositType;
  date: string;
  transactionId?: string;
  createdAt: string;
  updatedAt?: string; // ISO
};
// ------------------------------

export type ThemeMode = "system" | "light" | "dark";

export type TabName = "index" | "vehicles" | "goals" | "loans" | "shifts";

export type Settings = {
  model: string;
  currency: string;
  themeMode: ThemeMode;
  biometricsEnabled?: boolean;
  activeTabs?: TabName[];
  googleCalendarLinked?: boolean;
  googleSheetsLinked?: boolean;
  lastSyncAt?: string;
  googleSheetsId?: string;
  googleCalendarId?: string;
  googleClientId?: string;
  googleClientSecret?: string;
};

export type ChatRole = "user" | "assistant" | "system" | "tool";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  name?: string;
  createdAt: number;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type FuelType = "gasolina" | "etanol" | "diesel" | "gnv" | "flex";

export type Vehicle = {
  id: string;
  name: string;
  plate?: string;
  fuelType: FuelType;
  color?: string;
  icon?: string;
  initialOdometer?: number;
  createdAt: string;
  updatedAt?: string; // ISO
};

export type TankStatus = "full" | "reserve" | "partial";

export type Fueling = {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  tankStatus: TankStatus;
  notes?: string;
  expenseTransactionId?: string;
  createdAt: string;
  updatedAt?: string; // ISO
};

export type OilChange = {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  nextChangeKm: number;
  cost?: number;
  notes?: string;
  expenseTransactionId?: string;
  createdAt: string;
  updatedAt?: string; // ISO
};

export type LoanContact = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  photo?: string;
  createdAt: string;
  updatedAt?: string; // ISO
};

export type LoanType = "monthly_interest" | "fixed_installments";
export type LoanDirection = "lend" | "borrow"; // lend = emprestei, borrow = peguei

export type Loan = {
  id: string;
  contactId: string;
  type: LoanType;
  direction: LoanDirection;
  description: string;
  principalAmount: number;
  interestRate: number; // Porcentagem (ex: 10 para 10%)
  installmentsCount?: number; // Para fixed_installments
  startDate: string;
  status: "active" | "completed";
  initialTransactionId?: string; // ID da transação inicial no extrato principal
  createdAt: string;
  updatedAt?: string; // ISO
};

export type LoanPayment = {
  id: string;
  loanId: string;
  amount: number;
  interestPaid: number;
  principalPaid: number;
  date: string;
  isMainExtratEntry: boolean;
  transactionId?: string; // ID da transação vinculada no extrato principal
  createdAt: string;
  updatedAt?: string; // ISO
};

export type VehicleExpense = {
  id: string;
  vehicleId: string;
  date: string;
  description: string;
  amount: number;
  odometer?: number;
  transactionId?: string;
  createdAt: string;
  updatedAt?: string; // ISO
};

// --- NOVOS TIPOS PARA ESCALAS DE SERVIÇO (SHIFTS) ---
export type ShiftRecurrenceType = "rotative" | "weekly" | "fixed_dates";

export type ShiftRule = {
  id: string;
  name: string;
  type: "ordinary" | "extra";
  value?: number; // Opcional (valor por plantão, se extra)
  recurrenceType: ShiftRecurrenceType;
  workHours?: number; // Horas de trabalho para rotativo (ex: 12)
  offHours?: number;  // Horas de folga para rotativo (ex: 36)
  startDate: string;  // Data de início do ciclo (ISO)
  weekDays?: number[]; // Dias da semana (0-6) para escala fixa semanal
  startTime: string; // Ex: "07:00"
  endTime: string;   // Ex: "19:00"
  color?: string;
  createdAt: string;
  updatedAt?: string; // ISO
};

export type Shift = {
  id: string;
  ruleId?: string; // Opcional, se gerado por uma regra
  name: string;
  type: "ordinary" | "extra";
  value?: number; // Remuneração se for extra
  date: string; // Data do plantão (YYYY-MM-DD)
  startTime: string; // Ex: "07:00"
  endTime: string;   // Ex: "19:00"
  isPaid?: boolean; // Se o plantão extra já foi recebido
  transactionId?: string; // Transação criada no extrato principal
  googleEventId?: string; // Evento correspondente no Google Calendar
  createdAt: string;
  updatedAt?: string; // ISO
};

export type ShiftTemplate = {
  id: string;
  name: string;
  type: "ordinary" | "extra";
  value?: number;
  startTime: string;
  endTime: string;
  color?: string;
  createdAt: string;
  updatedAt?: string; // ISO
};
// ----------------------------------------------------
