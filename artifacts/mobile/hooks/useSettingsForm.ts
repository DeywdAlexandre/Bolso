import { useEffect, useState } from "react";
import { Alert, Platform } from "react-native";
import { useAppData } from "@/contexts/AppDataContext";
import { useSettings } from "@/contexts/SettingsContext";

export function useSettingsForm() {
  const { settings, apiKey, setApiKey, setModel, setBiometricsEnabled } = useSettings();
  const { resetAll, userName, setUserName } = useAppData();

  const [nameDraft, setNameDraft] = useState(userName);
  const [keyDraft, setKeyDraft] = useState("");
  const [modelDraft, setModelDraft] = useState(settings.model);
  const [showKey, setShowKey] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);

  useEffect(() => {
    setNameDraft(userName);
  }, [userName]);

  useEffect(() => {
    setKeyDraft(apiKey ?? "");
  }, [apiKey]);

  useEffect(() => {
    setModelDraft(settings.model);
  }, [settings.model]);

  const [nameSaved, setNameSaved] = useState(false);

  /** O nome é salvo ao sair do campo, sem depender do botão da IA. */
  const saveName = async () => {
    const name = nameDraft.trim();
    if (name === userName) return;
    await setUserName(name);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const handleSave = async () => {
    await setUserName(nameDraft.trim());
    await setApiKey(keyDraft.trim() || null);
    await setModel(modelDraft.trim());
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 3000);
  };

  const handleClear = async () => {
    const confirmAction = () => {
      if (Platform.OS === "web") {
        const text = globalThis.prompt?.("Para apagar todos os dados, digite APAGAR abaixo:");
        if (text === "APAGAR") {
          resetAll();
        } else if (text !== null) {
          globalThis.alert?.("Palavra-chave incorreta. Ação cancelada.");
        }
      } else {
        Alert.alert(
          "⚠️ Ação Irreversível",
          "Todos os seus dados (transações, veículos, empréstimos) serão apagados. Deseja continuar?",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Sim, Prosseguir",
              style: "destructive",
              onPress: () => {
                setTimeout(() => {
                  Alert.alert(
                    "Confirmação Final",
                    "Tem certeza absoluta? Essa é sua última chance de cancelar.",
                    [
                      { text: "Cancelar", style: "cancel" },
                      { text: "APAGAR TUDO", style: "destructive", onPress: () => void resetAll() }
                    ]
                  );
                }, 500);
              }
            }
          ]
        );
      }
    };

    confirmAction();
  };

  return {
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
  };
}
