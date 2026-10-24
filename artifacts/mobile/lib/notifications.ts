import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { PlannedNotification } from "./notificationPlan";

const CHANNEL_ID = "lembretes";

// Tenta configurar, mas não trava se falhar
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  console.warn("Notifications not supported in this environment");
}

/** No Android 13+ o pedido de permissão só aparece depois que existe um canal de notificação. */
async function ensureChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Lembretes",
    description: "Vencimentos de empréstimos, contas, veículos, escalas e faturas",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export type NotificationPermission = "granted" | "denied" | "undetermined";

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (Platform.OS === "web") return "denied";
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
  } catch {
    return "denied";
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    await ensureChannel();
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export async function cancelAllNotifications() {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn("Failed to cancel notifications:", e);
  }
}

// Sincronizações em fila: duas rodadas ao mesmo tempo (dados mudando rápido) não podem se misturar.
let queue: Promise<void> = Promise.resolve();

/** Troca tudo o que estava agendado pelo plano atual. */
export function syncNotifications(plan: PlannedNotification[]): Promise<void> {
  if (Platform.OS === "web") return Promise.resolve();
  queue = queue.then(async () => {
    try {
      await ensureChannel();
      await Notifications.cancelAllScheduledNotificationsAsync();
      for (const n of plan) {
        await Notifications.scheduleNotificationAsync({
          identifier: n.key,
          content: { title: n.title, body: n.body, data: { route: n.route } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: CHANNEL_ID },
        });
      }
    } catch (e) {
      console.warn("Failed to sync notifications:", e);
    }
  });
  return queue;
}

/** Notificação de teste, 5 segundos depois. Devolve false se não foi possível agendar. */
export async function sendTestNotification(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      content: { title: "Prisma", body: "Tudo certo! As notificações estão funcionando." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL_ID },
    });
    return true;
  } catch {
    return false;
  }
}

/** Chama `onRoute` com a tela do aviso quando o usuário toca nele (app aberto, em segundo plano ou fechado). */
export function listenNotificationTaps(onRoute: (route: string) => void): () => void {
  if (Platform.OS === "web") return () => {};
  const open = (response: Notifications.NotificationResponse | null) => {
    const route = response?.notification.request.content.data?.route;
    if (typeof route === "string" && route.startsWith("/")) onRoute(route);
    // O sistema guarda o último toque: sem limpar, toda abertura do app reabriria essa tela.
    if (response) Notifications.clearLastNotificationResponse();
  };
  try {
    void Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
