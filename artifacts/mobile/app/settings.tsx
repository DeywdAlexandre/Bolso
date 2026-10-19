import React, { useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, Stack } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useSettingsForm } from "@/hooks/useSettingsForm";
import { useAppData } from "@/contexts/AppDataContext";
import { formatCurrency } from "@/lib/format";
import { useBackup } from "@/hooks/useBackup";
import { useInstall } from "@/hooks/useInstall";
import { InstallInstructions } from "@/components/pwa/InstallInstructions";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsGroup";
import { SettingsField } from "@/components/settings/SettingsField";
import { ThemeSelector } from "@/components/settings/ThemeSelector";
import { ModelPicker } from "@/components/settings/ModelPicker";

export default function SettingsScreen() {
  const colors = useColors();
  const { balances } = useAppData();
  const { handleExport, handleImport, handleRestoreSnapshot } = useBackup();
  const { state: installState, install, canInstall } = useInstall();
  const [showInstallSteps, setShowInstallSteps] = useState(false);
  const {
    settings,
    nameDraft,
    setNameDraft,
    keyDraft,
    setKeyDraft,
    modelDraft,
    setModelDraft,
    showKey,
    setShowKey,
    savedAt,
    isModelPickerOpen,
    setIsModelPickerOpen,
    handleSave,
    saveName,
    nameSaved,
    handleClear,
    setBiometricsEnabled,
  } = useSettingsForm();

  return (
    <>
      <Stack.Screen
        options={{
          title: "Configurações",
          headerLeft: () => (
            <Pressable 
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/(tabs)");
                }
              }} 
              hitSlop={12} 
              style={{ marginLeft: -10, padding: 8 }}
            >
              <Feather name="arrow-left" size={24} color={colors.foreground} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
      >
        <SettingsSection title="Perfil">
          <SettingsField label="Seu Nome">
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              onBlur={saveName}
              onSubmitEditing={saveName}
              returnKeyType="done"
              placeholder="Como quer ser chamado?"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }
              ]}
            />
            {nameSaved ? <Text style={[styles.savedFlag, { color: colors.income, textAlign: "left", marginTop: 0 }]}>✓ Salvo</Text> : null}
          </SettingsField>
        </SettingsSection>

        <SettingsSection title="Contas e carteira">
          <SettingsGroup>
            <SettingsRow
              icon="credit-card"
              title="Bancos e carteira"
              subtitle={
                balances.hasAccounts
                  ? `${balances.accounts.length + balances.cards.length} ${balances.accounts.length + balances.cards.length === 1 ? "conta" : "contas"} · ${formatCurrency(balances.total)}`
                  : "Cadastre quanto você tem em cada banco e na carteira"
              }
              onPress={() => router.push("/accounts" as any)}
            />
          </SettingsGroup>
        </SettingsSection>

        <ThemeSelector />

        <SettingsSection title="Personalização e segurança">
          <SettingsGroup>
            <SettingsRow
              icon="layout"
              title="Menu Inferior"
              subtitle="Escolher quais abas exibir na barra inferior"
              onPress={() => router.push("/settings/customize-tabs" as any)}
            />
            <SettingsRow
              icon="shield"
              title="Proteção Biométrica"
              subtitle="Solicitar digital ou face ao abrir o app"
              onPress={() => setBiometricsEnabled(!settings.biometricsEnabled)}
              right={
                <View
                  style={{
                    width: 50,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: settings.biometricsEnabled ? colors.primary : colors.mutedForeground + "66",
                    padding: 2,
                    justifyContent: "center",
                    alignItems: settings.biometricsEnabled ? "flex-end" : "flex-start",
                  }}
                >
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFF" }} />
                </View>
              }
            />
          </SettingsGroup>
        </SettingsSection>

        <SettingsSection title="Inteligência Artificial">
          <Text style={[styles.help, { color: colors.mutedForeground }]}>
            O assistente usa o OpenRouter para acessar modelos de IA. Sua chave fica armazenada de
            forma segura apenas neste dispositivo.
          </Text>

          <SettingsField label="Chave da API OpenRouter">
            <View
              style={[
                styles.inputRow,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <TextInput
                value={keyDraft}
                onChangeText={setKeyDraft}
                placeholder="sk-or-..."
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.inputInline, { color: colors.foreground }]}
              />
              <Pressable onPress={() => setShowKey(!showKey)} hitSlop={8} style={styles.eyeBtn}>
                <Feather
                  name={showKey ? "eye-off" : "eye"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
            <Pressable
              onPress={() => Linking.openURL("https://openrouter.ai/keys")}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, paddingVertical: 4 }]}
            >
              <Text style={[styles.link, { color: colors.primary }]}>
                Como obter uma chave em openrouter.ai/keys
              </Text>
            </Pressable>
          </SettingsField>

          <ModelPicker
            modelDraft={modelDraft}
            setModelDraft={setModelDraft}
            isModelPickerOpen={isModelPickerOpen}
            setIsModelPickerOpen={setIsModelPickerOpen}
          />

          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.saveText, { color: colors.primaryForeground }]}>
              Salvar IA
            </Text>
          </Pressable>

          {savedAt ? (
            <Text style={[styles.savedFlag, { color: colors.income }]}>Alterações salvas.</Text>
          ) : null}
        </SettingsSection>

        {Platform.OS === "web" && canInstall && (
          <SettingsSection title="Aplicativo">
            <SettingsGroup>
              <SettingsRow
                icon="download"
                title="Instalar aplicativo"
                subtitle="Abre em tela cheia e funciona sem internet"
                onPress={async () => {
                  if (installState === "prompt") await install();
                  else setShowInstallSteps(true);
                }}
              />
            </SettingsGroup>
          </SettingsSection>
        )}

        <SettingsSection title="Dados">
          <SettingsGroup>
            <SettingsRow icon="tag" title="Categorias" subtitle="Adicionar e remover categorias" onPress={() => router.push("/categories")} />
            <SettingsRow icon="upload" title="Exportar Backup" subtitle="Salvar todos os seus dados em um arquivo" onPress={handleExport} />
            <SettingsRow icon="download" title="Importar Backup" subtitle="Restaurar dados de um arquivo salvo" onPress={handleImport} />
            <SettingsRow icon="rotate-ccw" title="Restaurar cópia automática" subtitle="O app guarda uma cópia semanal neste aparelho" onPress={handleRestoreSnapshot} />
          </SettingsGroup>
          <SettingsGroup>
            <SettingsRow
              icon="trash-2"
              title="Apagar todos os dados"
              subtitle="Remove transações e recorrências"
              tone={colors.destructive}
              onPress={handleClear}
            />
          </SettingsGroup>
        </SettingsSection>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Prisma · seus dados ficam apenas neste dispositivo.
          </Text>
        </View>
      </ScrollView>

      <InstallInstructions
        visible={showInstallSteps}
        state={installState}
        onClose={() => setShowInstallSteps(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60, gap: 24 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputInline: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  eyeBtn: { padding: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  help: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  link: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  savedFlag: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center", marginTop: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  footer: { paddingTop: 8, alignItems: "center" },
  footerText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
