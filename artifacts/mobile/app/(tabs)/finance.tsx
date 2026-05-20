import React from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useDashboard } from "@/hooks/useDashboard";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSummaryCards } from "@/components/dashboard/DashboardSummaryCards";
import { UpcomingCommitments } from "@/components/dashboard/UpcomingCommitments";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";

export default function FinanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const {
    ready,
    userName,
    categories,
    period,
    setPeriod,
    scrollY,
    totals,
    savedAmount,
    upcoming,
    recent,
    applyRecurring,
  } = useDashboard();

  if (!ready) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DashboardHeader
        scrollY={scrollY}
        userName={userName}
        globalBalance={totals.globalBalance}
        period={period}
        setPeriod={setPeriod}
      />

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Platform.OS === "web" ? insets.top + 170 : insets.top + 180 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
      >
        <DashboardSummaryCards totals={totals} savedAmount={savedAmount} />

        <UpcomingCommitments upcoming={upcoming} onApply={applyRecurring} />

        <RecentTransactions recent={recent} categories={categories} />
      </Animated.ScrollView>

      {/* Botão Flutuante (FAB) */}
      <Pressable
        onPress={() => router.push("/transaction/new")}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            opacity: pressed ? 0.85 : 1,
            shadowColor: colors.primary,
          },
        ]}
      >
        <Feather name="plus" size={24} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 20,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 30,
  },
});
