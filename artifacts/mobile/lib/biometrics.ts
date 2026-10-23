import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

export type BiometricCheck = { ok: true } | { ok: false; message: string };

/**
 * Confirma que dá para proteger o app com digital/face antes de ligar o bloqueio:
 * há leitor, há biometria cadastrada e o usuário passa na verificação agora.
 * Sem isso o bloqueio ligaria "no escuro" e o usuário só descobriria o problema ao reabrir o app.
 */
export async function verifyBiometricsForEnable(): Promise<BiometricCheck> {
  if (Platform.OS === "web") {
    return { ok: false, message: "O desbloqueio por digital só funciona no app instalado no celular (APK)." };
  }
  try {
    if (!(await LocalAuthentication.hasHardwareAsync())) {
      return { ok: false, message: "Este aparelho não tem leitor de digital ou reconhecimento facial." };
    }
    if (!(await LocalAuthentication.isEnrolledAsync())) {
      return {
        ok: false,
        message: "Nenhuma digital cadastrada. Cadastre uma em Configurações do Android → Segurança e tente de novo.",
      };
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirme para ativar o bloqueio",
      cancelLabel: "Cancelar",
    });
    return result.success ? { ok: true } : { ok: false, message: "A verificação não foi concluída. O bloqueio continua desligado." };
  } catch {
    return { ok: false, message: "Não consegui acessar a biometria deste aparelho." };
  }
}
