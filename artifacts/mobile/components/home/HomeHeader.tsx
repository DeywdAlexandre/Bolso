import React from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
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
  scrollY: Animated.Value;
}

type Action = { label: string; icon: keyof typeof Feather.glyphMap; onPress: () => void };

/** Alturas do cabeçalho expandido e recolhido; a tela usa a máxima como respiro no topo da lista. */
export function useHomeHeaderHeights(hasBalance: boolean) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 15 : insets.top;
  const min = topPad + 62;
  const max = hasBalance ? topPad + 192 : min;
  return { topPad, min, max };
}

export function HomeHeader({ showValue, onToggleShowValue, balance, balanceLabel = "Saldo geral", canTransfer, scrollY }: HomeHeaderProps) {
  const colors = useColors();
  const hasBalance = balance !== undefined;
  const { topPad, min, max } = useHomeHeaderHeights(hasBalance);

  const actions: Action[] = !hasBalance ? [] : [
    { label: "Gasto", icon: "arrow-down-left", onPress: () => router.push("/transaction/new?type=expense" as any) },
    { label: "Entrada", icon: "arrow-up-right", onPress: () => router.push("/transaction/new?type=income" as any) },
    canTransfer
      ? { label: "Transferir", icon: "repeat", onPress: () => router.push("/accounts/transfer" as any) }
      : { label: "Contas", icon: "credit-card", onPress: () => router.push("/accounts" as any) },
  ];

  const range = Math.max(max - min, 1);
  const height = scrollY.interpolate({ inputRange: [0, range], outputRange: [max, min], extrapolate: "clamp" });
  const expandedOpacity = scrollY.interpolate({ inputRange: [0, range * 0.6], outputRange: [1, 0], extrapolate: "clamp" });
  const compactOpacity = scrollY.interpolate({ inputRange: [range * 0.5, range], outputRange: [0, 1], extrapolate: "clamp" });

  return (
    <Animated.View style={[styles.headerBackground, { backgroundColor: colors.primary, height }]}>
      <View style={[styles.headerRow, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={[styles.brand, { color: colors.primaryForeground }]}>Prisma</Text>
          {hasBalance && (
            <Animated.Text style={[styles.compactBalance, { color: colors.primaryForeground + "cc", opacity: compactOpacity }]}>
              {showValue ? formatCurrency(balance) : "••••••"}
            </Animated.Text>
          )}
        </View>
        <View style={styles.rightButtons}>
          <Pressable
            onPress={onToggleShowValue}
            hitSlop={10}
            accessibilityLabel={showValue ? "Ocultar valores" : "Mostrar valores"}
            style={({ pressed }) => [
              styles.headerBtn,
              { backgroundColor: colors.primaryForeground + "22", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name={showValue ? "eye" : "eye-off"} size={16} color={colors.primaryForeground} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={10}
            accessibilityLabel="Configurações"
            style={({ pressed }) => [
              styles.headerBtn,
              { backgroundColor: colors.primaryForeground + "22", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="settings" size={18} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>

      {hasBalance && (
        <Animated.View style={[styles.balanceBlock, { opacity: expandedOpacity }]}>
          <Text style={[styles.balanceLabel, { color: colors.primaryForeground + "cc" }]}>{balanceLabel}</Text>
          <Text style={[styles.balanceValue, { color: colors.primaryForeground }]} numberOfLines={1} adjustsFontSizeToFit>
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
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: "hidden",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
  },
  compactBalance: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: -2 },
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
