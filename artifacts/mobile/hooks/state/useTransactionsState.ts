import { buildRecurringTransaction } from "@/lib/recurring";
import { useState, useEffect, useCallback } from "react";
import { genId } from "@/lib/format";
import { saveJson, STORAGE_KEYS, loadJson } from "@/lib/storage";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import type { Category, Recurring, Transaction } from "@/lib/types";

/** `defaultAccountId`: conta usada nos fixos aplicados automaticamente quando o fixo não tem conta. */
export function useTransactionsState({ defaultAccountId }: { defaultAccountId?: string } = {}) {
  const [ready, setReady] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

  // Carregamento inicial do armazenamento local
  useEffect(() => {
    (async () => {
      const [tx, rc, cats] = await Promise.all([
        loadJson<Transaction[]>(STORAGE_KEYS.transactions, []),
        loadJson<Recurring[]>(STORAGE_KEYS.recurring, []),
        loadJson<Category[]>(STORAGE_KEYS.categories, DEFAULT_CATEGORIES),
      ]);

      const mergedCats = [...cats];
      DEFAULT_CATEGORIES.forEach((def) => {
        if (!mergedCats.find((c) => c.id === def.id)) {
          mergedCats.push(def);
        }
      });

      setTransactions(tx);
      setRecurring(rc);
      setCategories(mergedCats);
      setReady(true);
    })();
  }, []);

  const addTransactionRaw = useCallback(async (tx: Transaction) => {
    const txWithUpdate = tx.updatedAt ? tx : { ...tx, updatedAt: tx.createdAt };
    setTransactions((prev) => {
      const next = [txWithUpdate, ...prev];
      void saveJson(STORAGE_KEYS.transactions, next);
      return next;
    });
  }, []);

  const addTransaction = useCallback(
    async (input: Omit<Transaction, "id" | "createdAt">) => {
      const now = new Date().toISOString();
      const tx: Transaction = {
        ...input,
        id: genId(),
        createdAt: now,
        updatedAt: now,
      };
      await addTransactionRaw(tx);
      return tx;
    },
    [addTransactionRaw]
  );

  const updateTransaction = useCallback(async (id: string, patch: Partial<Transaction>) => {
    const now = new Date().toISOString();
    setTransactions((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now } : t));
      void saveJson(STORAGE_KEYS.transactions, next);
      return next;
    });
  }, []);

  const removeTransaction = useCallback(async (id: string) => {
    setTransactions((prev) => {
      const next = prev.filter((t) => t.id !== id);
      void saveJson(STORAGE_KEYS.transactions, next);
      return next;
    });
  }, []);

  const addRecurringRaw = useCallback(async (r: Recurring) => {
    const rWithUpdate = r.updatedAt ? r : { ...r, updatedAt: r.createdAt };
    setRecurring((prev) => {
      const next = [rWithUpdate, ...prev];
      void saveJson(STORAGE_KEYS.recurring, next);
      return next;
    });
  }, []);

  const addRecurring = useCallback(
    async (input: Omit<Recurring, "id" | "createdAt" | "active"> & { active?: boolean; isSubscription?: boolean }) => {
      const now = new Date().toISOString();
      const r: Recurring = {
        ...input,
        active: input.active ?? true,
        isSubscription: input.isSubscription ?? false,
        id: genId(),
        createdAt: now,
        updatedAt: now,
      };
      await addRecurringRaw(r);
      return r;
    },
    [addRecurringRaw]
  );

  const updateRecurring = useCallback(async (id: string, patch: Partial<Recurring>) => {
    const now = new Date().toISOString();
    setRecurring((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now } : r));
      void saveJson(STORAGE_KEYS.recurring, next);
      return next;
    });
  }, []);

  const removeRecurring = useCallback(async (id: string) => {
    setRecurring((prev) => {
      const next = prev.filter((r) => r.id !== id);
      void saveJson(STORAGE_KEYS.recurring, next);
      return next;
    });
  }, []);

  const applyRecurring = useCallback(async (id: string) => {
    setRecurring((prevRec) => {
      const r = prevRec.find((x) => x.id === id);
      if (!r) return prevRec;

      const built = buildRecurringTransaction(r, new Date(), defaultAccountId);
      if (!built) return prevRec;
      const { tx, appliedAt } = built;
      const nowIso = tx.createdAt;

      setTransactions((prevTx) => {
        const nextTx = [tx, ...prevTx];
        void saveJson(STORAGE_KEYS.transactions, nextTx);
        return nextTx;
      });

      const nextRec = prevRec.map((item) =>
        item.id === id ? { ...item, lastApplied: appliedAt, updatedAt: nowIso } : item
      );
      void saveJson(STORAGE_KEYS.recurring, nextRec);
      return nextRec;
    });
  }, [defaultAccountId]);

  const addCategory = useCallback(async (input: Omit<Category, "id">) => {
    const now = new Date().toISOString();
    const cat: Category = { ...input, id: "cat_" + genId(), updatedAt: now };
    setCategories((prev) => {
      const next = [...prev, cat];
      void saveJson(STORAGE_KEYS.categories, next);
      return next;
    });
    return cat;
  }, []);

  const removeCategory = useCallback(async (id: string) => {
    setCategories((prev) => {
      const target = prev.find((c) => c.id === id);
      if (!target || target.isDefault) return prev;
      const next = prev.filter((c) => c.id !== id);
      void saveJson(STORAGE_KEYS.categories, next);
      return next;
    });
  }, []);

  // Métodos de limpeza e importação de estado
  const clearState = useCallback(async () => {
    setTransactions([]);
    setRecurring([]);
    setCategories(DEFAULT_CATEGORIES);
    await Promise.all([
      saveJson(STORAGE_KEYS.transactions, []),
      saveJson(STORAGE_KEYS.recurring, []),
      saveJson(STORAGE_KEYS.categories, DEFAULT_CATEGORIES),
    ]);
  }, []);

  const importState = useCallback(async (data: {
    transactions?: Transaction[];
    recurring?: Recurring[];
    categories?: Category[];
  }) => {
    if (data.transactions) {
      setTransactions(data.transactions);
      await saveJson(STORAGE_KEYS.transactions, data.transactions);
    }
    if (data.recurring) {
      setRecurring(data.recurring);
      await saveJson(STORAGE_KEYS.recurring, data.recurring);
    }
    if (data.categories) {
      const mergedCats = [...data.categories];
      DEFAULT_CATEGORIES.forEach((def) => {
        if (!mergedCats.find((c) => c.id === def.id)) {
          mergedCats.push(def);
        }
      });
      setCategories(mergedCats);
      await saveJson(STORAGE_KEYS.categories, mergedCats);
    }
  }, []);

  return {
    ready,
    transactions,
    recurring,
    categories,
    addTransactionRaw,
    addTransaction,
    updateTransaction,
    removeTransaction,
    addRecurringRaw,
    addRecurring,
    updateRecurring,
    removeRecurring,
    applyRecurring,
    addCategory,
    removeCategory,
    clearState,
    importState,
  };
}
