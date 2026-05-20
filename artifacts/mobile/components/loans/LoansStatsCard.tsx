import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/format";

interface LoansStatsCardProps {
  toReceive: number;
  toPay: number;
}

export function LoansStatsCard({ toReceive, toPay }: LoansStatsCardProps) {
  const colors = useColors();

  return (
    <View style={styles.statsRow}>
      <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>A Receber</Text>
        <Text style={[styles.statValue, { color: colors.income }]}>
          {formatCurrency(toReceive)}
        </Text>
        <Text style={[styles.statSub, { color: colors.mutedForeground }]}>
          Principal + Juros
        </Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>A Pagar</Text>
        <Text style={[styles.statValue, { color: colors.expense }]}>
          {formatCurrency(toPay)}
        </Text>
        <Text style={[styles.statSub, { color: colors.mutedForeground }]}>
          Dívida Total
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statSub: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
