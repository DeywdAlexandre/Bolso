import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { DEFAULT_MODEL } from "@/lib/openrouter";
import { deleteSecureItem, getSecureItem, SECURE_KEYS, setSecureItem } from "@/lib/secureStorage";
import { loadJson, saveJson, STORAGE_KEYS } from "@/lib/storage";
import type { Settings, TabName } from "@/lib/types";

type SettingsContextValue = {
  ready: boolean;
  settings: Settings;
  apiKey: string | null;
  setApiKey: (value: string | null) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  setModel: (model: string) => Promise<void>;
  setThemeMode: (mode: "system" | "light" | "dark") => Promise<void>;
  setBiometricsEnabled: (enabled: boolean) => Promise<void>;
  setActiveTabs: (tabs: TabName[]) => Promise<void>;
  setGoogleCalendarLinked: (linked: boolean) => Promise<void>;
  setGoogleSheetsLinked: (linked: boolean) => Promise<void>;
  setLastSyncAt: (syncAt: string | undefined) => Promise<void>;
};

const DEFAULT_SETTINGS: Settings = {
  model: DEFAULT_MODEL,
  currency: "BRL",
  themeMode: "system",
  biometricsEnabled: false,
  activeTabs: ["index", "finance", "vehicles", "shifts"],
  googleCalendarLinked: false,
  googleSheetsLinked: false,
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [apiKey, setApiKeyState] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, k] = await Promise.all([
        loadJson<Settings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS),
        getSecureItem(SECURE_KEYS.openrouterKey),
      ]);
      if (cancelled) return;
      setSettings({ ...DEFAULT_SETTINGS, ...s });
      setApiKeyState(k);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void saveJson(STORAGE_KEYS.settings, next);
      return next;
    });
  }, []);

  const setApiKey = useCallback(async (value: string | null) => {
    if (value && value.trim().length > 0) {
      await setSecureItem(SECURE_KEYS.openrouterKey, value.trim());
      setApiKeyState(value.trim());
    } else {
      await deleteSecureItem(SECURE_KEYS.openrouterKey);
      setApiKeyState(null);
    }
  }, []);

  const setModel = useCallback(async (model: string) => {
    setSettings((prev) => {
      const next = { ...prev, model: model.trim() || DEFAULT_MODEL };
      void saveJson(STORAGE_KEYS.settings, next);
      return next;
    });
  }, []);

  const setThemeMode = useCallback(async (mode: "system" | "light" | "dark") => {
    setSettings((prev) => {
      const next = { ...prev, themeMode: mode };
      void saveJson(STORAGE_KEYS.settings, next);
      return next;
    });
  }, []);

  const setBiometricsEnabled = useCallback(async (enabled: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, biometricsEnabled: enabled };
      void saveJson(STORAGE_KEYS.settings, next);
      return next;
    });
  }, []);

  const setActiveTabs = useCallback(async (tabs: TabName[]) => {
    setSettings((prev) => {
      const next = { ...prev, activeTabs: tabs };
      void saveJson(STORAGE_KEYS.settings, next);
      return next;
    });
  }, []);

  const setGoogleCalendarLinked = useCallback(async (linked: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, googleCalendarLinked: linked };
      void saveJson(STORAGE_KEYS.settings, next);
      return next;
    });
  }, []);

  const setGoogleSheetsLinked = useCallback(async (linked: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, googleSheetsLinked: linked };
      void saveJson(STORAGE_KEYS.settings, next);
      return next;
    });
  }, []);

  const setLastSyncAt = useCallback(async (syncAt: string | undefined) => {
    setSettings((prev) => {
      const next = { ...prev, lastSyncAt: syncAt };
      void saveJson(STORAGE_KEYS.settings, next);
      return next;
    });
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ready,
      settings,
      apiKey,
      setApiKey,
      updateSettings,
      setModel,
      setThemeMode,
      setBiometricsEnabled,
      setActiveTabs,
      setGoogleCalendarLinked,
      setGoogleSheetsLinked,
      setLastSyncAt,
    }),
    [
      ready,
      settings,
      apiKey,
      setApiKey,
      updateSettings,
      setModel,
      setThemeMode,
      setBiometricsEnabled,
      setActiveTabs,
      setGoogleCalendarLinked,
      setGoogleSheetsLinked,
      setLastSyncAt,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
