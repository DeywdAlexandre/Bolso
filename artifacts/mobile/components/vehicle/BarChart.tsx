import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { SeriesPoint } from "@/lib/vehicleCharts";

const BAR_AREA = 90;

/** Gráfico de barras simples (sem biblioteca nativa): valor em cima, data embaixo. */
export function BarChart({
  title,
  points,
  color,
  format,
  empty,
}: {
  title: string;
  points: SeriesPoint[];
  color: string;
  format: (v: number) => string;
  empty: string;
}) {
  const colors = useColors();
  const max = Math.max(...points.map((p) => p.value), 0);
  const avg = points.length ? points.reduce((s, p) => s + p.value, 0) / points.length : 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {points.length > 0 && (
          <Text style={[styles.avg, { color: colors.mutedForeground }]}>média {format(avg)}</Text>
        )}
      </View>
      {points.length < 2 ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>{empty}</Text>
      ) : (
        <View style={styles.row}>
          {points.map((p, i) => {
            const isLast = i === points.length - 1;
            const h = max > 0 ? Math.max((p.value / max) * BAR_AREA, 4) : 4;
            return (
              <View key={`${p.label}-${i}`} style={styles.col}>
                <Text style={[styles.value, { color: isLast ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
                  {format(p.value)}
                </Text>
                <View style={{ height: BAR_AREA, justifyContent: "flex-end" }}>
                  <View style={{ height: h, borderRadius: 6, backgroundColor: color, opacity: isLast ? 1 : 0.55 }} />
                </View>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>{p.label}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  title: { fontSize: 14, fontFamily: "Inter_700Bold" },
  avg: { fontSize: 11, fontFamily: "Inter_500Medium" },
  empty: { fontSize: 12, fontFamily: "Inter_500Medium" },
  row: { flexDirection: "row", gap: 6, alignItems: "flex-end" },
  col: { flex: 1, alignItems: "stretch", gap: 4 },
  value: { fontSize: 10, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  label: { fontSize: 9, fontFamily: "Inter_500Medium", textAlign: "center" },
});
