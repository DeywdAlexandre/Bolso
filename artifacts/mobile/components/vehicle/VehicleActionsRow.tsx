import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";

interface VehicleActionsRowProps {
  vehicleId: string;
  onOpenExtraExpense: () => void;
}

export function VehicleActionsRow({ vehicleId, onOpenExtraExpense }: VehicleActionsRowProps) {
  const colors = useColors();

  return (
    <View style={styles.actionsRow}>
      <ActionButton
        icon="droplet"
        label="Abastecer"
        color={colors.primary}
        onPress={() => router.push(`/fueling/new?vehicleId=${vehicleId}`)}
      />
      <ActionButton
        icon="settings"
        label="Óleo"
        color={colors.accent}
        onPress={() => router.push(`/oilchange/new?vehicleId=${vehicleId}`)}
      />
      <ActionButton
        icon="tool"
        label="Gasto"
        color={colors.mutedForeground}
        onPress={onOpenExtraExpense}
      />
    </View>
  );
}

interface ActionButtonProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}

function ActionButton({ icon, label, color, onPress }: ActionButtonProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 12,
          backgroundColor: color + "26",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.actionLabel, { color: colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionLabel: {
    flexShrink: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
