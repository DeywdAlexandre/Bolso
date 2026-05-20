import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SettingsFieldProps {
  label: string;
  children: React.ReactNode;
}

export function SettingsField({ label, children }: SettingsFieldProps) {
  const colors = useColors();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
