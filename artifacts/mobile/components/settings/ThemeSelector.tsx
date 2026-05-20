import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSettings } from "@/contexts/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { SettingsSection } from "./SettingsSection";

export function ThemeSelector() {
  const colors = useColors();
  const { settings, setThemeMode } = useSettings();

  const themes = ["system", "light", "dark"] as const;
  const labels = { system: "Sistema", light: "Claro", dark: "Escuro" };
  const icons = { system: "smartphone", light: "sun", dark: "moon" } as const;

  return (
    <SettingsSection title="Aparência">
      <View style={[styles.themeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {themes.map((m) => {
          const active = settings.themeMode === m;
          return (
            <Pressable
              key={m}
              onPress={() => setThemeMode(m)}
              style={[
                styles.themeBtn,
                active && { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <Feather 
                name={icons[m]} 
                size={16} 
                color={active ? colors.primary : colors.mutedForeground} 
              />
              <Text
                style={[
                  styles.themeText, 
                  { color: active ? colors.foreground : colors.mutedForeground }
                ]}
              >
                {labels[m]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  themeRow: {
    flexDirection: "row",
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  themeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  themeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
