import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconCircle } from "@/components/IconCircle";
import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { paymentMethodLabel } from "@/lib/accounts";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Category, Transaction } from "@/lib/types";

type Props = {
  transaction: Transaction;
  category: Category | undefined;
  onPress?: () => void;
  showDate?: boolean;
};

export function TransactionItem({ transaction, category, onPress, showDate = true }: Props) {
  const colors = useColors();
  const { accounts } = useAppData();
  const account = transaction.accountId ? accounts.find((a) => a.id === transaction.accountId) : undefined;
  const method = paymentMethodLabel(transaction.paymentMethod);
  const isIncome = transaction.type === "income";
  const amountColor = isIncome ? colors.income : colors.foreground;
  const sign = isIncome ? "+" : "-";

  const isLoan = category?.id === "cat_loan_income" || category?.id === "cat_loan_expense";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <IconCircle
        name={category?.icon ?? "circle"}
        color={category?.color ?? colors.mutedForeground}
        size={44}
      />
      <View style={styles.middle}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {transaction.description || category?.name || "Transação"}
        </Text>
        <View style={styles.subRow}>
          <Text style={[styles.subText, { color: colors.mutedForeground }]} numberOfLines={2}>
            {category?.name ?? "—"}
            {showDate ? ` · ${formatDate(transaction.date)}` : ""}
            {account ? ` · ${account.name}` : ""}
            {method ? ` · ${method}` : ""}
          </Text>
          {transaction.recurringId ? (
            <View style={[styles.badge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>fixo</Text>
            </View>
          ) : null}
          {isLoan ? (
            <View style={[styles.badge, { backgroundColor: colors.accent + "15" }]}>
              <Text style={[styles.badgeText, { color: colors.accent }]}>Empréstimo</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {sign} {formatCurrency(transaction.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  middle: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amount: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
