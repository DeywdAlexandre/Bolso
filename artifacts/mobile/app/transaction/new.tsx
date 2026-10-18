import React from "react";
import { router, useLocalSearchParams } from "expo-router";

import { TransactionForm } from "@/components/TransactionForm";
import { useAppData } from "@/contexts/AppDataContext";
import { planInstallments } from "@/lib/cards";
import { genId } from "@/lib/format";
import type { TransactionType } from "@/lib/types";

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ type?: string; account?: string }>();
  const initialType = (params.type === "income" ? "income" : "expense") as TransactionType;
  const { addTransaction, categories } = useAppData();

  return (
    <TransactionForm
      submitLabel="Adicionar"
      initial={{ type: initialType }}
      rememberLast
      presetAccountId={params.account}
      onSubmit={async ({ installments, ...values }) => {
        // A conta foi escolhida no formulário (inclusive "Sem conta"): não aplica a conta padrão.
        if (installments && installments > 1) {
          // Compra parcelada no cartão: uma parcela por fatura, todas ligadas pelo mesmo grupo.
          const groupId = "ig_" + genId();
          const name = values.description || categories.find((c) => c.id === values.categoryId)?.name || "Compra";
          const plan = planInstallments(values.amount, installments, values.date.split("T")[0]!);
          for (const p of plan) {
            await addTransaction(
              {
                ...values,
                amount: p.amount,
                description: `${name} (${p.index}/${p.total})`,
                date: new Date(`${p.date}T12:00:00`).toISOString(),
                installmentGroupId: groupId,
                installmentIndex: p.index,
                installmentTotal: p.total,
              },
              { useDefaultAccount: false },
            );
          }
        } else {
          await addTransaction(values, { useDefaultAccount: false });
        }
        router.back();
      }}
    />
  );
}
