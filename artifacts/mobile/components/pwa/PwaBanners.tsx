import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { InstallInstructions } from "@/components/pwa/InstallInstructions";
import { useColors } from "@/hooks/useColors";
import { useInstall } from "@/hooks/useInstall";
import { applyUpdate, watchForNewVersion } from "@/lib/pwa";
import { loadJson, saveJson, STORAGE_KEYS } from "@/lib/storage";

const INSTALL_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

/** Avisos (somente web/PWA): nova versão disponível e convite para instalar o app. */
export function PwaBanners() {
  const colors = useColors();
  const { state, install } = useInstall();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installSnoozed, setInstallSnoozed] = useState(true); // true até ler o storage: evita piscar
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => watchForNewVersion(() => setUpdateAvailable(true)), []);

  useEffect(() => {
    void loadJson<number>(STORAGE_KEYS.installDismissedAt, 0).then((at) =>
      setInstallSnoozed(Date.now() - at < INSTALL_SNOOZE_MS),
    );
  }, []);

  if (Platform.OS !== "web") return null;

  // O convite só aparece onde instalar é simples (um toque ou passos curtos no iPhone).
  // Navegadores sem suporte ficam só com o item em Configurações.
  const showInstall = (state === "prompt" || state === "ios") && !installSnoozed;

  const dismissInstall = () => {
    setInstallSnoozed(true);
    void saveJson(STORAGE_KEYS.installDismissedAt, Date.now());
  };

  const onInstall = async () => {
    if (state === "prompt") {
      const result = await install();
      if (result === "dismissed") dismissInstall();
    } else {
      setShowSteps(true);
    }
  };

  return (
    <>
      <View style={styles.wrap} pointerEvents="box-none">
        {updateAvailable && (
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
        )}

        {showInstall && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="download" size={16} color={colors.primary} />
            <Text style={[styles.text, { color: colors.foreground }]}>Instale o Prisma no seu aparelho</Text>
            <Pressable
              onPress={onInstall}
              accessibilityRole="button"
              style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Instalar</Text>
            </Pressable>
            <Pressable onPress={dismissInstall} hitSlop={10} accessibilityLabel="Dispensar">
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        )}
      </View>

      <InstallInstructions visible={showSteps} state={state} onClose={() => setShowSteps(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12, bottom: 96, alignItems: "center", gap: 8, zIndex: 1000 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 12,
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
