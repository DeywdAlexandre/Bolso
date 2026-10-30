import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { useColors } from "@/hooks/useColors";
import { donutSlices } from "@/lib/spendingAnalysis";

type Item = { id: string; value: number; color: string };

/** Anel de rosca: cada fatia é uma categoria; tocar numa fatia a seleciona. O centro recebe `children`. */
export function DonutChart({
  items,
  selectedId,
  onSelect,
  size = 230,
  stroke = 28,
  children,
}: {
  items: Item[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const colors = useColors();
  const r = (size - stroke - 8) / 2;
  const c = 2 * Math.PI * r;
  const mid = size / 2;
  const slices = donutSlices(items.map((i) => ({ id: i.id, value: i.value })));
  const colorOf = new Map(items.map((i) => [i.id, i.color]));

  return (
    <View style={{ width: size, height: size, alignSelf: "center" }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${mid}, ${mid}`}>
          <Circle cx={mid} cy={mid} r={r} stroke={colors.muted} strokeWidth={stroke} fill="none" />
          {slices.map((s) => {
            const active = selectedId === s.id;
            const dim = selectedId !== null && !active;
            return (
              <Circle
                key={s.id}
                cx={mid}
                cy={mid}
                r={r}
                fill="none"
                stroke={colorOf.get(s.id)}
                strokeWidth={active ? stroke + 8 : stroke}
                strokeOpacity={dim ? 0.3 : 1}
                strokeDasharray={`${s.length * c} ${c}`}
                strokeDashoffset={-s.start * c}
                onPress={() => onSelect(active ? null : s.id)}
              />
            );
          })}
        </G>
      </Svg>
      <View pointerEvents="none" style={styles.center}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", paddingHorizontal: 44 },
});
