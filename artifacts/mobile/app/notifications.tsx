import React, { useCallback, useEffect, useState } from "react";
import { Alert, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Stack } from "expo-router";

import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsGroup";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { getNotificationPermission, requestNotificationPermissions, sendTestNotification, type NotificationPermission } from "@/lib/notifications";
import { NOTIFICATION_CATEGORIES, NOTIFICATION_HOURS, SHIFT_LEAD_OPTIONS } from "@/lib/notificationSettings";

const leadLabel = (m: number) => (m === 0 ? "Desligado" : m >= 60 ? `${m / 60}h antes` : `${m} min antes`);

export default function NotificationsScreen() {
  const colors = useColors();
  const { notificationSettings: s, setNotificationSettings } = useAppData();
  const [permission, setPermission] = useState<NotificationPermission>("undetermined");
  const isWeb = Platform.OS === "web";

  const refresh = useCallback(async () => setPermission(await getNotificationPermission()), []);
  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener("change", (st) => st === "active" && void refresh());
    return () => sub.remove();
  }, [refresh]);

  const toggleMaster = async (value: boolean) => {
    if (value && !isWeb) {
      const ok = await requestNotificationPermissions();
      await refresh();
      if (!ok) {
        Alert.alert(
          "Permissão necessária",
          "O Android bloqueou as notificações do Prisma. Libere em Configurações do Android → Apps → Prisma → Notificações.",
          [{ text: "Agora não", style: "cancel" }, { text: "Abrir configurações", onPress: () => void Linking.openSettings() }],
        );
      }
    }
    await setNotificationSettings({ enabled: value });
  };

  const test = async () => {
    const granted = await requestNotificationPermissions();
    await refresh();
    if (!granted) {
      Alert.alert("Notificações bloqueadas", "Libere as notificações do Prisma nas configurações do Android.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Abrir configurações", onPress: () => void Linking.openSettings() },
      ]);
      return;
    }
    const ok = await sendTestNotification();
    Alert.alert(ok ? "Teste enviado" : "Erro", ok ? "Em 5 segundos deve aparecer uma notificação. Pode sair do app para ver." : "Não consegui agendar a notificação.");
  };

  const chip = (active: boolean, label: string, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + "22" : colors.card },
      ]}
    >
      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? colors.primary : colors.mutedForeground }}>{label}</Text>
    </Pressable>
  );

  return (
    <>
      <Stack.Screen options={{ title: "Notificações" }} />
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
        {isWeb && (
          <Text style={[styles.note, { color: colors.mutedForeground }]}>
            As notificações só funcionam no app instalado no celular (APK). Aqui você já pode deixar as preferências prontas.
          </Text>
        )}

        {!isWeb && permission === "denied" && s.enabled && (
          <Pressable onPress={() => void Linking.openSettings()} style={[styles.warn, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive }]}>
            <Text style={{ color: colors.destructive, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
              O Android está bloqueando as notificações do Prisma. Toque aqui para liberar nas configurações.
            </Text>
          </Pressable>
        )}

        <SettingsGroup>
          <SettingsRow
            icon="bell"
            title="Receber notificações"
            subtitle="Avisos de vencimentos e compromissos"
            right={<Switch value={s.enabled} onValueChange={toggleMaster} />}
          />
        </SettingsGroup>

        {s.enabled && (
          <>
            <SettingsSection title="O que avisar">
              <SettingsGroup>
                {NOTIFICATION_CATEGORIES.map((c) => (
                  <SettingsRow
                    key={c.key}
                    icon={c.icon as never}
                    title={c.label}
                    subtitle={c.hint}
                    right={
                      <Switch
                        value={s.categories[c.key]}
                        onValueChange={(v) => setNotificationSettings({ categories: { ...s.categories, [c.key]: v } })}
                      />
                    }
                  />
                ))}
              </SettingsGroup>
            </SettingsSection>

            <SettingsSection title="Horário dos avisos de vencimento">
              <View style={styles.chips}>
                {NOTIFICATION_HOURS.map((h) => chip(s.hour === h, `${String(h).padStart(2, "0")}:00`, () => setNotificationSettings({ hour: h })))}
              </View>
              <Text style={[styles.note, { color: colors.mutedForeground }]}>
                Avisos de véspera (gastos fixos e empréstimos) saem às 18:00.
              </Text>
            </SettingsSection>

            {s.categories.shifts && (
              <SettingsSection title="Escalas">
                <SettingsGroup>
                  <SettingsRow
                    icon="moon"
                    title="Aviso na véspera"
                    subtitle="Às 20:00, com os plantões do dia seguinte"
                    right={<Switch value={s.shiftEve} onValueChange={(v) => setNotificationSettings({ shiftEve: v })} />}
                  />
                </SettingsGroup>
                <Text style={[styles.note, { color: colors.mutedForeground }]}>Aviso antes de cada plantão</Text>
                <View style={styles.chips}>
                  {SHIFT_LEAD_OPTIONS.map((m) => chip(s.shiftLeadMinutes === m, leadLabel(m), () => setNotificationSettings({ shiftLeadMinutes: m })))}
                </View>
              </SettingsSection>
            )}
          </>
        )}

        {!isWeb && (
          <SettingsSection title="Teste">
            <SettingsGroup>
              <SettingsRow icon="send" title="Enviar notificação de teste" subtitle="Aparece em 5 segundos" onPress={test} />
            </SettingsGroup>
          </SettingsSection>
        )}

        <Text style={[styles.note, { color: colors.mutedForeground }]}>
          O app agenda os próximos 60 dias e atualiza a lista sempre que você muda algo ou abre o app. Itens atrasados avisam uma vez por dia
          em que você abre o app, até serem resolvidos.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 20, paddingBottom: 60 },
  note: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  warn: { borderWidth: 1, borderRadius: 14, padding: 14 },
});
