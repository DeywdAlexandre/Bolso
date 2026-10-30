import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconCircle } from "@/components/IconCircle";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/format";
import type { CategoryRow } from "@/lib/spendingAnalysis";
import type { TransactionType } from "@/lib/types";

const pct = (share: number) => `${share >= 0.995 ? 100 : share < 0.01 ? "<1" : Math.round(share * 100)}%`;

/** Categorias do maior para o menor, com barra de participação e variação contra o período anterior. */
export function CategoryList({
  rows,
  type,
  selectedId,
  onSelect,
}: {
  rows: CategoryRow[];
  type: TransactionType;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const colors = useColors();

  return (
    <View style={{ gap: 10 }}>
      {rows.map((r) => {
        const active = selectedId === r.id;
        const rounded = r.deltaPct == null ? null : Math.round(r.deltaPct);
        const same = rounded === 0;
        const up = r.deltaPct != null && r.deltaPct > 0;
        // Para saídas, subir é ruim (vermelho); para entradas, subir é bom (verde).
        const good = type === "expense" ? !up : up;
        const deltaColor = r.deltaPct == null || same ? colors.mutedForeground : good ? colors.income : colors.destructive;
        return (
          <Pressable
            key={r.id}
            onPress={() => onSelect(active ? null : r.id)}
            style={[
              styles.row,
              { backgroundColor: colors.card, borderColor: active ? r.color : colors.border, opacity: selectedId && !active ? 0.6 : 1 },
            ]}
          >
            <IconCircle name={r.icon} color={r.color} size={40} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.top}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={[styles.amount, { color: colors.foreground }]}>{formatCurrency(r.amount)}</Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.muted }]}>
                <View style={{ width: `${Math.max(r.share * 100, 2)}%`, height: "100%", borderRadius: 3, backgroundColor: r.color }} />
              </View>
              <View style={styles.top}>
                <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                  {pct(r.share)} · {r.count} {r.count === 1 ? "lançamento" : "lançamentos"}
                </Text>
                <Text style={[styles.sub, { color: deltaColor, fontFamily: "Inter_600SemiBold" }]}>
                  {r.deltaPct == null ? "novo" : same ? "igual ao anterior" : `${up ? "▲" : "▼"} ${Math.abs(rounded ?? 0)}%`}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, borderWidth: 1.5 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 },
  name: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  amount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  sub: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
