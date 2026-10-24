import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/format";
import type { CostBreakdown } from "@/lib/vehicleCharts";

/** Para onde vai o dinheiro do veículo: barra proporcional + legenda por categoria. */
export function CostBreakdownCard({ breakdown }: { breakdown: CostBreakdown }) {
  const colors = useColors();
  const parts = [
    { label: "Combustível", value: breakdown.fuel, color: colors.primary },
    { label: "Óleo", value: breakdown.oil, color: colors.accent },
    { label: "Gastos extras", value: breakdown.extras, color: colors.mutedForeground },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Para onde vai o dinheiro</Text>
      {breakdown.total <= 0 ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>Sem gastos registrados ainda.</Text>
      ) : (
        <>
          <View style={[styles.bar, { backgroundColor: colors.muted }]}>
            {parts
              .filter((p) => p.value > 0)
              .map((p) => (
                <View key={p.label} style={{ flex: p.value, backgroundColor: p.color }} />
              ))}
          </View>
          {parts.map((p) => (
            <View key={p.label} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: p.color }]} />
              <Text style={[styles.legendLabel, { color: colors.foreground }]}>{p.label}</Text>
              <Text style={[styles.legendPct, { color: colors.mutedForeground }]}>
                {Math.round((p.value / breakdown.total) * 100)}%
              </Text>
              <Text style={[styles.legendValue, { color: colors.foreground }]}>{formatCurrency(p.value)}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  title: { fontSize: 14, fontFamily: "Inter_700Bold" },
  empty: { fontSize: 12, fontFamily: "Inter_500Medium" },
  bar: { flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden" },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  legendPct: { fontSize: 12, fontFamily: "Inter_500Medium", width: 36, textAlign: "right" },
  legendValue: { fontSize: 13, fontFamily: "Inter_700Bold", minWidth: 80, textAlign: "right" },
});
