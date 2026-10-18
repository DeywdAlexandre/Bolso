import { useCallback, useEffect, useState } from "react";

import { genId, toIsoDay } from "@/lib/format";
import { loadJson, saveJson, STORAGE_KEYS } from "@/lib/storage";
import type { Account, AccountKind, Transfer } from "@/lib/types";

export type NewAccountInput = {
  name: string;
  kind: AccountKind;
  color: string;
  /** Quanto há na conta hoje (em cartão: negativo = dívida em aberto). */
  balance: number;
  closingDay?: number;
  dueDay?: number;
  creditLimit?: number;
};

export function useAccountsState() {
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  useEffect(() => {
    void Promise.all([
      loadJson<Account[]>(STORAGE_KEYS.accounts, []),
      loadJson<Transfer[]>(STORAGE_KEYS.transfers, []),
    ]).then(([storedAccounts, storedTransfers]) => {
      setAccounts(storedAccounts);
      setTransfers(storedTransfers);
      setReady(true);
    });
  }, []);

  const persist = useCallback((updater: (prev: Account[]) => Account[]) => {
    setAccounts((prev) => {
      const next = updater(prev);
      void saveJson(STORAGE_KEYS.accounts, next);
      return next;
    });
  }, []);

  const addAccount = useCallback(
    async (input: NewAccountInput) => {
      const now = new Date().toISOString();
      const account: Account = {
        id: "acc_" + genId(),
        name: input.name.trim(),
        kind: input.kind,
        color: input.color,
        initialBalance: input.balance,
        balanceDate: toIsoDay(new Date()),
        ...(input.kind === "card"
          ? { closingDay: input.closingDay, dueDay: input.dueDay, creditLimit: input.creditLimit }
          : {}),
        createdAt: now,
        updatedAt: now,
      };
      persist((prev) => [...prev, account]);
      return account;
    },
    [persist],
  );

  const updateAccount = useCallback(
    async (id: string, patch: Partial<Omit<Account, "id" | "createdAt">>) => {
      const now = new Date().toISOString();
      persist((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: now } : a)));
    },
    [persist],
  );

  const persistTransfers = useCallback((updater: (prev: Transfer[]) => Transfer[]) => {
    setTransfers((prev) => {
      const next = updater(prev);
      void saveJson(STORAGE_KEYS.transfers, next);
      return next;
    });
  }, []);

  const addTransfer = useCallback(
    async (input: Omit<Transfer, "id" | "createdAt">) => {
      const now = new Date().toISOString();
      const transfer: Transfer = { ...input, id: "tr_" + genId(), createdAt: now, updatedAt: now };
      persistTransfers((prev) => [transfer, ...prev]);
      return transfer;
    },
    [persistTransfers],
  );

  const updateTransfer = useCallback(
    async (id: string, patch: Partial<Omit<Transfer, "id" | "createdAt">>) => {
      const now = new Date().toISOString();
      persistTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now } : t)));
    },
    [persistTransfers],
  );

  const removeTransfer = useCallback(
    async (id: string) => {
      persistTransfers((prev) => prev.filter((t) => t.id !== id));
    },
    [persistTransfers],
  );

  const importState = useCallback(async (data: { accounts?: Account[]; transfers?: Transfer[] }) => {
    if (data.accounts) {
      setAccounts(data.accounts);
      await saveJson(STORAGE_KEYS.accounts, data.accounts);
    }
    if (data.transfers) {
      setTransfers(data.transfers);
      await saveJson(STORAGE_KEYS.transfers, data.transfers);
    }
  }, []);

  const clearState = useCallback(async () => {
    setAccounts([]);
    setTransfers([]);
    await saveJson(STORAGE_KEYS.accounts, []);
    await saveJson(STORAGE_KEYS.transfers, []);
  }, []);

  return {
    ready,
    accounts,
    transfers,
    addAccount,
    updateAccount,
    addTransfer,
    updateTransfer,
    removeTransfer,
    importState,
    clearState,
  };
}
