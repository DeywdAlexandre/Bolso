import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/format";
import type { Goal } from "@/lib/types";

interface GoalsWidgetProps {
  goals: Goal[];
  goalsTotal: number;
  showValue: boolean;
}

export function GoalsWidget({ goals, goalsTotal, showValue }: GoalsWidgetProps) {
  const colors = useColors();

  const activeGoals = goals
    .filter((g) => g.currentAmount < (g.targetAmount ?? 0))
    .slice(0, 2);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={[styles.iconBox, { backgroundColor: colors.primary + "12" }]}>
            <Ionicons name="flag-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Metas de Economia</Text>
        </View>
        <Pressable
          onPress={() => router.push("/goals")}
          style={({ pressed }) => [
            styles.linkBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.linkText, { color: colors.primary }]}>Ver mais</Text>
          <Feather name="chevron-right" size={14} color={colors.primary} />
        </Pressable>
      </View>

      {/* Resumo acumulado */}
      <View style={styles.summaryBox}>
        <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
          Total Economizado
        </Text>
        <Text style={[styles.summaryValue, { color: colors.foreground }]}>
          {showValue ? formatCurrency(goalsTotal) : "••••••"}
        </Text>
      </View>

      {/* Metas ativas */}
      <View style={styles.goalsContainer}>
        {goals.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Nenhuma meta cadastrada. Comece a planejar seus sonhos!
          </Text>
        ) : activeGoals.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Parabéns! Todas as suas metas foram atingidas! 🎉
          </Text>
        ) : (
          <View style={styles.list}>
            {activeGoals.map((goal) => {
              const targetVal = goal.targetAmount ?? 0;
              const pct = targetVal > 0 
                ? Math.min((goal.currentAmount / targetVal) * 100, 100) 
                : 0;

              return (
                <Pressable
                  key={goal.id}
                  onPress={() => router.push(`/goals/${goal.id}`)}
                  style={styles.goalRow}
                >
                  <View style={styles.goalInfo}>
                    <Text style={[styles.goalName, { color: colors.foreground }]} numberOfLines={1}>
                      {goal.name}
                    </Text>
                    <Text style={[styles.goalAmount, { color: colors.mutedForeground }]}>
                      {showValue ? formatCurrency(goal.currentAmount) : "••••••"} de {formatCurrency(targetVal)}
                    </Text>
                  </View>

                  {/* Barra de progresso */}
                  <View style={styles.progressContainer}>
                    <View
                      style={[
                        styles.progressBarBg,
                        { backgroundColor: colors.border },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            backgroundColor: colors.primary,
                            width: `${pct}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressPct, { color: colors.foreground }]}>
                      {pct.toFixed(0)}%
                    </Text>
                  </View>
                </Pressable>
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
  summaryBox: {
    gap: 2,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  goalsContainer: {
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 8,
  },
  list: {
    gap: 16,
  },
  goalRow: {
    gap: 8,
  },
  goalInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    marginRight: 8,
  },
  goalAmount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressPct: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    width: 36,
    textAlign: "right",
  },
});
