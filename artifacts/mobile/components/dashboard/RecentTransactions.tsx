import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { EmptyState } from "@/components/EmptyState";
import { IconCircle } from "@/components/IconCircle";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, localDayStart, toIsoDay } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/accounts";
import type { Account, Category, Transaction } from "@/lib/types";

const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "Hoje", "Ontem" ou "17 de outubro" para o título de cada grupo de dias. */
function dayLabel(iso: string): string {
  const today = new Date();
  if (iso === toIsoDay(today)) return "Hoje";
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (iso === toIsoDay(yesterday)) return "Ontem";
  const d = localDayStart(iso);
  const base = `${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;
  return d.getFullYear() === today.getFullYear() ? base : `${base} de ${d.getFullYear()}`;
}

interface RecentTransactionsProps {
  recent: Transaction[];
  categories: Category[];
  accounts?: Account[];
}

export function RecentTransactions({ recent, categories, accounts = [] }: RecentTransactionsProps) {
  const colors = useColors();

  return (
    <View style={styles.recentContainer}>
      <View style={styles.recentHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Últimas Atividades
        </Text>
        {recent.length > 0 && (
          <Pressable onPress={() => router.push("/history")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>Ver todas</Text>
          </Pressable>
        )}
      </View>

      {recent.length === 0 ? (
        <EmptyState
          icon="activity"
          title="Nenhuma atividade"
          description="Registre uma transação usando o botão + abaixo."
        />
      ) : (
        <View style={styles.recentList}>
          {recent.map((item, idx) => {
            const cat = categories.find((c) => c.id === item.categoryId);
            const icon = cat?.icon || "grid";
            const color = cat?.color || colors.mutedForeground;
            const account = accounts.find((a) => a.id === item.accountId);
            const method = paymentMethodLabel(item.paymentMethod);
            const detail = [cat?.name, account?.name, method].filter(Boolean).join(" · ");
            const showDay = idx === 0 || recent[idx - 1].date !== item.date;

            return (
              <React.Fragment key={item.id}>
                {showDay ? (
                  <Text style={[styles.dayTitle, { color: colors.mutedForeground }, idx > 0 && { marginTop: 8 }]}>
                    {dayLabel(item.date)}
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => router.push(`/transaction/${item.id}`)}
                  style={({ pressed }) => [
                    styles.transactionRow,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <IconCircle name={icon} color={color} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.transactionTitle, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {item.description}
                    </Text>
                    {detail ? (
                      <Text style={[styles.transactionDate, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {detail}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: "Inter_700Bold",
                      color: item.type === "income" ? colors.income : colors.foreground,
                    }}
                  >
                    {item.type === "income" ? "+" : "-"} {formatCurrency(item.amount)}
                  </Text>
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  recentContainer: {
    gap: 10,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  recentList: {
    gap: 8,
  },
  dayTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  transactionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  transactionDate: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
});
