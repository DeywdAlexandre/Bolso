import React, { useMemo } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { TransactionForm } from "@/components/TransactionForm";
import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";

export default function EditTransactionScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, updateTransaction, removeTransaction } = useAppData();
  const tx = useMemo(() => transactions.find((t) => t.id === id), [transactions, id]);

  if (!tx) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Transação não encontrada.
        </Text>
      </View>
    );
  }

  return (
    <TransactionForm
      submitLabel="Salvar"
      initial={{
        type: tx.type,
        amount: tx.amount,
        categoryId: tx.categoryId,
        description: tx.description,
        date: tx.date,
        accountId: tx.accountId,
        paymentMethod: tx.paymentMethod,
      }}
      onSubmit={async (values) => {
        await updateTransaction(tx.id, values);
        router.back();
      }}
      onDelete={async () => {
        await removeTransaction(tx.id);
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
