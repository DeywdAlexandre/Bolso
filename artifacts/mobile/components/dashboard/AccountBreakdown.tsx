import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AccountChip } from "@/components/accounts/AccountChip";
import { useColors } from "@/hooks/useColors";
import { breakdownByAccount, breakdownByMethod } from "@/lib/breakdown";
import { formatCurrency } from "@/lib/format";
import type { Account, Transaction } from "@/lib/types";

type Props = {
  /** Lançamentos do período selecionado. */
  transactions: Transaction[];
  accounts: Account[];
};

/** De onde o dinheiro saiu no período: por conta ou por forma de pagamento. */
export function AccountBreakdown({ transactions, accounts }: Props) {
  const colors = useColors();
  const [mode, setMode] = useState<"account" | "method">("account");

  const rows = useMemo(
    () => (mode === "account" ? breakdownByAccount(transactions, accounts) : breakdownByMethod(transactions)),
    [mode, transactions, accounts],
  );

  if (accounts.filter((a) => !a.archived).length === 0 || transactions.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Gastos por origem</Text>
        <View style={styles.chips}>
          <AccountChip label="Conta" active={mode === "account"} onPress={() => setMode("account")} />
          <AccountChip label="Forma" active={mode === "method"} onPress={() => setMode("method")} />
        </View>
      </View>

      <View style={{ gap: 14 }}>
        {rows.map((row) => (
          <View key={row.key} style={{ gap: 6 }}>
            <View style={styles.rowTop}>
              <View style={styles.labelWrap}>
                {row.color ? <View style={[styles.dot, { backgroundColor: row.color }]} /> : null}
                <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>
                  {row.label}
                </Text>
              </View>
              <Text style={[styles.value, { color: colors.foreground }]}>{formatCurrency(row.expense)}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: colors.muted }]}>
              <View
                style={[styles.fill, { width: `${Math.max(row.share * 100, row.expense > 0 ? 2 : 0)}%`, backgroundColor: row.color ?? colors.primary }]}
              />
            </View>
            <View style={styles.rowTop}>
              <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                {Math.round(row.share * 100)}% dos gastos · {row.count} {row.count === 1 ? "lançamento" : "lançamentos"}
              </Text>
              {row.income > 0 ? (
                <Text style={[styles.sub, { color: colors.income }]}>+ {formatCurrency(row.income)}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  chips: { flexDirection: "row", gap: 6 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  labelWrap: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  value: { fontSize: 14, fontFamily: "Inter_700Bold" },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  sub: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
