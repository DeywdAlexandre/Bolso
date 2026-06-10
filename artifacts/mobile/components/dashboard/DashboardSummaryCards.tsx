import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/format";

interface DashboardSummaryCardsProps {
  totals: {
    income: number;
    expense: number;
    balance: number;
  };
  savedAmount: number;
}

export function DashboardSummaryCards({ totals, savedAmount }: DashboardSummaryCardsProps) {
  const colors = useColors();

  return (
    <View style={styles.grid}>
      {/* Entrada */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Entradas</Text>
          <View style={[styles.iconBg, { backgroundColor: colors.income + "12" }]}>
            <Feather name="arrow-up-right" size={14} color={colors.income} />
          </View>
        </View>
        <Text style={[styles.cardValue, { color: colors.income }]}>
          {formatCurrency(totals.income)}
        </Text>
      </View>

      {/* Saída */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Saídas</Text>
          <View style={[styles.iconBg, { backgroundColor: colors.expense + "12" }]}>
            <Feather name="arrow-down-left" size={14} color={colors.expense} />
          </View>
        </View>
        <Text style={[styles.cardValue, { color: colors.expense }]}>
          {formatCurrency(totals.expense)}
        </Text>
      </View>

      {/* Saldo */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Balanço do Período</Text>
          <View style={[styles.iconBg, { backgroundColor: colors.foreground + "12" }]}>
            <Feather name="dollar-sign" size={14} color={colors.foreground} />
          </View>
        </View>
        <Text
          style={[
            styles.cardValue,
            { color: totals.balance >= 0 ? colors.foreground : colors.expense },
          ]}
        >
          {formatCurrency(totals.balance)}
        </Text>
      </View>

      {/* Metas */}
      <Pressable
        onPress={() => router.push("/goals")}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Metas</Text>
          <View style={[styles.iconBg, { backgroundColor: colors.primary + "12" }]}>
            <Feather name="target" size={14} color={colors.primary} />
          </View>
        </View>
        <Text style={[styles.cardValue, { color: colors.foreground }]}>
          {formatCurrency(savedAmount)}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    flex: 1,
    minWidth: "45%",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  iconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
