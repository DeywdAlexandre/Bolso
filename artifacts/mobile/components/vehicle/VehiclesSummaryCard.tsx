import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/format";
import { formatKm, formatLiters } from "@/lib/vehicleStats";
import type { MonthComparison } from "@/lib/vehicleSummary";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Resumo do mês corrente de todos os veículos: gasto (com comparação), km e litros. */
export function VehiclesSummaryCard({ monthKey, summary }: { monthKey: string; summary: MonthComparison }) {
  const colors = useColors();
  const month = MONTHS[Number(monthKey.slice(5, 7)) - 1] ?? "";
  const delta = summary.deltaPct;
  // Gastar menos que no mês anterior é bom (verde); mais é alerta.
  const deltaColor = delta == null ? colors.mutedForeground : delta > 0 ? colors.destructive : colors.income;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>Gasto em {month}</Text>
      <Text style={[styles.big, { color: colors.foreground }]}>{formatCurrency(summary.spent)}</Text>
      <Text style={[styles.delta, { color: deltaColor }]}>
        {delta == null
          ? "Sem gastos no mês anterior para comparar"
          : `${delta > 0 ? "▲" : "▼"} ${Math.abs(Math.round(delta))}% vs. mês anterior (${formatCurrency(summary.previousSpent)})`}
      </Text>
      <View style={[styles.row, { borderTopColor: colors.border }]}>
        <Mini label="Rodados" value={`${formatKm(summary.km)} km`} />
        <Mini label="Litros" value={formatLiters(summary.liters)} />
        <Mini label="Abastec." value={String(summary.fuelings)} />
      </View>
    </View>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 3 }}>
      <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.miniValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 4 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4 },
  big: { fontSize: 28, fontFamily: "Inter_700Bold", marginTop: 2 },
  delta: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  row: { flexDirection: "row", marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  miniLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.4 },
  miniValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
