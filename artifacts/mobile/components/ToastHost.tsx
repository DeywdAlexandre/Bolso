import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { subscribeToasts, type ToastMessage } from "@/lib/toast";

/** Avisos rápidos (confirmações) exibidos sobre as telas. */
export function ToastHost() {
  const colors = useColors();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      {toasts.map((t) => (
        <View
          key={t.id}
          accessibilityRole="alert"
          style={[styles.toast, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name={t.kind === "success" ? "check-circle" : "info"} size={16} color={colors.primary} />
          <Text style={[styles.text, { color: colors.foreground }]}>{t.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    top: Platform.OS === "web" ? 12 : 56,
    alignItems: "center",
    gap: 8,
    zIndex: 2000,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    maxWidth: 420,
  },
  text: { fontFamily: "Inter_500Medium", fontSize: 13, flexShrink: 1 },
});
