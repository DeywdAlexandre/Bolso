import { Platform } from "react-native";

import { extractBundleUrls } from "./bundleUrls";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

const isWeb = () => Platform.OS === "web" && typeof window !== "undefined";

/** Registra o service worker (somente na web, fora do modo de desenvolvimento). */
export function registerServiceWorker(): void {
  if (!isWeb() || __DEV__ || !("serviceWorker" in navigator)) return;

  const register = () =>
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err) => console.warn("Falha ao registrar o service worker:", err));

  if (document.readyState === "complete") void register();
  else window.addEventListener("load", () => void register(), { once: true });
}

/** Bundles da versão que está rodando agora, lidos do próprio documento. */
function runningBundleUrls(): string[] {
  return extractBundleUrls(document.documentElement.outerHTML);
}

/**
 * Busca o HTML atual no servidor e diz se ele aponta para bundles diferentes dos
 * que estão em uso (ou seja, houve um deploy novo desde que o app abriu).
 */
export async function hasNewVersion(): Promise<boolean> {
  if (!isWeb() || __DEV__) return false;
  try {
    const res = await fetch(`/?__v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return false;
    const latest = extractBundleUrls(await res.text());
    const running = runningBundleUrls();
    if (latest.length === 0 || running.length === 0) return false;
    return latest.join("|") !== running.join("|");
  } catch {
    return false; // sem rede: tenta de novo depois
  }
}

/** Dispara `onChange` quando uma nova versão é detectada (ao voltar ao app, ao reconectar e a cada 15 min). */
export function watchForNewVersion(onFound: () => void): () => void {
  if (!isWeb() || __DEV__) return () => {};

  let stopped = false;
  const check = async () => {
    if (stopped) return;
    if (await hasNewVersion()) onFound();
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") void check();
  };

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", check);
  const timer = setInterval(check, CHECK_INTERVAL_MS);
  void check();

  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", check);
    clearInterval(timer);
  };
}

/** Recarrega para usar a versão nova (o service worker busca o HTML novo na rede). */
export function applyUpdate(): void {
  if (isWeb()) window.location.reload();
}
