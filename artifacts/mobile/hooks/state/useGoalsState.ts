import { useState, useEffect, useCallback } from "react";
import { genId } from "@/lib/format";
import { saveJson, STORAGE_KEYS, loadJson } from "@/lib/storage";
import type { Goal, GoalDeposit, Transaction } from "@/lib/types";

interface UseGoalsStateProps {
  addTransaction: (input: Omit<Transaction, "id" | "createdAt">) => Promise<Transaction>;
}

export function useGoalsState({ addTransaction }: UseGoalsStateProps) {
  const [ready, setReady] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalDeposits, setGoalDeposits] = useState<GoalDeposit[]>([]);

  // Carregamento inicial do armazenamento local
  useEffect(() => {
    (async () => {
      const [g, gd] = await Promise.all([
        loadJson<Goal[]>(STORAGE_KEYS.goals, []),
        loadJson<GoalDeposit[]>(STORAGE_KEYS.goalDeposits, []),
      ]);

      setGoals(g);
      setGoalDeposits(gd);
      setReady(true);
    })();
  }, []);

  // Lógica automática de rendimento mensal das metas (juros)
  useEffect(() => {
    if (!ready) return;
    const now = new Date();
    const today = now.toISOString();

    let changed = false;
    const newDeposits: GoalDeposit[] = [];
    const updatedGoals = goals.map((g) => {
      if (!g.isYielding || g.currentAmount <= 0) return g;
      
      const lastAccrual = g.lastInterestAccrual ? new Date(g.lastInterestAccrual) : new Date(g.createdAt);
      const diffMs = now.getTime() - lastAccrual.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays >= 30) {
        const yieldAmount = g.currentAmount * (g.estimatedYield / 100);
        newDeposits.push({
          id: "gd_" + genId(),
          goalId: g.id,
          amount: yieldAmount,
          type: "yield",
          date: today,
          createdAt: today,
          updatedAt: today,
        });
        changed = true;
        return { 
          ...g, 
          currentAmount: g.currentAmount + yieldAmount,
          lastInterestAccrual: today,
          updatedAt: today,
        };
      }
      return g;
    });

    if (changed) {
      const allGD = [...newDeposits, ...goalDeposits];
      setGoalDeposits(allGD);
      setGoals(updatedGoals);
      void saveJson(STORAGE_KEYS.goalDeposits, allGD);
      void saveJson(STORAGE_KEYS.goals, updatedGoals);
    }
  }, [ready]);

  const addGoal = useCallback(async (input: Omit<Goal, "id" | "createdAt" | "currentAmount">) => {
    const now = new Date().toISOString();
    const g: Goal = { 
      ...input, 
      id: "goal_" + genId(), 
      currentAmount: 0, 
      createdAt: now,
      updatedAt: now,
    };
    setGoals((prev) => {
      const next = [g, ...prev];
      void saveJson(STORAGE_KEYS.goals, next);
      return next;
    });
    return g;
  }, []);

  const updateGoal = useCallback(async (id: string, patch: Partial<Goal>) => {
    const now = new Date().toISOString();
    setGoals((prev) => {
      const next = prev.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: now } : g));
      void saveJson(STORAGE_KEYS.goals, next);
      return next;
    });
  }, []);

  const removeGoal = useCallback(async (id: string) => {
    setGoals((prev) => {
      const next = prev.filter((g) => g.id !== id);
      void saveJson(STORAGE_KEYS.goals, next);
      return next;
    });
    setGoalDeposits((prev) => {
      const next = prev.filter((d) => d.goalId !== id);
      void saveJson(STORAGE_KEYS.goalDeposits, next);
      return next;
    });
  }, []);

  const addGoalDeposit = useCallback(async (input: Omit<GoalDeposit, "id" | "createdAt" | "type"> & { type?: GoalDeposit["type"]; createTransaction?: boolean }) => {
    const now = new Date().toISOString();
    const { createTransaction, type, ...rest } = input;
    let txId: string | undefined;

    if (createTransaction) {
      const tx = await addTransaction({
        type: "expense",
        amount: rest.amount,
        categoryId: "savings",
        description: `Depósito Meta: ${goals.find(g => g.id === rest.goalId)?.name || ""}`,
        date: rest.date,
      });
      txId = tx.id;
    }

    const gd: GoalDeposit = {
      ...rest,
      id: "gd_" + genId(),
      type: type || "deposit",
      transactionId: txId,
      createdAt: now,
      updatedAt: now,
    };

    setGoalDeposits((prev) => {
      const next = [gd, ...prev];
      void saveJson(STORAGE_KEYS.goalDeposits, next);
      return next;
    });

    // Atualiza o currentAmount da meta
    await updateGoal(rest.goalId, { 
      currentAmount: (goals.find(g => g.id === rest.goalId)?.currentAmount || 0) + rest.amount 
    });

    return gd;
  }, [addTransaction, goals, updateGoal]);

  // Métodos de limpeza e importação de estado
  const clearState = useCallback(async () => {
    setGoals([]);
    setGoalDeposits([]);
    await Promise.all([
      saveJson(STORAGE_KEYS.goals, []),
      saveJson(STORAGE_KEYS.goalDeposits, []),
    ]);
  }, []);

  const importState = useCallback(async (data: {
    goals?: Goal[];
    goalDeposits?: GoalDeposit[];
  }) => {
    if (data.goals) {
      setGoals(data.goals);
      await saveJson(STORAGE_KEYS.goals, data.goals);
    }
    if (data.goalDeposits) {
      setGoalDeposits(data.goalDeposits);
      await saveJson(STORAGE_KEYS.goalDeposits, data.goalDeposits);
    }
  }, []);

  return {
    ready,
    goals,
    goalDeposits,
    addGoal,
    updateGoal,
    removeGoal,
    addGoalDeposit,
    clearState,
    importState,
  };
}
