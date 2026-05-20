import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { computeVehicleStats, formatKm, formatKmPerLiter } from "@/lib/vehicleStats";
import type { Fueling, OilChange, Vehicle, VehicleExpense } from "@/lib/types";

interface VehiclesWidgetProps {
  vehicles: Vehicle[];
  fuelings: Fueling[];
  oilChanges: OilChange[];
  vehicleExpenses: VehicleExpense[];
}

export function VehiclesWidget({
  vehicles,
  fuelings,
  oilChanges,
  vehicleExpenses,
}: VehiclesWidgetProps) {
  const colors = useColors();

  const getOilStatusDetails = (status: string) => {
    switch (status) {
      case "overdue":
        return { label: "Óleo Vencido", color: colors.destructive };
      case "soon":
        return { label: "Óleo em Breve", color: "#F59E0B" }; // Laranja
      case "ok":
        return { label: "Óleo em Dia", color: colors.income };
      default:
        return { label: "Sem dados de óleo", color: colors.mutedForeground };
    }
  };

  const activeVehicles = vehicles.slice(0, 2);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={[styles.iconBox, { backgroundColor: colors.primary + "12" }]}>
            <Ionicons name="car-sport-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Veículos</Text>
        </View>
        <Pressable
          onPress={() => router.push("/vehicles")}
          style={({ pressed }) => [
            styles.linkBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.linkText, { color: colors.primary }]}>Ver mais</Text>
          <Feather name="chevron-right" size={14} color={colors.primary} />
        </Pressable>
      </View>

      {/* Lista de Veículos */}
      <View style={styles.vehiclesContainer}>
        {vehicles.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Nenhum veículo cadastrado. Adicione seu primeiro veículo.
          </Text>
        ) : (
          <View style={styles.list}>
            {activeVehicles.map((vehicle) => {
              const stats = computeVehicleStats(vehicle, fuelings, oilChanges, vehicleExpenses);
              const oilDetails = getOilStatusDetails(stats.oilStatus);

              return (
                <Pressable
                  key={vehicle.id}
                  onPress={() => router.push(`/vehicles` /* Redireciona para veículos */)}
                  style={[styles.vehicleRow, { borderColor: colors.border }]}
                >
                  <View style={styles.vehicleInfo}>
                    <View style={styles.vehicleNameRow}>
                      <Ionicons name="car" size={18} color={colors.primary} />
                      <Text style={[styles.vehicleName, { color: colors.foreground }]} numberOfLines={1}>
                        {vehicle.name}
                      </Text>
                    </View>
                    <Text style={[styles.odometerText, { color: colors.mutedForeground }]}>
                      Odom.: {stats.lastOdometer != null ? `${formatKm(stats.lastOdometer)} km` : "—"}
                    </Text>
                  </View>

                  <View style={styles.statsCol}>
                    {/* Consumo Médio */}
                    <View style={styles.statLine}>
                      <Feather name="droplet" size={13} color={colors.mutedForeground} />
                      <Text style={[styles.statValue, { color: colors.foreground }]}>
                        {stats.hasComputedKmL && stats.avgKmPerLiter != null
                          ? `${formatKmPerLiter(stats.avgKmPerLiter)} km/L`
                          : "—"}
                      </Text>
                    </View>

                    {/* Status de Óleo */}
                    <View style={styles.statLine}>
                      <Feather name="tool" size={13} color={oilDetails.color} />
                      <Text style={[styles.statValue, { color: oilDetails.color, fontWeight: "600" }]}>
                        {oilDetails.label}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  linkText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  vehiclesContainer: {
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 8,
  },
  list: {
    gap: 12,
  },
  vehicleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  vehicleInfo: {
    flex: 1,
    gap: 4,
  },
  vehicleNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  vehicleName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  odometerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginLeft: 24,
  },
  statsCol: {
    alignItems: "flex-end",
    gap: 6,
  },
  statLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
