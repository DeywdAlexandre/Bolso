import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { oilStatusInfo } from "@/lib/vehicleSummary";
import type { VehicleStats } from "@/lib/vehicleStats";

/** Faixa colorida com o estado da troca de óleo (em dia / perto / atrasada / sem registro). */
export function OilStatusChip({ stats }: { stats: Pick<VehicleStats, "oilStatus" | "kmRemainingOil"> }) {
  const colors = useColors();
  const { label, tone } = oilStatusInfo(stats);
  const color =
    tone === "overdue" ? colors.destructive : tone === "soon" ? colors.accent : tone === "ok" ? colors.income : colors.mutedForeground;
  const icon = tone === "ok" ? "check-circle" : tone === "unknown" ? "info" : "alert-triangle";

  return (
    <View style={[styles.chip, { backgroundColor: color + "1f" }]}>
      <Feather name={icon} size={13} color={color} />
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  text: { fontSize: 12, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
});
