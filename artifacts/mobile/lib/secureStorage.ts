import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const WEB_KEY_PREFIX = "@prisma/secure/";
const LEGACY_WEB_KEY_PREFIX = "@bolso/secure/";

export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return (
        globalThis.localStorage?.getItem(WEB_KEY_PREFIX + key) ??
        globalThis.localStorage?.getItem(LEGACY_WEB_KEY_PREFIX + key) ??
        null
      );
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.setItem(WEB_KEY_PREFIX + key, value);
    } catch {
      // ignore
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // ignore
  }
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.removeItem(WEB_KEY_PREFIX + key);
    } catch {
      // ignore
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}

export const SECURE_KEYS = {
  openrouterKey: "openrouter_api_key",
} as const;
