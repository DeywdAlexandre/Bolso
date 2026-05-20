import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useVehicle } from "@/hooks/useVehicle";

import { VehicleHeaderCard } from "@/components/vehicle/VehicleHeaderCard";
import { VehicleActionsRow } from "@/components/vehicle/VehicleActionsRow";
import { VehicleStatsGrid } from "@/components/vehicle/VehicleStatsGrid";
import { VehicleOilCard } from "@/components/vehicle/VehicleOilCard";
import { VehicleHistoryList } from "@/components/vehicle/VehicleHistoryList";
import { ExtraExpenseModal } from "@/components/vehicle/ExtraExpenseModal";

export default function VehicleDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const {
    vehicle,
    stats,
    entries,
    extraModalVisible,
    setExtraModalVisible,
    handleDeleteVehicle,
    handleDeleteEntry,
  } = useVehicle(id);

  if (!vehicle || !stats) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: colors.mutedForeground }}>Veículo não encontrado</Text>
      </View>
    );
  }

  const accent = vehicle.color || colors.primary;

  return (
    <>
      <Stack.Screen
        options={{
          title: vehicle.name,
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 4 }}>
              <Pressable
                onPress={() => router.push(`/vehicle/new?id=${vehicle.id}`)}
                hitSlop={8}
                style={{ padding: 6 }}
              >
                <Feather name="edit-2" size={18} color={colors.foreground} />
              </Pressable>
              <Pressable
                onPress={handleDeleteVehicle}
                hitSlop={8}
                style={{ padding: 6 }}
              >
                <Feather name="trash-2" size={18} color={colors.destructive} />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
      >
        <VehicleHeaderCard vehicle={vehicle} accent={accent} />

        <VehicleActionsRow
          vehicleId={vehicle.id}
          onOpenExtraExpense={() => setExtraModalVisible(true)}
        />

        <VehicleStatsGrid stats={stats} />

        <VehicleOilCard stats={stats} />

        <VehicleHistoryList entries={entries} onDeleteEntry={handleDeleteEntry} />
      </ScrollView>

      <ExtraExpenseModal
        visible={extraModalVisible}
        onClose={() => setExtraModalVisible(false)}
        vehicleId={vehicle.id}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
    gap: 16,
  },
});
