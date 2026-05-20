import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { formatDate, formatCurrency } from "./format";

// Tenta configurar, mas não trava se falhar
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  console.warn("Notifications not supported in this environment");
}

export async function requestNotificationPermissions() {
  if (Platform.OS === "web") return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === "granted";
  } catch {
    return false;
  }
}

export async function scheduleLoanReminder(
  id: string,
  contactName: string,
  description: string,
  amount: number,
  dueDate: string
) {
  if (Platform.OS === "web") return;
  try {
    const trigger = new Date(dueDate);
    trigger.setHours(9, 0, 0, 0); 

    if (trigger.getTime() <= Date.now()) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Vencimento Hoje: ${contactName}`,
        body: `${description} - ${formatCurrency(amount)}`,
        data: { loanId: id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });
  } catch (e) {
    console.warn("Failed to schedule loan reminder:", e);
  }
}

export async function scheduleRecurringReminder(
  title: string,
  amount: number,
  dayOfMonth: number,
  isSubscription: boolean
) {
  if (Platform.OS === "web") return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: isSubscription ? `💳 Assinatura Hoje: ${title}` : `📅 Gasto Fixo Hoje: ${title}`,
        body: `Valor: ${formatCurrency(amount)}. Não esqueça de registrar!`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        day: dayOfMonth,
        hour: 8,
        minute: 0,
        repeats: true,
      },
    });

    const alertDay = dayOfMonth === 1 ? 28 : dayOfMonth - 1; 
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏳ Vence Amanhã: ${title}`,
        body: `Prepare o saldo de ${formatCurrency(amount)} para amanhã.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        day: alertDay,
        hour: 18,
        minute: 0,
        repeats: true,
      },
    });
  } catch (e) {
    console.warn("Failed to schedule recurring reminder:", e);
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
