import React, { useEffect, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PeriodSelector, type Period } from "@/components/PeriodSelector";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/format";
import { loadJson, saveJson } from "@/lib/storage";

interface DashboardHeaderProps {
  scrollY: Animated.Value;
  userName: string;
  globalBalance: number;
  period: Period;
  setPeriod: (period: Period) => void;
}

export function DashboardHeader({
  scrollY,
  userName,
  globalBalance,
  period,
  setPeriod,
}: DashboardHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await loadJson<boolean>("@bolso/settings/show_balance", true);
      setShowBalance(saved);
    })();
  }, []);

  const toggleBalance = async () => {
    const next = !showBalance;
    setShowBalance(next);
    await saveJson("@bolso/settings/show_balance", next);
  };

  const topPad = Platform.OS === "web" ? 15 : insets.top;
  const headerMaxHeight = topPad + 215;
  const headerMinHeight = topPad + 56;

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [headerMaxHeight, headerMinHeight],
    extrapolate: "clamp",
  });

  const contentOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const minimalHeaderOpacity = scrollY.interpolate({
    inputRange: [60, 90],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <Animated.View 
      style={[
        styles.headerBackground, 
        { 
          backgroundColor: colors.primary, 
          height: headerHeight,
          zIndex: 10,
        }
      ]}
    >
      <Animated.View 
        style={[
          styles.minimalHeader, 
          { 
            paddingTop: topPad + 10,
            opacity: minimalHeaderOpacity,
          }
        ]}
      >
        <View style={styles.minimalContent}>
          <View>
            <Text style={[styles.minimalBrand, { color: colors.primaryForeground }]}>Prisma</Text>
            <Text style={[styles.minimalBalance, { color: colors.primaryForeground + "cc" }]}>
              {showBalance ? formatCurrency(globalBalance) : "••••••"}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/settings")}
            style={styles.minimalSettingsBtn}
          >
            <Feather name="settings" size={18} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View style={[styles.headerContent, { paddingTop: topPad + 10, opacity: contentOpacity }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.primaryForeground + "cc" }]}>
              {userName ? "Olá," : "Bem-vindo!"}
            </Text>
            <Text style={[styles.brand, { color: colors.primaryForeground }]}>
              {userName || "ao Prisma"}
            </Text>
          </View>
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

        <View style={styles.balanceContainer}>
          <Text style={[styles.balanceLabel, { color: colors.primaryForeground + "b3" }]}>
            Saldo Geral (em conta)
          </Text>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceValue, { color: colors.primaryForeground }]}>
              {showBalance ? formatCurrency(globalBalance) : "••••••"}
            </Text>
            <Pressable onPress={toggleBalance} hitSlop={12} style={styles.eyeBtn}>
              <Feather name={showBalance ? "eye-off" : "eye"} size={16} color={colors.primaryForeground + "cc"} />
            </Pressable>
          </View>
        </View>

        <View style={styles.periodContainer}>
          <PeriodSelector period={period} onChange={setPeriod} isDarkBackground={true} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  brand: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    marginTop: -2,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  periodContainer: {
    marginBottom: 16,
  },
  minimalHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 20,
  },
  minimalContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  minimalBrand: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  minimalBalance: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginTop: -2,
  },
  minimalSettingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceContainer: {
    marginBottom: 14,
    gap: 2,
  },
  balanceLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  balanceValue: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  eyeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
});
