import React, { useMemo } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";

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
        const siblings = tx.installmentGroupId
          ? transactions.filter((t) => t.installmentGroupId === tx.installmentGroupId)
          : [];
        const removeOne = async () => {
          await removeTransaction(tx.id);
          router.back();
        };
        if (siblings.length <= 1) return removeOne();

        const removeAll = async () => {
          for (const t of siblings) await removeTransaction(t.id);
          router.back();
        };
        if (Platform.OS === "web") {
          const all = globalThis.confirm?.(
            `Esta compra tem ${siblings.length} parcelas. OK = excluir todas as parcelas; Cancelar = excluir só esta.`,
          );
          return all ? removeAll() : removeOne();
        }
        Alert.alert("Compra parcelada", `Esta compra tem ${siblings.length} parcelas.`, [
          { text: "Cancelar", style: "cancel" },
          { text: "Só esta", onPress: () => void removeOne() },
          { text: "Todas", style: "destructive", onPress: () => void removeAll() },
        ]);
      }}
    />
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
