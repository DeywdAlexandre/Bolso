import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";

/** Atalho da aba Finanças para a tela de análise (para onde vai / de onde vem o dinheiro). */
export function AnalysisCard() {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => router.push("/analysis" as never)}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel="Abrir análise do dinheiro"
    >
      <View style={[styles.icon, { backgroundColor: colors.primary + "22" }]}>
        <Feather name="pie-chart" size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.foreground }]}>Para onde vai o dinheiro</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>Gráficos de gastos e entradas por categoria</Text>
      </View>
      <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, borderWidth: 1 },
  icon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
});
