import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { IconCircle } from "@/components/IconCircle";
import { useColors } from "@/hooks/useColors";
import { formatDate } from "@/lib/format";
import { formatKm } from "@/lib/vehicleStats";
import type { OilChange } from "@/lib/types";

interface VehicleOilCardProps {
  stats: {
    oilStatus: "ok" | "soon" | "overdue" | "unknown";
    lastOilChange: OilChange | null;
    nextOilChangeAt: number | null;
    kmRemainingOil: number | null;
  };
}

export function VehicleOilCard({ stats }: VehicleOilCardProps) {
  const colors = useColors();

  const oilColor =
    stats.oilStatus === "overdue"
      ? colors.destructive
      : stats.oilStatus === "soon"
        ? colors.accent
        : colors.foreground;

  return (
    <View
      style={[
        styles.oilCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconCircle
          name="settings"
          color={
            stats.oilStatus === "overdue"
              ? colors.destructive
              : stats.oilStatus === "soon"
                ? colors.accent
                : colors.primary
          }
          size={40}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.oilTitle, { color: colors.foreground }]}>
            Próxima troca de óleo
          </Text>
          {stats.lastOilChange ? (
            <Text style={[styles.oilSub, { color: colors.mutedForeground }]}>
              Última em {formatDate(stats.lastOilChange.date)} ·{" "}
              {formatKm(stats.lastOilChange.odometer)} km
            </Text>
          ) : (
            <Text style={[styles.oilSub, { color: colors.mutedForeground }]}>
              Nenhuma troca registrada ainda
            </Text>
          )}
        </View>
      </View>

      {stats.nextOilChangeAt != null ? (
        <View style={styles.oilBigRow}>
          <View>
            <Text style={[styles.oilBigLabel, { color: colors.mutedForeground }]}>
              Trocar em
            </Text>
            <Text style={[styles.oilBigValue, { color: colors.foreground }]}>
              {formatKm(stats.nextOilChangeAt)} km
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.oilBigLabel, { color: colors.mutedForeground }]}>
              {(stats.kmRemainingOil ?? 0) <= 0 ? "Atrasado" : "Faltam"}
            </Text>
            <Text style={[styles.oilBigValue, { color: oilColor }]}>
              {formatKm(Math.abs(stats.kmRemainingOil ?? 0))} km
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  oilCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  oilTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  oilSub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  oilBigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  oilBigLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  oilBigValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
});
