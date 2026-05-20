import { Alert, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import { useAppData } from "@/contexts/AppDataContext";

export function useBackup() {
  const { exportData, importData } = useAppData();

  const handleExport = async () => {
    try {
      const json = await exportData();
      const filename = `backup_bolso_${new Date().toISOString().split("T")[0]}.json`;

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
      Alert.alert("Erro", "O arquivo selecionado não é um backup válido do Bolso.");
    }
  };

  return {
    handleExport,
    handleImport,
  };
}
