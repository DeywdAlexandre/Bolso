import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/format";

interface HomeHeaderProps {
  showValue: boolean;
  onToggleShowValue: () => void;
  /** Saldo exibido no topo; omitido quando a aba de Finanças está desativada. */
  balance?: number;
  balanceLabel?: string;
  /** Com duas ou mais contas o atalho "Transferir" aparece; senão, "Contas". */
  canTransfer?: boolean;
}

type Action = { label: string; icon: keyof typeof Feather.glyphMap; onPress: () => void };

export function HomeHeader({ showValue, onToggleShowValue, balance, balanceLabel = "Saldo geral", canTransfer }: HomeHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const actions: Action[] = balance === undefined ? [] : [
    { label: "Gasto", icon: "arrow-down-left", onPress: () => router.push("/transaction/new?type=expense" as any) },
    { label: "Entrada", icon: "arrow-up-right", onPress: () => router.push("/transaction/new?type=income" as any) },
    canTransfer
      ? { label: "Transferir", icon: "repeat", onPress: () => router.push("/accounts/transfer" as any) }
      : { label: "Contas", icon: "credit-card", onPress: () => router.push("/accounts" as any) },
  ];
  const topPad = Platform.OS === "web" ? 15 : insets.top;

  return (
    <View
      style={[
        styles.headerBackground,
        {
          backgroundColor: colors.primary,
          paddingTop: topPad + 12,
          paddingBottom: 18,
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

      {balance !== undefined && (
        <View style={styles.balanceBlock}>
          <Text style={[styles.balanceLabel, { color: colors.primaryForeground + "cc" }]}>{balanceLabel}</Text>
          <Text
            style={[styles.balanceValue, { color: colors.primaryForeground }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {showValue ? formatCurrency(balance) : "••••••"}
          </Text>
          <View style={styles.actionsRow}>
            {actions.map((a) => (
              <Pressable
                key={a.label}
                onPress={a.onPress}
                accessibilityRole="button"
                accessibilityLabel={a.label}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: colors.primaryForeground + "26", opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name={a.icon} size={16} color={colors.primaryForeground} />
                <Text style={[styles.actionText, { color: colors.primaryForeground }]}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerBackground: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
  balanceBlock: { marginTop: 14, gap: 2 },
  balanceLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  balanceValue: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  action: { flex: 1, height: 40, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  actionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
