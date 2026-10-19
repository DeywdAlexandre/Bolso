import { Alert, Platform } from "react-native";

import { showToast } from "./toast";

type Button = { text?: string; style?: "default" | "cancel" | "destructive"; onPress?: (value?: string) => void };

/** Títulos de confirmação: viram um aviso rápido na tela em vez de um diálogo que interrompe. */
const SUCCESS_TITLE = /^(sucesso|conclu[ií]d|confirmad|pronto|salvo|recebimento confirmado)/i;

/**
 * Comportamento de `Alert.alert` no navegador. O react-native-web não implementa o Alert (a chamada
 * é ignorada), então validações e confirmações simplesmente não apareciam no PWA.
 * - Aviso sem pergunta e com título de sucesso: aviso rápido na tela.
 * - Aviso sem pergunta (erro, validação): `window.alert`.
 * - Pergunta com um botão de ação (+ cancelar): `window.confirm`.
 */
export function webAlert(title: string, message?: string, buttons?: Button[]): void {
  const text = [title, message].filter(Boolean).join("\n\n");
  const cancel = buttons?.find((b) => b.style === "cancel");
  const actions = (buttons ?? []).filter((b) => b !== cancel);

  if (actions.length === 0 || (actions.length === 1 && !cancel)) {
    if (SUCCESS_TITLE.test(title)) showToast(message || title);
    else globalThis.alert?.(text);
    actions[0]?.onPress?.();
    return;
  }

  // Várias ações: usa a última (a destrutiva/principal) e trata "Cancelar" como recusa.
  const confirmed = globalThis.confirm?.(text) ?? false;
  if (confirmed) actions[actions.length - 1]!.onPress?.();
  else cancel?.onPress?.();
}

/** Instala o adaptador na web; no celular o Alert nativo continua valendo. */
export function installWebAlert(): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  (Alert as unknown as { alert: typeof webAlert }).alert = webAlert;
}
