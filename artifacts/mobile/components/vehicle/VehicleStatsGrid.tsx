import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  formatKm,
  formatKmPerLiter,
} from "@/lib/vehicleStats";

interface VehicleStatsGridProps {
  stats: {
    avgKmPerLiter: number | null;
    recentKmPerLiter: number | null;
    avgCostPerKm: number | null;
    totalKm: number;
    totalSpentAllTime: number;
  };
  /** Gasto do mês corrente (combustível + óleo + extras). */
  monthSpent: number;
}

export function VehicleStatsGrid({ stats, monthSpent }: VehicleStatsGridProps) {
  return (
    <View style={{ gap: 10 }}>
    <View style={styles.statsGrid}>
      <BigStat
        label="KM/L médio"
        value={
          stats.avgKmPerLiter != null
            ? formatKmPerLiter(stats.avgKmPerLiter)
            : "—"
        }
        sub={
          stats.recentKmPerLiter != null && stats.recentKmPerLiter !== stats.avgKmPerLiter
            ? `Último: ${formatKmPerLiter(stats.recentKmPerLiter)}`
            : "Média geral"
        }
      />
      <BigStat
        label="R$ por km"
        value={
          stats.avgCostPerKm != null
            ? formatCurrency(stats.avgCostPerKm)
            : "—"
        }
        sub={
          stats.totalKm > 0
            ? `${formatKm(stats.totalKm)} km medidos`
            : "Sem dados ainda"
        }
      />
    </View>
    <View style={styles.statsGrid}>
      <BigStat label="Gasto no mês" value={formatCurrency(monthSpent)} sub="Combustível, óleo e extras" />
      <BigStat label="Custo total" value={formatCurrency(stats.totalSpentAllTime)} sub="Desde o primeiro registro" />
    </View>
    </View>
  );
}

interface BigStatProps {
  label: string;
  value: string;
  sub: string;
}

function BigStat({ label, value, sub }: BigStatProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.bigStat,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.bigStatLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.bigStatValue, { color: colors.foreground }]}>
        {value}
      </Text>
      <Text style={[styles.bigStatSub, { color: colors.mutedForeground }]}>
        {sub}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  bigStat: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
  },
  bigStatLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  bigStatValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  bigStatSub: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
});
