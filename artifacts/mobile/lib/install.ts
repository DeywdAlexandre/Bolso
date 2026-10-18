import { Platform } from "react-native";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * - installed: já roda como app instalado (ou acabou de instalar)
 * - prompt: o navegador permite instalar com um toque (Chrome/Edge/Android)
 * - ios: Safari do iPhone/iPad, onde a instalação é manual (Compartilhar → Tela de Início)
 * - manual: outros navegadores web, instalação pelo menu do navegador
 * - unavailable: fora da web
 */
export type InstallState = "installed" | "prompt" | "ios" | "manual" | "unavailable";

let deferred: InstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const isWeb = () => Platform.OS === "web" && typeof window !== "undefined";

/** Começa a escutar o evento de instalação. Chame cedo: ele pode disparar antes da tela montar. */
export function initInstallPrompt(): void {
  if (!isWeb()) return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    justInstalled = true;
    notify();
  });
}

export function isStandalone(): boolean {
  if (!isWeb()) return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    window.matchMedia?.("(display-mode: fullscreen)").matches === true ||
    nav.standalone === true
  );
}

export function isIosDevice(): boolean {
  if (!isWeb()) return false;
  const ua = navigator.userAgent;
  // iPadOS recente se identifica como Mac, mas tem tela de toque.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function getInstallState(): InstallState {
  if (!isWeb()) return "unavailable";
  if (justInstalled || isStandalone()) return "installed";
  if (deferred) return "prompt";
  if (isIosDevice()) return "ios";
  return "manual";
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Abre o diálogo de instalação do navegador. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = deferred;
  if (!event) return "unavailable";
  deferred = null; // o evento só pode ser usado uma vez
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
}

/** Passos para instalar quando o navegador não oferece o diálogo automático. */
export function manualInstallSteps(state: InstallState): string[] {
  if (state === "ios") {
    return [
      "Abra o Prisma no Safari.",
      "Toque no botão Compartilhar (quadrado com a seta para cima).",
      "Escolha “Adicionar à Tela de Início” e confirme.",
    ];
  }
  return [
    "Abra o menu do navegador (⋮ ou ⋯).",
    "Escolha “Instalar app” ou “Adicionar à tela inicial”.",
    "Confirme a instalação.",
  ];
}
