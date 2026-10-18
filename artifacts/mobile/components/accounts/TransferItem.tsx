import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Transfer } from "@/lib/types";

type Props = { transfer: Transfer; onPress?: () => void };

/** Linha de transferência no extrato: "Nubank → Carteira". Não conta como gasto nem entrada. */
export function TransferItem({ transfer, onPress }: Props) {
  const colors = useColors();
  const { accounts } = useAppData();
  const name = (id: string) => accounts.find((a) => a.id === id)?.name ?? "Conta removida";

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.icon, { backgroundColor: colors.muted }]}>
        <Feather name="repeat" size={20} color={colors.mutedForeground} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {name(transfer.fromAccountId)} → {name(transfer.toAccountId)}
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={2}>
          Transferência · {formatDate(transfer.date)}
          {transfer.note ? ` · ${transfer.note}` : ""}
        </Text>
      </View>
      <Text style={[styles.amount, { color: colors.mutedForeground }]}>{formatCurrency(transfer.amount)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 4 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  amount: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
