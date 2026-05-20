import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { EmptyState } from "@/components/EmptyState";
import { IconCircle } from "@/components/IconCircle";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Category, Transaction } from "@/lib/types";

interface RecentTransactionsProps {
  recent: Transaction[];
  categories: Category[];
}

export function RecentTransactions({ recent, categories }: RecentTransactionsProps) {
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
          {recent.map((item) => {
            const cat = categories.find((c) => c.id === item.categoryId);
            const icon = cat?.icon || "grid";
            const color = cat?.color || colors.mutedForeground;

            return (
              <Pressable
                key={item.id}
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
                  <Text style={[styles.transactionDate, { color: colors.mutedForeground }]}>
                    {formatDate(item.date)}
                  </Text>
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
    gap: 10,
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
