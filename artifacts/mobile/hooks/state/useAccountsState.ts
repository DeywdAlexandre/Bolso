import { useCallback, useEffect, useState } from "react";

import { genId, toIsoDay } from "@/lib/format";
import { loadJson, saveJson, STORAGE_KEYS } from "@/lib/storage";
import type { Account, AccountKind } from "@/lib/types";

export type NewAccountInput = {
  name: string;
  kind: AccountKind;
  color: string;
  /** Quanto há na conta hoje. */
  balance: number;
};

export function useAccountsState() {
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    void loadJson<Account[]>(STORAGE_KEYS.accounts, []).then((stored) => {
      setAccounts(stored);
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

  const importState = useCallback(async (data: { accounts?: Account[] }) => {
    if (data.accounts) {
      setAccounts(data.accounts);
      await saveJson(STORAGE_KEYS.accounts, data.accounts);
    }
  }, []);

  const clearState = useCallback(async () => {
    setAccounts([]);
    await saveJson(STORAGE_KEYS.accounts, []);
  }, []);

  return { ready, accounts, addAccount, updateAccount, importState, clearState };
}
