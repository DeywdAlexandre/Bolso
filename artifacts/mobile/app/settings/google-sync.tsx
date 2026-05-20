import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppData } from "@/contexts/AppDataContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { saveGoogleTokens, getGoogleAccessToken, clearGoogleTokens } from "@/lib/google/api";
import { ensureSpreadsheetTabs, readSheetData, writeSheetData, reconcileData } from "@/lib/google/sheets";
import { ensureGoogleCalendar, syncShiftsToCalendar } from "@/lib/google/calendar";
import { saveJson, STORAGE_KEYS } from "@/lib/storage";

export default function GoogleSyncScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();
  
  // Obter estados locais do AppDataContext
  const appData = useAppData();

  const [isConnected, setIsConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [sheetsIdInput, setSheetsIdInput] = useState(settings.googleSheetsId || "");
  const [clientIdInput, setClientIdInput] = useState(settings.googleClientId || "");
  const [clientSecretInput, setClientSecretInput] = useState(settings.googleClientSecret || "");

  const topPad = Platform.OS === "web" ? 15 : insets.top;

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const token = await getGoogleAccessToken();
    setIsConnected(!!token);
  };

  const handleConnectToken = async () => {
    if (!tokenInput.trim()) {
      Alert.alert("Erro", "Por favor, cole um Access Token válido.");
      return;
    }
    try {
      await saveGoogleTokens(tokenInput.trim());
      setIsConnected(true);
      setTokenInput("");
      Alert.alert("Conectado", "Google API conectada com o token fornecido.");
    } catch {
      Alert.alert("Erro", "Falha ao salvar token.");
    }
  };

  const handleDisconnect = async () => {
    Alert.alert("Desconectar", "Deseja realmente remover os tokens do Google do aparelho?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Desconectar",
        style: "destructive",
        onPress: async () => {
          await clearGoogleTokens();
          setIsConnected(false);
          await updateSettings({ googleSheetsLinked: false, googleCalendarLinked: false });
          Alert.alert("Desconectado", "Credenciais do Google removidas.");
        }
      }
    ]);
  };

  const handleSaveSettings = async () => {
    await updateSettings({
      googleSheetsId: sheetsIdInput.trim() || undefined,
      googleClientId: clientIdInput.trim() || undefined,
      googleClientSecret: clientSecretInput.trim() || undefined,
    });
    Alert.alert("Salvo", "Configurações do Google salvas com sucesso.");
  };

  const performFullSync = async () => {
    if (!isConnected) {
      Alert.alert("Conexão necessária", "Conecte sua conta do Google antes de sincronizar.");
      return;
    }
    if (!sheetsIdInput.trim()) {
      Alert.alert("Planilha necessária", "Forneça o ID da Planilha do Google Sheets.");
      return;
    }

    setSyncing(true);
    const credentials = {
      clientId: clientIdInput.trim() || undefined,
      clientSecret: clientSecretInput.trim() || undefined,
    };

    const sheetId = sheetsIdInput.trim();

    try {
      // 1. Garantir abas no Sheets
      await ensureSpreadsheetTabs(sheetId, credentials);

      // 2. Reconciliação Bidirecional das 14 entidades
      const syncEntity = async <T extends { id: string; updatedAt?: string; createdAt?: string }>(
        sheetName: any,
        localList: T[],
        setLocalState: (list: T[]) => void,
        storageKey: string
      ) => {
        const remote = await readSheetData<T>(sheetId, sheetName, credentials);
        const { merged, hasChanges } = reconcileData(localList, remote);
        
        // Atualizar estado e persistência local
        setLocalState(merged);
        await saveJson(storageKey, merged);
        // Atualizar no Sheets
        await writeSheetData(sheetId, sheetName, merged, credentials);
      };

      // Executar sincronização de cada coleção
      await syncEntity("transactions", appData.transactions, (list) => {
        // Como o appData expõe apenas add/remove/update, nós atualizamos diretamente o storage e os estados internos por reflexão
        // Para atualizar no contexto sem recriar todas as APIs, nós salvamos direto no AsyncStorage
        // e avisamos o usuário que o app será recarregado ou os estados atualizados
        // NOTA: Para o AppDataContext aceitar atualizações de lote sem reload, podemos fazer isso atualizando o storage
        // e disparando uma notificação simples ou simplesmente atualizando o estado se tivéssemos um setTransactions direto.
        // Como implementamos o AppDataContext com estados React locais, a maneira mais limpa de forçar a atualização imediata na tela
        // é recarregar os dados na hora ou reiniciar os dados do context.
        // No React Native, o ideal é simplesmente atualizar o storage e fazer o download de volta.
      }, STORAGE_KEYS.transactions);

      // Vamos sincronizar todas as abas
      // 1. Transações
      const remoteTx = await readSheetData<any>(sheetId, "transactions", credentials);
      const resTx = reconcileData(appData.transactions, remoteTx);
      await saveJson(STORAGE_KEYS.transactions, resTx.merged);

      // 2. Recorrências
      const remoteRc = await readSheetData<any>(sheetId, "recurring", credentials);
      const resRc = reconcileData(appData.recurring, remoteRc);
      await saveJson(STORAGE_KEYS.recurring, resRc.merged);

      // 3. Categorias
      const remoteCats = await readSheetData<any>(sheetId, "categories", credentials);
      const resCats = reconcileData(appData.categories, remoteCats);
      await saveJson(STORAGE_KEYS.categories, resCats.merged);

      // 4. Veículos
      const remoteVeh = await readSheetData<any>(sheetId, "vehicles", credentials);
      const resVeh = reconcileData(appData.vehicles, remoteVeh);
      await saveJson(STORAGE_KEYS.vehicles, resVeh.merged);

      // 5. Abastecimentos
      const remoteFue = await readSheetData<any>(sheetId, "fuelings", credentials);
      const resFue = reconcileData(appData.fuelings, remoteFue);
      await saveJson(STORAGE_KEYS.fuelings, resFue.merged);

      // 6. Trocas de óleo
      const remoteOil = await readSheetData<any>(sheetId, "oilChanges", credentials);
      const resOil = reconcileData(appData.oilChanges, remoteOil);
      await saveJson(STORAGE_KEYS.oilChanges, resOil.merged);

      // 7. Gastos veículos
      const remoteVex = await readSheetData<any>(sheetId, "vehicleExpenses", credentials);
      const resVex = reconcileData(appData.vehicleExpenses, remoteVex);
      await saveJson(STORAGE_KEYS.vehicleExpenses, resVex.merged);

      // 8. Contatos empréstimos
      const remoteLc = await readSheetData<any>(sheetId, "loanContacts", credentials);
      const resLc = reconcileData(appData.loanContacts, remoteLc);
      await saveJson(STORAGE_KEYS.loanContacts, resLc.merged);

      // 9. Empréstimos
      const remoteLoans = await readSheetData<any>(sheetId, "loans", credentials);
      const resLoans = reconcileData(appData.loans, remoteLoans);
      await saveJson(STORAGE_KEYS.loans, resLoans.merged);

      // 10. Pagamentos empréstimos
      const remoteLp = await readSheetData<any>(sheetId, "loanPayments", credentials);
      const resLp = reconcileData(appData.loanPayments, remoteLp);
      await saveJson(STORAGE_KEYS.loanPayments, resLp.merged);

      // 11. Metas
      const remoteGoals = await readSheetData<any>(sheetId, "goals", credentials);
      const resGoals = reconcileData(appData.goals, remoteGoals);
      await saveJson(STORAGE_KEYS.goals, resGoals.merged);

      // 12. Depósitos metas
      const remoteGd = await readSheetData<any>(sheetId, "goalDeposits", credentials);
      const resGd = reconcileData(appData.goalDeposits, remoteGd);
      await saveJson(STORAGE_KEYS.goalDeposits, resGd.merged);

      // 13. Escalas
      const remoteSh = await readSheetData<any>(sheetId, "shifts", credentials);
      const resSh = reconcileData(appData.shifts, remoteSh);
      await saveJson(STORAGE_KEYS.shifts, resSh.merged);

      // 14. Regras de escalas
      const remoteShr = await readSheetData<any>(sheetId, "shiftRules", credentials);
      const resShr = reconcileData(appData.shiftRules, remoteShr);
      await saveJson(STORAGE_KEYS.shiftRules, resShr.merged);

      // 15. Modelos de escalas
      const remoteSht = await readSheetData<any>(sheetId, "shiftTemplates", credentials);
      const resSht = reconcileData(appData.shiftTemplates, remoteSht);
      await saveJson(STORAGE_KEYS.shiftTemplates, resSht.merged);

      // Salvar os consolidados de volta no Sheets para manter a paridade
      await writeSheetData(sheetId, "transactions", resTx.merged, credentials);
      await writeSheetData(sheetId, "recurring", resRc.merged, credentials);
      await writeSheetData(sheetId, "categories", resCats.merged, credentials);
      await writeSheetData(sheetId, "vehicles", resVeh.merged, credentials);
      await writeSheetData(sheetId, "fuelings", resFue.merged, credentials);
      await writeSheetData(sheetId, "oilChanges", resOil.merged, credentials);
      await writeSheetData(sheetId, "vehicleExpenses", resVex.merged, credentials);
      await writeSheetData(sheetId, "loanContacts", resLc.merged, credentials);
      await writeSheetData(sheetId, "loans", resLoans.merged, credentials);
      await writeSheetData(sheetId, "loanPayments", resLp.merged, credentials);
      await writeSheetData(sheetId, "goals", resGoals.merged, credentials);
      await writeSheetData(sheetId, "goalDeposits", resGd.merged, credentials);
      await writeSheetData(sheetId, "shifts", resSh.merged, credentials);
      await writeSheetData(sheetId, "shiftRules", resShr.merged, credentials);
      await writeSheetData(sheetId, "shiftTemplates", resSht.merged, credentials);

      // 3. Sincronizar escalas de serviço para o Google Calendar
      const calendarId = await ensureGoogleCalendar(credentials);
      await syncShiftsToCalendar(calendarId, resSh.merged, credentials);

      // Salva no settings
      const nowStr = new Date().toLocaleString();
      await updateSettings({
        lastSyncAt: nowStr,
        googleSheetsLinked: true,
        googleCalendarLinked: true,
        googleCalendarId: calendarId,
      });

      Alert.alert(
        "Sincronização Concluída",
        "Todos os dados foram sincronizados com o Google Sheets e sua agenda de plantões foi exportada para o Google Calendar!\n\nPor favor, reinicie o app para recarregar as informações locais atualizadas.",
        [{ text: "OK", onPress: () => router.replace("/settings" as any) }]
      );

    } catch (error: any) {
      console.error(error);
      Alert.alert("Erro na Sincronização", error.message || "Erro inesperado ao sincronizar com Google.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Google Sincronização</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status de Conexão */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIndicator, { backgroundColor: isConnected ? colors.income : colors.destructive }]} />
            <Text style={[styles.statusText, { color: colors.foreground }]}>
              {isConnected ? "Conectado ao Google" : "Desconectado"}
            </Text>
          </View>
          {settings.lastSyncAt && (
            <Text style={[styles.lastSyncText, { color: colors.mutedForeground }]}>
              Última Sincronização: {settings.lastSyncAt}
            </Text>
          )}
        </View>

        {/* Autenticação Manual / Rápida */}
        {!isConnected ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Autenticação Rápida</Text>
            <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
              Gere um Google Access Token (ex: no Google OAuth Playground com escopos Sheets e Calendar) e cole abaixo para conectar imediatamente.
            </Text>
            <TextInput
              value={tokenInput}
              onChangeText={setTokenInput}
              placeholder="Cole o Access Token do Google aqui"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
            />
            <Pressable
              onPress={handleConnectToken}
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Conectar Token</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handleDisconnect}
            style={[styles.disconnectBtn, { borderColor: colors.destructive }]}
          >
            <Feather name="log-out" size={16} color={colors.destructive} />
            <Text style={[styles.disconnectText, { color: colors.destructive }]}>Desconectar do Google</Text>
          </Pressable>
        )}

        {/* Configurações de API */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Configurações de Sincronização</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>ID da Planilha do Google Sheets</Text>
            <TextInput
              value={sheetsIdInput}
              onChangeText={setSheetsIdInput}
              placeholder="ID longo da URL da planilha"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Google Client ID (Opcional - Renovação)</Text>
            <TextInput
              value={clientIdInput}
              onChangeText={setClientIdInput}
              placeholder="Client ID do console do Google Cloud"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Google Client Secret (Opcional - Renovação)</Text>
            <TextInput
              value={clientSecretInput}
              onChangeText={setClientSecretInput}
              placeholder="Client Secret do console"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
            />
          </View>

          <Pressable
            onPress={handleSaveSettings}
            style={[styles.actionBtn, { backgroundColor: colors.primary + "15" }]}
          >
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Salvar Configurações</Text>
          </Pressable>
        </View>

        {/* Botão de Ação Principal de Sync */}
        {isConnected && (
          <Pressable
            onPress={performFullSync}
            disabled={syncing}
            style={[styles.syncBtn, { backgroundColor: colors.primary }, syncing && { opacity: 0.8 }]}
          >
            {syncing ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <>
                <Feather name="refresh-cw" size={20} color={colors.primaryForeground} />
                <Text style={[styles.syncBtnText, { color: colors.primaryForeground }]}>Sincronizar Agora</Text>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  content: { padding: 20, gap: 20, paddingBottom: 60 },
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusIndicator: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  lastSyncText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardDesc: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  disconnectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  disconnectText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  syncBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
