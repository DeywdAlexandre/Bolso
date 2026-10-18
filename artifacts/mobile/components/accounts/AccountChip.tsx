import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  label: string;
  /** Bolinha de cor da conta (omitida em "Sem conta"/formas de pagamento). */
  color?: string;
  active: boolean;
  onPress: () => void;
};

/** Chip selecionável usado para escolher conta e forma de pagamento. */
export function AccountChip({ label, color, active, onPress }: Props) {
  const colors = useColors();
  const accent = color ?? colors.primary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      aria-selected={active}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? accent + "22" : colors.card,
          borderColor: active ? accent : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text
        style={{
          color: active ? accent : colors.foreground,
          fontFamily: active ? "Inter_700Bold" : "Inter_500Medium",
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
