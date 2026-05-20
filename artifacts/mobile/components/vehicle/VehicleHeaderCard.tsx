import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { IconCircle } from "@/components/IconCircle";
import { useColors } from "@/hooks/useColors";
import { FUEL_TYPE_LABELS } from "@/lib/vehicleStats";
import type { Vehicle } from "@/lib/types";

interface VehicleHeaderCardProps {
  vehicle: Vehicle;
  accent: string;
}

export function VehicleHeaderCard({ vehicle, accent }: VehicleHeaderCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
  );
}

const styles = StyleSheet.create({
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
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
