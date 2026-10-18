import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { applyUpdate, watchForNewVersion } from "@/lib/pwa";

/** Aviso (somente no PWA/web) de que há uma nova versão do app para carregar. */
export function UpdateBanner() {
  const colors = useColors();
  const [available, setAvailable] = useState(false);

  useEffect(() => watchForNewVersion(() => setAvailable(true)), []);

  if (Platform.OS !== "web" || !available) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="refresh-cw" size={16} color={colors.primary} />
        <Text style={[styles.text, { color: colors.foreground }]}>Nova versão do Prisma disponível</Text>
        <Pressable
          onPress={applyUpdate}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Atualizar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12, bottom: 96, alignItems: "center", zIndex: 1000 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { fontFamily: "Inter_500Medium", fontSize: 13, flexShrink: 1 },
  button: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  buttonText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
