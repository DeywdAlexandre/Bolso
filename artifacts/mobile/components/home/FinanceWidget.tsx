import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/format";
import { TransactionItem } from "@/components/TransactionItem";
import type { Category, Transaction } from "@/lib/types";

interface FinanceWidgetProps {
  globalBalance: number;
  incomeMonth: number;
  expenseMonth: number;
  recentTransactions: Transaction[];
  categories: Category[];
  showValue: boolean;
}

export function FinanceWidget({
  globalBalance,
  incomeMonth,
  expenseMonth,
  recentTransactions,
  categories,
  showValue,
}: FinanceWidgetProps) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header do Widget */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={[styles.iconBox, { backgroundColor: colors.primary + "12" }]}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Finanças</Text>
        </View>
        <Pressable
          onPress={() => router.push("/finance" as any)}
          style={({ pressed }) => [
            styles.linkBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.linkText, { color: colors.primary }]}>Ver mais</Text>
          <Feather name="chevron-right" size={14} color={colors.primary} />
        </Pressable>
      </View>

      {/* Resumos rápidos */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Saldo Atual</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {showValue ? formatCurrency(globalBalance) : "••••••"}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Ganhos</Text>
          <Text style={[styles.statValue, { color: colors.income }]}>
            {showValue ? formatCurrency(incomeMonth) : "••••••"}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Gastos</Text>
          <Text style={[styles.statValue, { color: colors.destructive }]}>
            {showValue ? formatCurrency(expenseMonth) : "••••••"}
          </Text>
        </View>
      </View>

      {/* Mini Extrato */}
      <View style={[styles.extratoContainer, { borderTopColor: colors.border }]}>
        <Text style={[styles.extratoTitle, { color: colors.mutedForeground }]}>
          Transações Recentes
        </Text>
        {recentTransactions.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Nenhuma transação recente registrada.
          </Text>
        ) : (
          <View style={styles.list}>
            {recentTransactions.slice(0, 2).map((tx) => {
              const cat = categories.find((c) => c.id === tx.categoryId);
              return (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  category={cat}
                  onPress={() => router.push(`/transaction/${tx.id}`)}
                  showDate={true}
                />
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  linkText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statBox: {
    flex: 1,
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  divider: {
    width: 1,
    height: 28,
    marginHorizontal: 12,
  },
  extratoContainer: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  extratoTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 12,
  },
  list: {
    gap: 2,
  },
});
