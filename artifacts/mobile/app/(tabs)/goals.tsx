import React, { useMemo } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/format";

export default function GoalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { goals, ready } = useAppData();

  const topPad = Platform.OS === "web" ? 15 : insets.top;

  const totalSaved = useMemo(() => {
    return goals.reduce((acc, g) => acc + g.currentAmount, 0);
  }, [goals]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerBackground, { backgroundColor: colors.primary, height: topPad + 160 }]} />
      
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={[styles.subtitle, { color: colors.primaryForeground + "cc" }]}>Meu Futuro</Text>
          <Text style={[styles.title, { color: colors.primaryForeground }]}>Metas & Sonhos</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={[styles.badgeLabel, { color: colors.primaryForeground + "aa" }]}>Total Poupado</Text>
          <Text style={[styles.badgeValue, { color: colors.primaryForeground }]}>{formatCurrency(totalSaved)}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {goals.length === 0 ? (
          <View style={{ paddingTop: 40 }}>
            <EmptyState
              icon="flag"
              title="Comece seu primeiro sonho"
              description="Crie metas para trocar de carro, viajar ou apenas criar um hábito de poupar mensalmente."
            />
            <Pressable
              onPress={() => router.push("/goals/new")}
              style={[styles.createBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>Criar minha primeira meta</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.grid}>
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </View>
        )}
      </ScrollView>

      {goals.length > 0 && (
        <Pressable
          onPress={() => router.push("/goals/new")}
          style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 80 }]}
        >
          <Feather name="plus" size={24} color={colors.primaryForeground} />
        </Pressable>
      )}
    </View>
  );
}

function GoalCard({ goal }: { goal: import("@/lib/types").Goal }) {
  const colors = useColors();
  const progress = goal.targetAmount ? Math.min(1, goal.currentAmount / goal.targetAmount) : 0;
  
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/goals/[id]", params: { id: goal.id } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.9 : 1 }
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: goal.color + "15" }]}>
          <Text style={{ fontSize: 20 }}>{goal.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.goalName, { color: colors.foreground }]} numberOfLines={1}>{goal.name}</Text>
          <Text style={[styles.goalType, { color: colors.mutedForeground }]}>
            {goal.type === "target_value" ? "Meta de Valor" : "Hábito Mensal"}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.amountRow}>
          <Text style={[styles.currentAmount, { color: colors.primary }]}>{formatCurrency(goal.currentAmount)}</Text>
          {goal.targetAmount && (
            <Text style={[styles.targetAmount, { color: colors.mutedForeground }]}> de {formatCurrency(goal.targetAmount)}</Text>
          )}
        </View>
        
        {goal.targetAmount ? (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progress * 100}%` }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.mutedForeground }]}>{Math.round(progress * 100)}%</Text>
          </View>
        ) : (
          <View style={styles.habitInfo}>
            <Feather name="repeat" size={12} color={colors.mutedForeground} />
            <Text style={[styles.habitText, { color: colors.mutedForeground }]}>
              Aporte: {formatCurrency(goal.monthlyAmount || 0)}/mês
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  headerBadge: {
    alignItems: "flex-end",
  },
  badgeLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
  },
  badgeValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  grid: {
    gap: 16,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 20,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  goalName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  goalType: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  cardBody: {
    gap: 12,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  currentAmount: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  targetAmount: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    minWidth: 35,
  },
  habitInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  habitText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createBtn: {
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  createBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
