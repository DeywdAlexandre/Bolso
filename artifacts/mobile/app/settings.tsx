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
import { useBackup } from "@/hooks/useBackup";
import { useInstall } from "@/hooks/useInstall";
import { InstallInstructions } from "@/components/pwa/InstallInstructions";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsField } from "@/components/settings/SettingsField";
import { ThemeSelector } from "@/components/settings/ThemeSelector";
import { ModelPicker } from "@/components/settings/ModelPicker";

export default function SettingsScreen() {
  const colors = useColors();
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
              placeholder="Como quer ser chamado?"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }
              ]}
            />
          </SettingsField>
        </SettingsSection>

        <ThemeSelector />

        <SettingsSection title="Personalização">
          <Pressable
            onPress={() => router.push("/settings/customize-tabs" as any)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.rowIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="layout" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>Menu Inferior</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                Escolher quais abas exibir na barra inferior
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </Pressable>
        </SettingsSection>

        <SettingsSection title="Segurança">
          <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="shield" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>Proteção Biométrica</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                Solicitar digital ou face ao abrir o app
              </Text>
            </View>
            <View style={{ paddingRight: 4 }}>
              <View 
                style={{ 
                  width: 50, 
                  height: 28, 
                  borderRadius: 14, 
                  backgroundColor: settings.biometricsEnabled ? colors.primary : colors.muted,
                  padding: 2,
                  justifyContent: 'center',
                  alignItems: settings.biometricsEnabled ? 'flex-end' : 'flex-start'
                }}
              >
                <Pressable
                  onPress={() => {
                    const newState = !settings.biometricsEnabled;
                    setBiometricsEnabled(newState);
                  }}
                  style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: 12, 
                    backgroundColor: "#FFF",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                    elevation: 2,
                  }}
                />
              </View>
            </View>
          </View>
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
            <Pressable
              onPress={async () => {
                if (installState === "prompt") await install();
                else setShowInstallSteps(true);
              }}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="download" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>Instalar aplicativo</Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                  Abre em tela cheia e funciona sem internet
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </Pressable>
          </SettingsSection>
        )}

        <SettingsSection title="Dados">
          <Pressable
            onPress={() => router.push("/categories")}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
              <Feather name="tag" size={18} color={colors.foreground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>Categorias</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                Adicionar e remover categorias
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </Pressable>


          <Pressable
            onPress={handleExport}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.rowIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="upload" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>Exportar Backup</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                Salvar todos os seus dados em um arquivo
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            onPress={handleImport}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.rowIcon, { backgroundColor: colors.accent + "15" }]}>
              <Feather name="download" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>Importar Backup</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                Restaurar dados de um arquivo salvo
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            onPress={handleRestoreSnapshot}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.rowIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="rotate-ccw" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>Restaurar cópia automática</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                O app guarda uma cópia semanal neste aparelho
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            onPress={handleClear}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={[styles.rowIcon, { backgroundColor: colors.destructive + "22" }]}>
              <Feather name="trash-2" size={18} color={colors.destructive} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.destructive }]}>Apagar todos os dados</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                Remove transações e recorrências
              </Text>
            </View>
          </Pressable>
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
