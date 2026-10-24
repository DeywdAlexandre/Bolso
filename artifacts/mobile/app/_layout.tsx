import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform } from "react-native";

import { AuthGuard } from "@/components/AuthGuard";
import { listenNotificationTaps } from "@/lib/notifications";
import { registerServiceWorker } from "@/lib/pwa";
import { migrateLegacyStorage } from "@/lib/storage";
import { PwaBanners } from "@/components/pwa/PwaBanners";
import { initInstallPrompt } from "@/lib/install";
import { installWebAlert } from "@/lib/webAlert";
import { ToastHost } from "@/components/ToastHost";
import { ChatSheet } from "@/components/ChatSheet";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { useColors } from "@/hooks/useColors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const colors = useColors();

  // Tocar num aviso abre a tela do assunto (empréstimo, veículo, escalas...).
  useEffect(() => listenNotificationTaps((route) => router.push(route as never)), []);
  
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="transaction/new"
        options={{
          presentation: "modal",
          title: "Nova transação",
        }}
      />
      <Stack.Screen
        name="transaction/[id]"
        options={{
          presentation: "modal",
          title: "Editar transação",
        }}
      />
      <Stack.Screen
        name="recurring/new"
        options={{
          presentation: "modal",
          title: "Nova recorrência",
        }}
      />
      <Stack.Screen
        name="recurring/[id]"
        options={{
          presentation: "modal",
          title: "Editar recorrência",
        }}
      />
      <Stack.Screen name="settings" options={{ title: "Configurações" }} />
      <Stack.Screen name="notifications" options={{ title: "Notificações" }} />
      <Stack.Screen name="categories" options={{ title: "Categorias" }} />
      <Stack.Screen name="accounts/index" options={{ title: "Contas e carteira" }} />
      <Stack.Screen name="accounts/[id]" options={{ title: "Conta" }} />
      <Stack.Screen name="accounts/transfer" options={{ title: "Transferir" }} />
      <Stack.Screen name="cards/[id]" options={{ title: "Cartão" }} />
      <Stack.Screen name="cards/import" options={{ title: "Importar fatura" }} />
      <Stack.Screen
        name="vehicle/new"
        options={{ presentation: "modal", title: "Novo veículo" }}
      />
      <Stack.Screen
        name="vehicle/[id]"
        options={{ title: "Veículo" }}
      />
      <Stack.Screen
        name="fueling/[id]"
        options={{ presentation: "modal", title: "Abastecimento" }}
      />
      <Stack.Screen
        name="oilchange/[id]"
        options={{ presentation: "modal", title: "Troca de óleo" }}
      />
    </Stack>
  );
}

// O evento de instalação pode disparar antes de qualquer tela montar.
initInstallPrompt();
// react-native-web ignora Alert.alert: sem isto, validações e confirmações não aparecem no PWA.
installWebAlert();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [storageMigrated, setStorageMigrated] = useState(false);
  const [updateChecked, setUpdateChecked] = useState(__DEV__ || !Updates.isEnabled);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    migrateLegacyStorage().finally(() => setStorageMigrated(true));
  }, []);

  useEffect(() => {
    if (updateChecked) return;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setUpdateChecked(true);
      }
    };

    // Timeout menor para não travar o usuário
    const timer = setTimeout(finish, 3500);

    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
          return;
        }
      } catch (e) {
        console.warn("Update check failed:", e);
      }
      finish();
    })();

    return () => {
      clearTimeout(timer);
      finish();
    };
  }, [updateChecked]);

  const ready = (fontsLoaded || fontError) && updateChecked && storageMigrated;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

function AppContent() {
  const colors = useColors();
  
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardProvider>
              <AppDataProvider>
                <ChatProvider>
                  <StatusBar style="auto" />
                  <AuthGuard>
                    <RootLayoutNav />
                    <ChatSheet />
                    <PwaBanners />
                    <ToastHost />
                  </AuthGuard>
                </ChatProvider>
              </AppDataProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
