import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface HomeHeaderProps {
  showValue: boolean;
  onToggleShowValue: () => void;
}

export function HomeHeader({ showValue, onToggleShowValue }: HomeHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 15 : insets.top;

  return (
    <View
      style={[
        styles.headerBackground,
        {
          backgroundColor: colors.primary,
          paddingTop: topPad + 12,
          paddingBottom: 16,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.brand, { color: colors.primaryForeground }]}>
          Prisma
        </Text>
        <View style={styles.rightButtons}>
          <Pressable
            onPress={onToggleShowValue}
            hitSlop={10}
            style={({ pressed }) => [
              styles.headerBtn,
              { backgroundColor: colors.primaryForeground + "22", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather
              name={showValue ? "eye" : "eye-off"}
              size={16}
              color={colors.primaryForeground}
            />
          </Pressable>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={10}
            style={({ pressed }) => [
              styles.headerBtn,
              { backgroundColor: colors.primaryForeground + "22", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="settings" size={18} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBackground: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  rightButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
