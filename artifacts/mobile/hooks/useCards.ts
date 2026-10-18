import { useMemo } from "react";

import { useAppData } from "@/contexts/AppDataContext";
import { computeCardSummary, type CardSummary } from "@/lib/cards";
import { toIsoDay } from "@/lib/format";
import type { Account } from "@/lib/types";

export type CardWithSummary = { card: Account; summary: CardSummary };

/** Cartões ativos com faturas, dívida e parcelas faltantes calculados para hoje. */
export function useCards(): CardWithSummary[] {
  const { accounts, transactions, transfers } = useAppData();
  const today = toIsoDay(new Date());

  return useMemo(
    () =>
      accounts
        .filter((a) => a.kind === "card" && !a.archived)
        .map((card) => ({ card, summary: computeCardSummary(card, transactions, transfers, today) })),
    [accounts, transactions, transfers, today],
  );
}
