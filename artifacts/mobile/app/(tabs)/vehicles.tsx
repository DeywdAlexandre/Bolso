import React, { useMemo } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { IconCircle } from "@/components/IconCircle";
import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { OilStatusChip } from "@/components/vehicle/OilStatusChip";
import { VehiclesSummaryCard } from "@/components/vehicle/VehiclesSummaryCard";
import { formatCurrency, toIsoDay } from "@/lib/format";
import { computeMonthComparison } from "@/lib/vehicleSummary";
import {
  computeVehicleStats,
  formatKm,
  formatKmPerLiter,
  FUEL_TYPE_LABELS,
} from "@/lib/vehicleStats";

export default function VehiclesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { vehicles, fuelings, oilChanges, vehicleExpenses } = useAppData();

  const sorted = useMemo(
    () => [...vehicles].sort((a, b) => a.name.localeCompare(b.name)),
    [vehicles],
  );

  const monthKey = toIsoDay(new Date()).slice(0, 7);
  const summary = useMemo(
    () => computeMonthComparison({ fuelings, oilChanges, expenses: vehicleExpenses }, monthKey),
    [fuelings, oilChanges, vehicleExpenses, monthKey],
  );

  const topPad = Platform.OS === "web" ? 15 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.headerBackground, { backgroundColor: colors.primary, height: topPad + 110 }]} />
      
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad + 12,
          paddingBottom: 120,
          paddingHorizontal: 20,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.primaryForeground }]}>Veículos</Text>
            <Text style={[styles.subtitle, { color: colors.primaryForeground + "cc" }]}>
              Gestão de consumo e manutenção
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/vehicle/new")}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.primaryForeground + "22", opacity: pressed ? 0.85 : 1 },
            ]}
            hitSlop={6}
          >
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          </Pressable>
        </View>

        {sorted.length > 0 && <VehiclesSummaryCard monthKey={monthKey} summary={summary} />}

        {sorted.length === 0 ? (
          <View style={{ paddingTop: 40 }}>
            <EmptyState
              icon="truck"
              title="Nenhum veículo cadastrado"
              description="Toque em + para adicionar seu primeiro veículo e começar a registrar abastecimentos e trocas de óleo."
            />
          </View>
        ) : (
          sorted.map((v) => {
            const stats = computeVehicleStats(v, fuelings, oilChanges, vehicleExpenses);
            const accent = v.color || colors.primary;
            return (
              <Pressable
                key={v.id}
                onPress={() => router.push(`/vehicle/${v.id}`)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={styles.cardHead}>
                  <IconCircle name={v.icon || "truck"} color={accent} size={48} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.vName, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {v.name}
                    </Text>
                    <Text
                      style={[styles.vMeta, { color: colors.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {FUEL_TYPE_LABELS[v.fuelType] ?? v.fuelType}
                      {v.plate ? ` · ${v.plate}` : ""}
                      {stats.lastOdometer != null
                        ? ` · ${formatKm(stats.lastOdometer)} km`
                        : ""}
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={20}
                    color={colors.mutedForeground}
                  />
                </View>

                <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
                  <Stat
                    label="KM/L médio"
                    value={
                      stats.avgKmPerLiter != null
                        ? formatKmPerLiter(stats.avgKmPerLiter)
                        : "—"
                    }
                  />
                  <Stat
                    label="R$/km"
                    value={
                      stats.avgCostPerKm != null
                        ? formatCurrency(stats.avgCostPerKm)
                        : "—"
                    }
                  />
                  <Stat
                    label="Próx. óleo"
                    value={
                      stats.kmRemainingOil != null
                        ? `${formatKm(Math.max(stats.kmRemainingOil, 0))} km`
                        : "—"
                    }
                    color={
                      stats.oilStatus === "overdue"
                        ? colors.destructive
                        : stats.oilStatus === "soon"
                          ? colors.accent
                          : undefined
                    }
                  />
                </View>

                <OilStatusChip stats={stats} />

                <View style={styles.quickRow}>
                  <QuickAction
                    icon="droplet"
                    label="Abastecer"
                    onPress={() => router.push(`/fueling/new?vehicleId=${v.id}`)}
                  />
                  <QuickAction
                    icon="settings"
                    label={stats.lastOilChange ? "Troca de óleo" : "Registrar óleo"}
                    onPress={() => router.push(`/oilchange/new?vehicleId=${v.id}`)}
                  />
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickBtn,
        { backgroundColor: colors.primary + "15", opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Feather name={icon} size={14} color={colors.primary} />
      <Text style={{ color: colors.primary, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{label}</Text>
    </Pressable>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
      <Text
        style={{
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          color: colors.mutedForeground,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 15,
          fontFamily: "Inter_700Bold",
          color: color ?? colors.foreground,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  vName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  vMeta: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  quickRow: { flexDirection: "row", gap: 10 },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: "row",
    paddingTop: 14,
    borderTopWidth: 1,
  },
});
