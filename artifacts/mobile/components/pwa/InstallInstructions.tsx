import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { manualInstallSteps, type InstallState } from "@/lib/install";

type Props = { visible: boolean; state: InstallState; onClose: () => void };

/** Passo a passo de instalação para navegadores sem o diálogo automático (ex.: Safari no iPhone). */
export function InstallInstructions({ visible, state, onClose }: Props) {
  const colors = useColors();
  const steps = manualInstallSteps(state);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Instalar o Prisma</Text>
          <View style={{ gap: 10 }}>
            {steps.map((step, i) => (
              <View key={step} style={styles.step}>
                <View style={[styles.badge, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.foreground }]}>{step}</Text>
              </View>
            ))}
          </View>
          <Pressable onPress={onClose} style={[styles.button, { backgroundColor: colors.primary }]}>
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Entendi</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 16 },
  title: { fontFamily: "Inter_700Bold", fontSize: 18 },
  step: { flexDirection: "row", alignItems: "center", gap: 12 },
  badge: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  badgeText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  stepText: { fontFamily: "Inter_500Medium", fontSize: 14, flex: 1 },
  button: { paddingVertical: 12, borderRadius: 14, alignItems: "center" },
  buttonText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
