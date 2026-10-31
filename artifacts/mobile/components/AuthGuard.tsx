import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, StyleSheet, Text, Pressable, AppState, Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { Feather } from "@expo/vector-icons";

import { useSettings } from "@/contexts/SettingsContext";
import { useColors } from "@/hooks/useColors";

/** Tempo fora do app a partir do qual a digital é pedida de novo. */
const RELOCK_AFTER_MS = 30_000;

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { settings, ready } = useSettings();
  const colors = useColors();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const authenticate = useCallback(async () => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    try {
      // Verifica se o módulo e as funções existem antes de chamar
      if (!LocalAuthentication.hasHardwareAsync || !LocalAuthentication.isEnrolledAsync) {
        setIsAuthenticated(true);
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setIsAuthenticated(true);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Acesse sua conta",
        fallbackLabel: "Usar senha do dispositivo",
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.warn("Erro na autenticação biométrica (módulo nativo pode estar ausente):", error);
      setIsAuthenticated(true); // Fallback de segurança para não travar o usuário
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating]);

  useEffect(() => {
    if (!ready) return;

    if (!settings.biometricsEnabled) {
      setIsAuthenticated(true);
      return;
    }

    authenticate();
  }, [ready, settings.biometricsEnabled]);

  // Re-autentica só depois de um tempo real em segundo plano. Janelas do sistema (permissão da
  // agenda, seletor de fotos, a própria digital) fazem o app "sair e voltar" por instantes e
  // não devem bloquear nem derrubar a tela atual.
  const leftAt = useRef<number | null>(null);
  useEffect(() => {
    if (!settings.biometricsEnabled) return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "background") {
        if (leftAt.current === null) leftAt.current = Date.now();
        return;
      }
      if (nextAppState === "active") {
        const away = leftAt.current === null ? 0 : Date.now() - leftAt.current;
        leftAt.current = null;
        if (away >= RELOCK_AFTER_MS && isAuthenticated) {
          setIsAuthenticated(false);
          authenticate();
        }
      }
    });

    return () => subscription.remove();
  }, [settings.biometricsEnabled, isAuthenticated, authenticate]);

  if (!ready) return null;

  const locked = settings.biometricsEnabled && !isAuthenticated;
  return (
    <View style={{ flex: 1 }}>
      {children}
      {locked && (
      <View style={[styles.container, StyleSheet.absoluteFill, { backgroundColor: colors.background }]}>
        <View style={[styles.iconBox, { backgroundColor: colors.primary + "15" }]}>
          <Feather name="lock" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>App Bloqueado</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Use sua biometria para acessar o Prisma
        </Text>
        
        <Pressable
          onPress={authenticate}
          style={({ pressed }) => [
            styles.retryBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="shield" size={20} color={colors.primaryForeground} />
          <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
            Desbloquear agora
          </Text>
        </Pressable>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 16,
  },
  iconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    minWidth: 200,
  },
  retryText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
