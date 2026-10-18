import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";

import { InvoiceStatusBadge } from "@/components/accounts/InvoiceStatusBadge";
import { TransactionItem } from "@/components/TransactionItem";
import { useAppData } from "@/contexts/AppDataContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { useCards } from "@/hooks/useCards";
import { formatCurrency, formatDate, getMonthName } from "@/lib/format";

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return `${getMonthName(m! - 1)} ${y}`;
};

export default function CardScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { categories, accounts } = useAppData();
  const { settings } = useSettings();
  const found = useCards().find((c) => c.card.id === id);

  const invoices = found?.summary.invoices ?? [];
  const currentKey = found?.summary.current?.key;
  const [index, setIndex] = useState<number | null>(null);

  // Começa na fatura atual (ou na mais recente, se não houver fatura aberta).
  const defaultIndex = useMemo(() => {
    if (invoices.length === 0) return 0;
    const i = invoices.findIndex((inv) => inv.key === currentKey);
    return i >= 0 ? i : invoices.length - 1;
  }, [invoices, currentKey]);
  useEffect(() => setIndex(null), [id]);

  if (!found) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Cartão não encontrado.</Text>
      </View>
    );
  }

  const { card, summary } = found;
  const i = Math.min(Math.max(index ?? defaultIndex, 0), Math.max(invoices.length - 1, 0));
  const invoice = invoices[i];

  const payFrom = (() => {
    const banks = accounts.filter((a) => !a.archived && a.kind !== "card");
    return banks.find((a) => a.id === settings.defaultAccountId)?.id ?? banks[0]?.id;
  })();

  const payInvoice = () => {
    if (!invoice) return;
    router.push({
      pathname: "/accounts/transfer",
      params: { from: payFrom ?? "", to: card.id, amount: String(invoice.remaining), note: `Fatura ${monthLabel(invoice.key)}` },
    } as any);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: card.name,
          headerRight: () => (
            <Pressable onPress={() => router.push(`/accounts/${card.id}` as any)} hitSlop={8} style={{ padding: 6 }}>
              <Feather name="edit-2" size={18} color={colors.foreground} />
            </Pressable>
          ),
        }}
      />
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
        <View style={[styles.hero, { backgroundColor: card.color }]}>
          <Text style={styles.heroLabel}>Dívida no cartão</Text>
          <Text style={styles.heroValue}>{formatCurrency(Math.max(summary.debt, 0))}</Text>
          {card.creditLimit ? (
            <>
              <View style={styles.limitTrack}>
                <View style={[styles.limitFill, { width: `${Math.min(100, (summary.limitUsed / card.creditLimit) * 100)}%` }]} />
              </View>
              <Text style={styles.heroSub}>
                Limite usado {formatCurrency(summary.limitUsed)} de {formatCurrency(card.creditLimit)} · disponível{" "}
                {formatCurrency(summary.limitAvailable ?? 0)}
              </Text>
            </>
          ) : null}
          {summary.overdueOrClosed > 0 && (
            <Text style={styles.heroSub}>Fechada/a pagar: {formatCurrency(summary.overdueOrClosed)}</Text>
          )}
        </View>

        {invoice ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.nav}>
              <Pressable onPress={() => setIndex(i - 1)} disabled={i === 0} hitSlop={10} style={{ opacity: i === 0 ? 0.3 : 1 }}>
                <Feather name="chevron-left" size={22} color={colors.foreground} />
              </Pressable>
              <View style={{ alignItems: "center", gap: 4 }}>
                <Text style={[styles.navTitle, { color: colors.foreground }]}>Fatura de {monthLabel(invoice.key)}</Text>
                <InvoiceStatusBadge status={invoice.status} />
              </View>
              <Pressable
                onPress={() => setIndex(i + 1)}
                disabled={i >= invoices.length - 1}
                hitSlop={10}
                style={{ opacity: i >= invoices.length - 1 ? 0.3 : 1 }}
              >
                <Feather name="chevron-right" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={styles.totals}>
              <Text style={[styles.total, { color: colors.foreground }]}>{formatCurrency(invoice.total)}</Text>
              <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                Fecha em {formatDate(invoice.closingDate)} · vence em {formatDate(invoice.dueDate)}
              </Text>
              {invoice.paid > 0 && (
                <Text style={[styles.sub, { color: colors.income }]}>
                  Pago {formatCurrency(invoice.paid)} · falta {formatCurrency(invoice.remaining)}
                </Text>
              )}
            </View>

            {invoice.remaining > 0 && invoice.status !== "future" && (
              <Pressable
                onPress={payInvoice}
                style={({ pressed }) => [styles.payBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              >
                <Feather name="check-circle" size={16} color={colors.primaryForeground} />
                <Text style={[styles.payText, { color: colors.primaryForeground }]}>
                  Pagar {formatCurrency(invoice.remaining)}
                </Text>
              </Pressable>
            )}

            <View style={{ marginTop: 4 }}>
              {invoice.items.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <TransactionItem
                    transaction={item}
                    category={categories.find((c) => c.id === item.categoryId)}
                    onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: item.id } })}
                  />
                  {idx < invoice.items.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              Nenhuma compra neste cartão ainda. Lance um gasto escolhendo este cartão como conta.
            </Text>
          </View>
        )}

        <Pressable
          onPress={() => router.push({ pathname: "/transaction/new", params: { account: card.id } } as any)}
          style={({ pressed }) => [styles.add, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
        >
          <Feather name="plus" size={18} color={colors.primaryForeground} />
          <Text style={[styles.addText, { color: colors.primaryForeground }]}>Nova compra no cartão</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push({ pathname: "/cards/import", params: { id: card.id } } as any)}
          style={({ pressed }) => [
            styles.add,
            { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="file-text" size={18} color={colors.foreground} />
          <Text style={[styles.addText, { color: colors.foreground }]}>Importar fatura com IA</Text>
        </Pressable>

        {summary.groups.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={[styles.section, { color: colors.mutedForeground }]}>Parcelas faltantes</Text>
            {summary.groups.map((g) => (
              <View key={g.groupId} style={[styles.groupRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.groupName, { color: colors.foreground }]} numberOfLines={1}>
                    {g.description}
                  </Text>
                  <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                    Faltam {g.remaining} de {g.total} · {formatCurrency(g.installmentAmount)}/mês
                  </Text>
                </View>
                <Text style={[styles.groupAmount, { color: colors.foreground }]}>{formatCurrency(g.remainingAmount)}</Text>
              </View>
            ))}
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              Já lançado para as próximas faturas: {formatCurrency(summary.futureTotal)}
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16, paddingBottom: 60 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { borderRadius: 20, padding: 20, gap: 6 },
  heroLabel: { color: "#ffffffcc", fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4 },
  heroValue: { color: "#ffffff", fontSize: 30, fontFamily: "Inter_700Bold" },
  heroSub: { color: "#ffffffcc", fontSize: 12, fontFamily: "Inter_500Medium" },
  limitTrack: { height: 6, borderRadius: 3, backgroundColor: "#ffffff40", overflow: "hidden", marginTop: 4 },
  limitFill: { height: 6, borderRadius: 3, backgroundColor: "#ffffff" },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 12 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  totals: { alignItems: "center", gap: 4 },
  total: { fontSize: 26, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  payBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 14 },
  payText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  divider: { height: 1 },
  add: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 16 },
  addText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  section: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4 },
  groupRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  groupName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  groupAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
