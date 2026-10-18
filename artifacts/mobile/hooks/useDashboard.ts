import { useMemo, useRef, useState } from "react";
import { Animated } from "react-native";
import { useAppData } from "@/contexts/AppDataContext";
import type { Period } from "@/components/PeriodSelector";

export function useDashboard() {
  const {
    transactions,
    categories,
    recurring,
    goals,
    userName,
    ready,
    applyRecurring,
    balances,
  } = useAppData();

  const scrollY = useRef(new Animated.Value(0)).current;

  const now = new Date();
  const [period, setPeriod] = useState<Period>({
    mode: "month",
    month: now.getMonth(),
    year: now.getFullYear(),
  });

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const datePart = t.date.split("T")[0];
      const [year, month] = datePart.split("-").map(Number);
      
      if (period.mode === "month") {
        return (month - 1) === period.month && year === period.year;
      }
      return year === period.year;
    });
  }, [transactions, period]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }

    return { 
      income, 
      expense, 
      balance: income - expense,
      globalBalance: balances.total,
    };
  }, [filtered, balances.total]);

  const savedAmount = useMemo(() => {
    return goals.reduce((acc, g) => acc + g.currentAmount, 0);
  }, [goals]);

  const upcoming = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    
    return recurring
      .filter((r) => {
        if (!r.active) return false;
        const last = r.lastApplied ? new Date(r.lastApplied) : null;
        const alreadyApplied = last && last.getMonth() === month && last.getFullYear() === year;
        return !alreadyApplied;
      })
      .sort((a, b) => a.dayOfMonth - b.dayOfMonth)
      .slice(0, 5);
  }, [recurring]);

  const recent = useMemo(() => {
    return [...filtered]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [filtered]);

  return {
    ready,
    userName,
    categories,
    period,
    setPeriod,
    scrollY,
    filtered,
    totals,
    savedAmount,
    upcoming,
    recent,
    applyRecurring,
  };
}
