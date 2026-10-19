import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { IconCircle } from "@/components/IconCircle";
import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/format";

export default function RecurringScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { recurring, categories, updateRecurring, applyRecurring } = useAppData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const sorted = [...recurring].sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  const incomes = sorted.filter((r) => r.type === "income");
  const expenses = sorted.filter((r) => r.type === "expense");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.headerBackground, { backgroundColor: colors.primary, height: topPad + 110 }]} />
      
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.primaryForeground} />
          </Pressable>
          <View>
            <Text style={[styles.title, { color: colors.primaryForeground }]}>Fixos</Text>
            <Text style={[styles.subtitle, { color: colors.primaryForeground + "cc" }]}>
              Lançamentos mensais automáticos
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push("/recurring/new")}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: colors.primaryForeground + "22", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="plus" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {sorted.length === 0 ? (
          <View style={{ paddingTop: 40 }}>
            <EmptyState
              icon="repeat"
              title="Sem recorrências"
              description="Cadastre aluguel, assinaturas, salário e outras transações que se repetem todo mês."
            />
          </View>
        ) : (
          <>
            {expenses.length > 0 ? (
              <Section title="Gastos fixos">
                {expenses.map((r) => (
                  <RecurringRow
                    key={r.id}
                    recurring={r}
                    category={categories.find((c) => c.id === r.categoryId)}
                    onToggle={(active) => void updateRecurring(r.id, { active })}
                    onApply={() => void applyRecurring(r.id)}
                    onPress={() =>
                      router.push({ pathname: "/recurring/[id]", params: { id: r.id } })
                    }
                  />
                ))}
              </Section>
            ) : null}
            {incomes.length > 0 ? (
              <Section title="Entradas fixas">
                {incomes.map((r) => (
                  <RecurringRow
                    key={r.id}
                    recurring={r}
                    category={categories.find((c) => c.id === r.categoryId)}
                    onToggle={(active) => void updateRecurring(r.id, { active })}
                    onApply={() => void applyRecurring(r.id)}
                    onPress={() =>
                      router.push({ pathname: "/recurring/[id]", params: { id: r.id } })
                    }
                  />
                ))}
              </Section>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function RecurringRow({
  recurring,
  category,
  onToggle,
  onApply,
  onPress,
}: {
  recurring: import("@/lib/types").Recurring;
  category: import("@/lib/types").Category | undefined;
  onToggle: (active: boolean) => void;
  onApply: () => void;
  onPress: () => void;
}) {
  const colors = useColors();
      const isIncome = recurring.type === "income";
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const last = recurring.lastApplied ? new Date(recurring.lastApplied) : null;
  const isPaidThisMonth = last && last.getMonth() === month && last.getFullYear() === year;
  const isLate = !isPaidThisMonth && recurring.dayOfMonth < now.getDate();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      <IconCircle
        name={category?.icon ?? "repeat"}
        color={category?.color ?? colors.mutedForeground}
        size={42}
      />
      <View style={styles.rowMiddle}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
            {recurring.description || category?.name || "Recorrente"}
          </Text>
          {recurring.isSubscription && (
            <View style={[styles.assinBadge, { backgroundColor: colors.primary + "15" }]}>
              <Text style={[styles.assinBadgeText, { color: colors.primary }]}>ASSIN</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.rowSub, { color: isLate ? colors.expense : colors.mutedForeground }]} numberOfLines={1}>
            Todo dia {recurring.dayOfMonth}
          </Text>
          {isPaidThisMonth ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.income + "15" }]}>
              <Text style={[styles.statusBadgeText, { color: colors.income }]}>PAGO</Text>
            </View>
          ) : isLate ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.expense + "15" }]}>
              <Text style={[styles.statusBadgeText, { color: colors.expense }]}>ATRASADO</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.rowRight}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={[
                styles.rowAmount,
                { color: isIncome ? colors.income : colors.foreground },
              ]}
            >
              {isIncome ? "+" : "-"} {formatCurrency(recurring.amount)}
            </Text>
            {recurring.active && !isPaidThisMonth && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onApply();
                }}
                style={({ pressed }) => [
                  styles.confirmBtnSmall,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.confirmBtnText}>Efetivar</Text>
              </Pressable>
            )}
          </View>
          <Switch
            value={recurring.active}
            onValueChange={onToggle}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={Platform.OS === "android" ? colors.background : undefined}
          />
        </View>
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
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -10,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowMiddle: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  rowSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  rowRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  rowAmount: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  assinBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  assinBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  annualCost: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: -2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_800ExtraBold",
  },
  confirmBtnSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
});
