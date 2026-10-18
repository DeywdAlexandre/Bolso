import { Alert, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import { toIsoDay } from "@/lib/format";
import { listSnapshots } from "@/lib/snapshots";
import { useAppData } from "@/contexts/AppDataContext";

export function useBackup() {
  const { exportData, importData } = useAppData();

  const handleExport = async () => {
    try {
      const json = await exportData();
      const filename = `backup_prisma_${toIsoDay(new Date())}.json`;

      if (Platform.OS === "web") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert("Erro", "O compartilhamento não está disponível neste dispositivo.");
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Não foi possível gerar o backup.");
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "application/json" });
      if (result.canceled) return;

      const file = result.assets[0];
      let content = "";

      if (Platform.OS === "web") {
        const response = await fetch(file.uri);
        content = await response.text();
      } else {
        content = await FileSystem.readAsStringAsync(file.uri);
      }

      const confirmMsg = "Isso irá SOBRESCREVER todos os seus dados atuais com os do arquivo de backup. Tem certeza?";
      
      const proceed = await new Promise((resolve) => {
        if (Platform.OS === "web") {
          resolve(window.confirm(confirmMsg));
        } else {
          Alert.alert("Confirmar Importação", confirmMsg, [
            { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
            { text: "Importar", style: "destructive", onPress: () => resolve(true) }
          ]);
        }
      });

      if (proceed) {
        await importData(content);
        Alert.alert("Sucesso", "Backup restaurado com sucesso! O app será reiniciado.");
        setTimeout(() => router.replace("/(tabs)"), 1000);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "O arquivo selecionado não é um backup válido do Prisma.");
    }
  };

  const handleRestoreSnapshot = async () => {
    try {
      const snapshots = await listSnapshots();
      const latest = snapshots[0];
      if (!latest) {
        Alert.alert("Backup automático", "Ainda não há cópias automáticas neste aparelho.");
        return;
      }
      const when = new Date(latest.createdAt).toLocaleString("pt-BR");
      const label = latest.reason === "auto" ? "backup automático" : "cópia feita antes da última importação";
      const msg = `Restaurar o ${label} de ${when}? Os dados atuais serão substituídos.`;

      const proceed = await new Promise<boolean>((resolve) => {
        if (Platform.OS === "web") {
          resolve(window.confirm(msg));
        } else {
          Alert.alert("Restaurar cópia", msg, [
            { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
            { text: "Restaurar", style: "destructive", onPress: () => resolve(true) },
          ]);
        }
      });
      if (!proceed) return;

      await importData(latest.json);
      Alert.alert("Sucesso", "Cópia restaurada com sucesso!");
      setTimeout(() => router.replace("/(tabs)"), 1000);
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Não foi possível restaurar a cópia.");
    }
  };

  return {
    handleExport,
    handleImport,
    handleRestoreSnapshot,
  };
}
