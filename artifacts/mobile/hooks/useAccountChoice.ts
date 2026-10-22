import { useState } from "react";

import { useAppData } from "@/contexts/AppDataContext";
import { useSettings } from "@/contexts/SettingsContext";
import { preselectedAccountId } from "@/lib/accounts";
import type { PaymentMethod } from "@/lib/types";

/**
 * Conta e forma de pagamento de um lançamento, já preenchidas com a última conta usada
 * (ou a padrão). Com `skipCards`, um cartão nunca vem pré-selecionado.
 */
export function useAccountChoice(skipCards = false) {
  const { accounts } = useAppData();
  const { settings } = useSettings();
  const usable = skipCards ? accounts.filter((a) => a.kind !== "card") : accounts;
  const [accountId, setAccountId] = useState<string | undefined>(() =>
    preselectedAccountId(usable, settings.lastAccountId, settings.defaultAccountId),
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>(undefined);
  return { accountId, setAccountId, paymentMethod, setPaymentMethod };
}
