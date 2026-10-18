import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { useAppData } from "@/contexts/AppDataContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { ACCOUNT_KINDS } from "@/lib/accounts";
import { useCards } from "@/hooks/useCards";
import { formatCurrency, formatDate } from "@/lib/format";

export default function AccountsScreen() {
  const colors = useColors();
  const { accounts, balances, updateAccount } = useAppData();
  const { settings } = useSettings();

  const archived = accounts.filter((a) => a.archived);
  const cards = useCards();
  const kindOf = (kind: string) => ACCOUNT_KINDS.find((k) => k.value === kind);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <View style={[styles.totalCard, { backgroundColor: colors.primary }]}>
        <Text style={[styles.totalLabel, { color: colors.primaryForeground + "cc" }]}>
          {balances.hasAccounts ? "Dinheiro total nas contas" : "Saldo geral"}
        </Text>
        <Text style={[styles.totalValue, { color: colors.primaryForeground }]}>{formatCurrency(balances.total)}</Text>
        {balances.hasAccounts && balances.unassigned !== 0 && (
          <Text style={[styles.totalHint, { color: colors.primaryForeground + "cc" }]}>
            Inclui {formatCurrency(balances.unassigned)} em lançamentos sem conta
          </Text>
        )}
      </View>

      {!balances.hasAccounts && (
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          Cadastre seus bancos e a carteira com o valor que há em cada um. Depois, escolha a conta ao lançar um gasto ou uma
          entrada e o app mantém o saldo de cada conta atualizado.
        </Text>
      )}

      {balances.accounts.map(({ account, balance }) => {
        const kind = kindOf(account.kind);
        const isDefault = settings.defaultAccountId === account.id;
        return (
          <Pressable
            key={account.id}
            onPress={() => router.push(`/accounts/${account.id}` as any)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={[styles.icon, { backgroundColor: account.color + "22" }]}>
              <Feather name={kind?.icon ?? "briefcase"} size={18} color={account.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.foreground }]}>{account.name}</Text>
              <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                {kind?.label ?? "Conta"}
                {isDefault ? " · padrão" : ""}
              </Text>
            </View>
            <Text style={[styles.balance, { color: balance < 0 ? colors.expense : colors.foreground }]}>
              {formatCurrency(balance)}
            </Text>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        );
      })}

      {cards.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Cartões de crédito</Text>
          {cards.map(({ card, summary }) => (
            <Pressable
              key={card.id}
              onPress={() => router.push(`/cards/${card.id}` as any)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: card.color + "22" }]}>
                <Feather name="credit-card" size={18} color={card.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.foreground }]}>{card.name}</Text>
                <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                  {summary.current
                    ? `Fatura atual ${formatCurrency(summary.current.total)} · vence ${formatDate(summary.current.dueDate)}`
                    : "Sem fatura em aberto"}
                </Text>
              </View>
              <Text style={[styles.balance, { color: summary.debt > 0 ? colors.expense : colors.foreground }]}>
                {formatCurrency(Math.max(summary.debt, 0))}
              </Text>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      )}

      {balances.hasAccounts && balances.unassigned !== 0 && (
        <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.icon, { backgroundColor: colors.muted }]}>
            <Feather name="help-circle" size={18} color={colors.mutedForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.foreground }]}>Sem conta</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              Lançamentos feitos sem escolher uma conta
            </Text>
          </View>
          <Text style={[styles.balance, { color: colors.foreground }]}>{formatCurrency(balances.unassigned)}</Text>
        </View>
      )}

      <Pressable
        onPress={() => router.push("/accounts/new" as any)}
        style={({ pressed }) => [styles.add, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
      >
        <Feather name="plus" size={18} color={colors.primaryForeground} />
        <Text style={[styles.addText, { color: colors.primaryForeground }]}>Nova conta</Text>
      </Pressable>

      {balances.accounts.length + balances.cards.length >= 2 && (
        <Pressable
          onPress={() => router.push("/accounts/transfer" as any)}
          style={({ pressed }) => [
            styles.add,
            { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="repeat" size={18} color={colors.foreground} />
          <Text style={[styles.addText, { color: colors.foreground }]}>Transferir entre contas</Text>
        </Pressable>
      )}

      {archived.length > 0 && (
        <View style={{ gap: 8, marginTop: 8 }}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Arquivadas</Text>
          {archived.map((account) => (
            <View
              key={account.id}
              style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.7 }]}
            >
              <Text style={[styles.name, { color: colors.foreground, flex: 1 }]}>{account.name}</Text>
              <Pressable onPress={() => void updateAccount(account.id, { archived: false })} hitSlop={8}>
                <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Reativar</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12, paddingBottom: 60 },
  totalCard: { borderRadius: 20, padding: 20, gap: 4 },
  totalLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4 },
  totalValue: { fontSize: 30, fontFamily: "Inter_700Bold" },
  totalHint: { fontSize: 12, fontFamily: "Inter_500Medium" },
  intro: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  balance: { fontSize: 15, fontFamily: "Inter_700Bold" },
  add: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 16 },
  addText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4 },
});
