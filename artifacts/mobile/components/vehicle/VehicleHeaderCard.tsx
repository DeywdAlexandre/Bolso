import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { IconCircle } from "@/components/IconCircle";
import { useColors } from "@/hooks/useColors";
import { FUEL_TYPE_LABELS } from "@/lib/vehicleStats";
import { OilStatusChip } from "@/components/vehicle/OilStatusChip";
import { formatKm, type VehicleStats } from "@/lib/vehicleStats";
import type { Vehicle } from "@/lib/types";

interface VehicleHeaderCardProps {
  vehicle: Vehicle;
  accent: string;
  stats: Pick<VehicleStats, "lastOdometer" | "oilStatus" | "kmRemainingOil">;
}

export function VehicleHeaderCard({ vehicle, accent, stats }: VehicleHeaderCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {vehicle.photo ? <Image source={{ uri: vehicle.photo }} style={styles.photo} resizeMode="cover" /> : null}
      <View style={styles.top}>
        <IconCircle name={vehicle.icon || "truck"} color={accent} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.vName, { color: colors.foreground }]} numberOfLines={1}>
            {vehicle.name}
          </Text>
          <Text style={[styles.vMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {FUEL_TYPE_LABELS[vehicle.fuelType] ?? vehicle.fuelType}
            {vehicle.plate ? ` · ${vehicle.plate}` : ""}
          </Text>
        </View>
      </View>
      {stats.lastOdometer != null && (
        <View style={styles.odoRow}>
          <Text style={[styles.odo, { color: colors.foreground }]}>{formatKm(stats.lastOdometer)}</Text>
          <Text style={[styles.odoUnit, { color: colors.mutedForeground }]}>km rodados</Text>
        </View>
      )}
      <OilStatusChip stats={stats} />
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { width: "100%", height: 160, borderRadius: 12 },
  top: { flexDirection: "row", alignItems: "center", gap: 14 },
  odoRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  odo: { fontSize: 34, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  odoUnit: { fontSize: 13, fontFamily: "Inter_500Medium" },
  headerCard: {
    gap: 14,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  vName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  vMeta: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
});
