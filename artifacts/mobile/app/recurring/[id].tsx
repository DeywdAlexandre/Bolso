import React, { useMemo } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { RecurringForm } from "@/components/RecurringForm";
import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";

export default function EditRecurringScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recurring, updateRecurring, removeRecurring } = useAppData();
  const r = useMemo(() => recurring.find((x) => x.id === id), [recurring, id]);

  if (!r) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Recorrência não encontrada.
        </Text>
      </View>
    );
  }

  return (
    <RecurringForm
      submitLabel="Salvar"
      initial={{
        type: r.type,
        amount: r.amount,
        categoryId: r.categoryId,
        description: r.description,
        dayOfMonth: r.dayOfMonth,
        active: r.active,
        accountId: r.accountId,
        paymentMethod: r.paymentMethod,
      }}
      onSubmit={async (values) => {
        await updateRecurring(r.id, values);
        router.back();
      }}
      onDelete={async () => {
        await removeRecurring(r.id);
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
