import type { Account, Loan, LoanContact, LoanPayment, PaymentMethod, Transaction } from "../../types";
import { genId, toIsoDay } from "../../format";
import { parsePaymentMethod, resolveCashAccount } from "../../accounts";
import { generateLoanReport as generatePDF } from "../../reports";

export function buildLoanHandlers(deps: {
  loanContacts: LoanContact[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  addLoanContact: (c: Omit<LoanContact, "id" | "createdAt">) => Promise<LoanContact>;
  addLoan: (l: Omit<Loan, "id" | "createdAt" | "status">) => Promise<Loan>;
  addLoanPayment: (p: Omit<LoanPayment, "id" | "createdAt">) => Promise<LoanPayment>;
  addTransactionRaw: (t: Transaction) => Promise<void>;
  accounts?: Account[];
  defaultAccountId?: string;
}) {
  return {
    async addLoanContact(args: { name: string }) {
      const contact = await deps.addLoanContact({ name: args.name });
      return { ok: true, contact };
    },

    async listLoanContacts() {
      const result = deps.loanContacts.map((c) => {
        const cLoans = deps.loans.filter((l) => l.contactId === c.id);
        let balance = 0;
        cLoans.forEach((l) => {
          const lPayments = deps.loanPayments.filter((p) => p.loanId === l.id);
          const paid = lPayments.reduce((s, p) => s + p.amount, 0);
          const interest = (l.principalAmount * l.interestRate) / 100;
          const total = l.principalAmount + interest;
          if (l.direction === "lend") balance += total - paid;
          else balance -= total - paid;
        });
        return { name: c.name, balance };
      });
      return { contacts: result };
    },

    async addLoan(args: {
      contactName: string;
      direction: "lend" | "borrow";
      type: "monthly_interest" | "fixed_installments";
      amount: number;
      interestRate: number;
      description: string;
      installmentsCount?: number;
    }) {
      const contact = deps.loanContacts.find(
        (c) =>
          c.name.toLowerCase().includes(args.contactName.toLowerCase()) ||
          args.contactName.toLowerCase().includes(c.name.toLowerCase())
      );
      if (!contact) {
        return {
          ok: false,
          error: "Pessoa não encontrada. Você precisa adicionar o contato primeiro usando add_loan_contact.",
        };
      }

      const loan = await deps.addLoan({
        contactId: contact.id,
        direction: args.direction,
        type: args.type,
        description: args.description,
        principalAmount: args.amount,
        interestRate: args.interestRate,
        installmentsCount: args.installmentsCount,
        startDate: new Date().toISOString(),
      });
      return { ok: true, loan };
    },

    async listLoans(args: { contactName?: string }) {
      let filteredLoans = deps.loans;
      if (args.contactName) {
        const contact = deps.loanContacts.find((c) =>
          c.name.toLowerCase().includes(args.contactName!.toLowerCase())
        );
        if (contact) {
          filteredLoans = filteredLoans.filter((l) => l.contactId === contact.id);
        }
      }

      const result = filteredLoans.map((l) => {
        const contact = deps.loanContacts.find((c) => c.id === l.contactId);
        const payments = deps.loanPayments.filter((p) => p.loanId === l.id);
        const paid = payments.reduce((s, p) => s + p.amount, 0);
        const interest = (l.principalAmount * l.interestRate) / 100;
        const total = l.principalAmount + interest;
        return {
          id: l.id,
          contactName: contact?.name || "Desconhecido",
          description: l.description,
          amount: l.principalAmount,
          balance: total - paid,
          direction: l.direction,
        };
      });
      return { loans: result };
    },

    async addLoanPayment(args: { loanDescription: string; amount: number; addToExtrat?: boolean; account?: string; paymentMethod?: string }) {
      const loan = deps.loans.find((l) =>
        l.description.toLowerCase().includes(args.loanDescription.toLowerCase())
      );
      if (!loan) return { ok: false, error: "Empréstimo não encontrado. Verifique a descrição." };

      const payments = deps.loanPayments.filter((p) => p.loanId === loan.id);
      const paidPrincipal = payments.reduce((s, p) => s + p.principalPaid, 0);
      const remainingPrincipal = loan.principalAmount - paidPrincipal;
      const currentInterest = (remainingPrincipal * loan.interestRate) / 100;

      const interestToPay = Math.min(args.amount, currentInterest);
      const principalToPay = Math.max(0, args.amount - interestToPay);

      const addToExtrat = args.addToExtrat !== false;
      const transactionId = genId();

      const where = resolveCashAccount(deps.accounts ?? [], args.account, deps.defaultAccountId);
      if (where.error) return { ok: false, error: where.error };
      let paymentMethod: PaymentMethod | undefined;
      if (args.paymentMethod?.trim()) {
        paymentMethod = parsePaymentMethod(args.paymentMethod);
        if (!paymentMethod) return { ok: false, error: `Forma de pagamento "${args.paymentMethod}" inválida. Use: pix, debit, cash, boleto, transfer ou other.` };
      }

      if (addToExtrat) {
        const isLend = loan.direction === "lend";
        await deps.addTransactionRaw({
          id: transactionId,
          type: isLend ? "income" : "expense",
          amount: args.amount,
          categoryId: isLend ? "cat_loan_income" : "cat_loan_expense",
          date: toIsoDay(new Date()),
          description: `${isLend ? "Recebimento" : "Pagamento"} (IA): ${loan.description}`,
          accountId: where.accountId,
          paymentMethod,
          createdAt: new Date().toISOString(),
        });
      }

      const payment = await deps.addLoanPayment({
        loanId: loan.id,
        amount: args.amount,
        interestPaid: interestToPay,
        principalPaid: principalToPay,
        date: new Date().toISOString(),
        isMainExtratEntry: addToExtrat,
        transactionId: addToExtrat ? transactionId : undefined,
      });

      const accountName = (deps.accounts ?? []).find((a) => a.id === where.accountId)?.name;
      return { ok: true, payment, account: accountName ?? null };
    },

    async generateLoanReport(args: { loanDescription: string }) {
      const loan = deps.loans.find((l) =>
        l.description.toLowerCase().includes(args.loanDescription.toLowerCase())
      );
      if (!loan) return { ok: false, error: "Empréstimo não encontrado." };

      const contact = deps.loanContacts.find((c) => c.id === loan.contactId);
      if (!contact) return { ok: false, error: "Contato não encontrado." };

      const payments = deps.loanPayments.filter((p) => p.loanId === loan.id);

      try {
        await generatePDF(loan, contact, payments);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: "Erro ao gerar PDF" };
      }
    },
  };
}
