import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { useCards } from "@/hooks/useCards";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatDate } from "@/lib/format";
import type { BalanceSummary } from "@/lib/accounts";

type Props = {
  balances: BalanceSummary;
  showValue: boolean;
};

const HIDDEN = "••••••";

/** Saldo de cada conta/carteira na tela inicial; sem contas, convida a cadastrar. */
export function AccountsWidget({ balances, showValue }: Props) {
  const colors = useColors();
  const money = (v: number) => (showValue ? formatCurrency(v) : HIDDEN);
  const cards = useCards();

  if (!balances.hasAccounts) {
    return (
      <Pressable
        onPress={() => router.push("/accounts" as any)}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="credit-card" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>Minhas contas</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              Bancos e carteira: veja quanto há em cada um
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + "15" }]}>
          <Feather name="credit-card" size={18} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground, flex: 1 }]}>Minhas contas</Text>
        <Pressable onPress={() => router.push("/accounts" as any)} hitSlop={8}>
          <Text style={[styles.link, { color: colors.primary }]}>Gerenciar ›</Text>
        </Pressable>
      </View>

      <View style={{ gap: 10 }}>
        {balances.accounts.map(({ account, balance }) => (
          <View key={account.id} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: account.color }]} />
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
              {account.name}
            </Text>
            <Text style={[styles.value, { color: balance < 0 ? colors.expense : colors.foreground }]}>{money(balance)}</Text>
          </View>
        ))}
        {cards.map(({ card, summary }) => (
          <Pressable key={card.id} onPress={() => router.push(`/cards/${card.id}` as any)} style={styles.row}>
            <Feather name="credit-card" size={12} color={card.color} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                {card.name}
              </Text>
              {summary.current ? (
                <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                  Fatura {money(summary.current.total)} · vence {formatDate(summary.current.dueDate)}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.value, { color: summary.debt > 0 ? colors.expense : colors.foreground }]}>
              {money(Math.max(summary.debt, 0))}
            </Text>
          </Pressable>
        ))}
        {balances.unassigned !== 0 && (
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: colors.mutedForeground }]} />
            <Text style={[styles.name, { color: colors.mutedForeground }]}>Sem conta</Text>
            <Text style={[styles.value, { color: colors.mutedForeground }]}>{money(balances.unassigned)}</Text>
          </View>
        )}
      </View>

      <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Dinheiro em contas</Text>
        <Text style={[styles.totalValue, { color: colors.foreground }]}>{money(balances.total)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  link: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  value: { fontSize: 14, fontFamily: "Inter_700Bold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTopWidth: 1 },
  totalLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4 },
  totalValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
