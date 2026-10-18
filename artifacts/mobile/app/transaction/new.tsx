import React from "react";
import { router, useLocalSearchParams } from "expo-router";

import { TransactionForm } from "@/components/TransactionForm";
import { useAppData } from "@/contexts/AppDataContext";
import type { TransactionType } from "@/lib/types";

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const initialType = (params.type === "income" ? "income" : "expense") as TransactionType;
  const { addTransaction } = useAppData();

  return (
    <TransactionForm
      submitLabel="Adicionar"
      initial={{ type: initialType }}
      rememberLast
      onSubmit={async (values) => {
        // A conta foi escolhida no formulário (inclusive "Sem conta"): não aplica a conta padrão.
        await addTransaction(values, { useDefaultAccount: false });
        router.back();
      }}
    />
  );
}
