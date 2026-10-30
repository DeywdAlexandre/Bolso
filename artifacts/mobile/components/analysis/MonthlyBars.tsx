import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { formatCurrencyCompact } from "@/lib/format";
import type { MonthBar } from "@/lib/spendingAnalysis";

const AREA = 110;

/** Entradas (verde) e saídas (vermelho) mês a mês; o mês selecionado fica em destaque. */
export function MonthlyBars({ bars, activeKey }: { bars: MonthBar[]; activeKey: string | null }) {
  const colors = useColors();
  const max = Math.max(...bars.flatMap((b) => [b.income, b.expense]), 1);
  const h = (v: number) => (v > 0 ? Math.max((v / max) * AREA, 4) : 0);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.foreground }]}>Mês a mês</Text>
        <View style={styles.legend}>
          <Dot color={colors.income} label="Entrou" />
          <Dot color={colors.destructive} label="Saiu" />
        </View>
      </View>
      <View style={styles.row}>
        {bars.map((b) => {
          const active = b.key === activeKey;
          return (
            <View key={b.key} style={[styles.col, { opacity: activeKey && !active ? 0.55 : 1 }]}>
              <Text style={[styles.value, { color: colors.mutedForeground }]} numberOfLines={1}>
                {b.expense > 0 ? formatCurrencyCompact(b.expense) : ""}
              </Text>
              <View style={styles.pair}>
                <View style={[styles.bar, { height: h(b.income), backgroundColor: colors.income }]} />
                <View style={[styles.bar, { height: h(b.expense), backgroundColor: colors.destructive }]} />
              </View>
              <Text style={[styles.label, { color: active ? colors.foreground : colors.mutedForeground, fontFamily: active ? "Inter_700Bold" : "Inter_500Medium" }]}>
                {b.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Dot({ color, label }: { color: string; label: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_500Medium" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 14 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 14, fontFamily: "Inter_700Bold" },
  legend: { flexDirection: "row", gap: 12 },
  row: { flexDirection: "row", gap: 4, alignItems: "flex-end" },
  col: { flex: 1, alignItems: "center", gap: 4 },
  pair: { height: AREA, flexDirection: "row", alignItems: "flex-end", gap: 2 },
  bar: { width: 9, borderRadius: 4 },
  value: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  label: { fontSize: 10, textTransform: "capitalize" },
});
