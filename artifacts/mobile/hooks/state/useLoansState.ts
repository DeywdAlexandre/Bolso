import { useState, useEffect, useCallback } from "react";
import { genId } from "@/lib/format";
import { saveJson, STORAGE_KEYS, loadJson } from "@/lib/storage";
import type { LoanContact, Loan, LoanPayment, Transaction } from "@/lib/types";

interface UseLoansStateProps {
  removeTransaction: (id: string) => Promise<void>;
}

export function useLoansState({ removeTransaction }: UseLoansStateProps) {
  const [ready, setReady] = useState(false);
  const [loanContacts, setLoanContacts] = useState<LoanContact[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([]);

  // Carregamento inicial do armazenamento local
  useEffect(() => {
    (async () => {
      const [lc, l, lp] = await Promise.all([
        loadJson<LoanContact[]>(STORAGE_KEYS.loanContacts, []),
        loadJson<Loan[]>(STORAGE_KEYS.loans, []),
        loadJson<LoanPayment[]>(STORAGE_KEYS.loanPayments, []),
      ]);

      setLoanContacts(lc);
      setLoans(l);
      setLoanPayments(lp);
      setReady(true);
    })();
  }, []);

  const addLoanContact = useCallback(async (input: Omit<LoanContact, "id" | "createdAt">) => {
    const now = new Date().toISOString();
    const lc: LoanContact = { ...input, id: "lc_" + genId(), createdAt: now, updatedAt: now };
    setLoanContacts((prev) => {
      const next = [lc, ...prev];
      void saveJson(STORAGE_KEYS.loanContacts, next);
      return next;
    });
    return lc;
  }, []);

  const updateLoanContact = useCallback(async (id: string, patch: Partial<LoanContact>) => {
    const now = new Date().toISOString();
    setLoanContacts((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: now } : c));
      void saveJson(STORAGE_KEYS.loanContacts, next);
      return next;
    });
  }, []);

  const removeLoanContact = useCallback(async (id: string) => {
    setLoanContacts((prev) => {
      const next = prev.filter((c) => c.id !== id);
      void saveJson(STORAGE_KEYS.loanContacts, next);
      return next;
    });
    setLoans((prev) => {
      const next = prev.filter((l) => l.contactId !== id);
      void saveJson(STORAGE_KEYS.loans, next);
      return next;
    });
  }, []);

  const addLoan = useCallback(async (input: Omit<Loan, "id" | "createdAt" | "status">) => {
    const now = new Date().toISOString();
    const l: Loan = { ...input, id: "loan_" + genId(), createdAt: now, updatedAt: now, status: "active" };
    setLoans((prev) => {
      const next = [l, ...prev];
      void saveJson(STORAGE_KEYS.loans, next);
      return next;
    });
    return l;
  }, []);

  const updateLoan = useCallback(async (id: string, patch: Partial<Loan>) => {
    const now = new Date().toISOString();
    setLoans((prev) => {
      const next = prev.map((l) => (l.id === id ? { ...l, ...patch, updatedAt: now } : l));
      void saveJson(STORAGE_KEYS.loans, next);
      return next;
    });
  }, []);

  const removeLoan = useCallback(async (id: string) => {
    let initialTxId: string | undefined;
    setLoans((prev) => {
      const target = prev.find((l) => l.id === id);
      initialTxId = target?.initialTransactionId;
      const next = prev.filter((l) => l.id !== id);
      void saveJson(STORAGE_KEYS.loans, next);
      return next;
    });
    if (initialTxId) await removeTransaction(initialTxId);
    setLoanPayments((prev) => {
      const next = prev.filter((p) => p.loanId !== id);
      void saveJson(STORAGE_KEYS.loanPayments, next);
      return next;
    });
  }, [removeTransaction]);

  const addLoanPayment = useCallback(async (input: Omit<LoanPayment, "id" | "createdAt">) => {
    const now = new Date().toISOString();
    const lp: LoanPayment = { ...input, id: "lp_" + genId(), createdAt: now, updatedAt: now };
    setLoanPayments((prev) => {
      const next = [lp, ...prev];
      void saveJson(STORAGE_KEYS.loanPayments, next);
      return next;
    });
    return lp;
  }, []);

  const removeLoanPayment = useCallback(async (id: string) => {
    let txToRemoveId: string | undefined;
    setLoanPayments((prev) => {
      const target = prev.find((p) => p.id === id);
      txToRemoveId = target?.transactionId;
      const next = prev.filter((p) => p.id !== id);
      void saveJson(STORAGE_KEYS.loanPayments, next);
      return next;
    });
    if (txToRemoveId) await removeTransaction(txToRemoveId);
  }, [removeTransaction]);

  // Métodos de limpeza e importação de estado
  const clearState = useCallback(async () => {
    setLoanContacts([]);
    setLoans([]);
    setLoanPayments([]);
    await Promise.all([
      saveJson(STORAGE_KEYS.loanContacts, []),
      saveJson(STORAGE_KEYS.loans, []),
      saveJson(STORAGE_KEYS.loanPayments, []),
    ]);
  }, []);

  const importState = useCallback(async (data: {
    loanContacts?: LoanContact[];
    loans?: Loan[];
    loanPayments?: LoanPayment[];
  }) => {
    if (data.loanContacts) {
      setLoanContacts(data.loanContacts);
      await saveJson(STORAGE_KEYS.loanContacts, data.loanContacts);
    }
    if (data.loans) {
      setLoans(data.loans);
      await saveJson(STORAGE_KEYS.loans, data.loans);
    }
    if (data.loanPayments) {
      setLoanPayments(data.loanPayments);
      await saveJson(STORAGE_KEYS.loanPayments, data.loanPayments);
    }
  }, []);

  return {
    ready,
    loanContacts,
    loans,
    loanPayments,
    addLoanContact,
    updateLoanContact,
    removeLoanContact,
    addLoan,
    updateLoan,
    removeLoan,
    addLoanPayment,
    removeLoanPayment,
    clearState,
    importState,
  };
}
