import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import Head from "expo-router/head";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform } from "react-native";

import { AuthGuard } from "@/components/AuthGuard";
import { migrateLegacyStorage } from "@/lib/storage";
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
      <Stack.Screen name="categories" options={{ title: "Categorias" }} />
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
        // No Web, tentamos detectar mudanças de service worker de forma mais agressiva
        if (Platform.OS === "web" && "serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    // Nova versão instalada, recarrega para aplicar
                    window.location.reload();
                  }
                });
              }
            });
          }
        }

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
                  <Head>
                    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
                    <meta name="apple-mobile-web-app-capable" content="yes" />
                    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                    <link rel="apple-touch-icon" href="assets/images/apple-icon.png" />
                    <link rel="icon" type="image/png" href="assets/images/icon.png" />
                  </Head>
                  <StatusBar style="auto" />
                  <AuthGuard>
                    <RootLayoutNav />
                    <ChatSheet />
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
