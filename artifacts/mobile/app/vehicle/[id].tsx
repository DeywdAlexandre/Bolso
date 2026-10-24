import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";

import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { toIsoDay } from "@/lib/format";
import { computeMonthComparison } from "@/lib/vehicleSummary";
import { consumptionSeries, costBreakdown, priceSeries } from "@/lib/vehicleCharts";
import { formatKmPerLiter } from "@/lib/vehicleStats";
import { formatCurrency } from "@/lib/format";
import { useVehicle } from "@/hooks/useVehicle";

import { VehicleHeaderCard } from "@/components/vehicle/VehicleHeaderCard";
import { VehicleActionsRow } from "@/components/vehicle/VehicleActionsRow";
import { VehicleStatsGrid } from "@/components/vehicle/VehicleStatsGrid";
import { VehicleSegmentsCard } from "@/components/vehicle/VehicleSegmentsCard";
import { VehicleOilCard } from "@/components/vehicle/VehicleOilCard";
import { VehicleHistoryList } from "@/components/vehicle/VehicleHistoryList";
import { BarChart } from "@/components/vehicle/BarChart";
import { VehicleRemindersCard } from "@/components/vehicle/VehicleRemindersCard";
import { CostBreakdownCard } from "@/components/vehicle/CostBreakdownCard";
import { ExtraExpenseModal } from "@/components/vehicle/ExtraExpenseModal";

type Tab = "overview" | "consumption" | "history";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Visão geral" },
  { key: "consumption", label: "Consumo" },
  { key: "history", label: "Histórico" },
];

export default function VehicleDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const {
    vehicle,
    stats,
    entries,
    extraModalVisible,
    setExtraModalVisible,
    handleDeleteVehicle,
    handleDeleteEntry,
  } = useVehicle(id);

  const { fuelings, oilChanges, vehicleExpenses } = useAppData();
  const monthSpent = useMemo(
    () =>
      computeMonthComparison(
        {
          fuelings: fuelings.filter((f) => f.vehicleId === id),
          oilChanges: oilChanges.filter((o) => o.vehicleId === id),
          expenses: vehicleExpenses.filter((e) => e.vehicleId === id),
        },
        toIsoDay(new Date()).slice(0, 7),
      ).spent,
    [fuelings, oilChanges, vehicleExpenses, id],
  );

  const [tab, setTab] = useState<Tab>("overview");
  const myFuelings = useMemo(() => fuelings.filter((f) => f.vehicleId === id), [fuelings, id]);
  const breakdown = useMemo(
    () =>
      costBreakdown({
        fuelings: myFuelings,
        oilChanges: oilChanges.filter((o) => o.vehicleId === id),
        expenses: vehicleExpenses.filter((e) => e.vehicleId === id),
      }),
    [myFuelings, oilChanges, vehicleExpenses, id],
  );

  if (!vehicle || !stats) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: colors.mutedForeground }}>Veículo não encontrado</Text>
      </View>
    );
  }

  const accent = vehicle.color || colors.primary;

  return (
    <>
      <Stack.Screen
        options={{
          title: vehicle.name,
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 4 }}>
              <Pressable
                onPress={() => router.push(`/vehicle/new?id=${vehicle.id}`)}
                hitSlop={8}
                style={{ padding: 6 }}
              >
                <Feather name="edit-2" size={18} color={colors.foreground} />
              </Pressable>
              <Pressable
                onPress={handleDeleteVehicle}
                hitSlop={8}
                style={{ padding: 6 }}
              >
                <Feather name="trash-2" size={18} color={colors.destructive} />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
      >
        <VehicleHeaderCard vehicle={vehicle} accent={accent} stats={stats} />

        <VehicleActionsRow
          vehicleId={vehicle.id}
          onOpenExtraExpense={() => setExtraModalVisible(true)}
        />

        <View style={styles.tabs}>
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[
                  styles.tab,
                  { backgroundColor: active ? accent : colors.card, borderColor: active ? accent : colors.border },
                ]}
              >
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? colors.primaryForeground : colors.mutedForeground }}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === "overview" && (
          <>
            <VehicleStatsGrid stats={stats} monthSpent={monthSpent} />
            <VehicleOilCard stats={stats} />
            <VehicleRemindersCard vehicleId={vehicle.id} />
            <CostBreakdownCard breakdown={breakdown} />
          </>
        )}

        {tab === "consumption" && (
          <>
            <BarChart
              title="Consumo por trecho (km/L)"
              points={consumptionSeries(stats.segments)}
              color={accent}
              format={formatKmPerLiter}
              empty="Precisa de pelo menos dois trechos medidos para mostrar a evolução."
            />
            <BarChart
              title="Preço do litro"
              points={priceSeries(myFuelings)}
              color={colors.accent}
              format={formatCurrency}
              empty="Precisa de pelo menos dois abastecimentos para mostrar a evolução."
            />
            <VehicleSegmentsCard segments={stats.segments} openSegment={stats.openSegment} />
          </>
        )}

        {tab === "history" && <VehicleHistoryList entries={entries} onDeleteEntry={handleDeleteEntry} />}
      </ScrollView>

      <ExtraExpenseModal
        visible={extraModalVisible}
        onClose={() => setExtraModalVisible(false)}
        vehicleId={vehicle.id}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  container: {
    padding: 20,
    paddingBottom: 60,
    gap: 16,
  },
});
