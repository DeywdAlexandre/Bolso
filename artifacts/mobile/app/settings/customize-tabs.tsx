import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/contexts/SettingsContext";
import type { TabName } from "@/lib/types";

const ALL_TABS: { id: Exclude<TabName, "index">; label: string; description: string; icon: string }[] = [
  { id: "finance", label: "Finanças", description: "Visão geral e detalhe das suas transações", icon: "wallet-outline" },
  { id: "vehicles", label: "Veículos", description: "Consumo de combustível, óleo e gastos", icon: "car-sport-outline" },
  { id: "goals", label: "Metas", description: "Planejamento e acompanhamento de economias", icon: "flag-outline" },
  { id: "loans", label: "Empréstimos", description: "Gerenciamento de devedores e credores", icon: "briefcase-outline" },
  { id: "shifts", label: "Escalas", description: "Suas escalas de serviço integradas ao calendário", icon: "calendar-outline" },
];

export default function CustomizeTabsScreen() {
  const colors = useColors();
  const { settings, setActiveTabs } = useSettings();

  const [activeList, setActiveList] = useState<TabName[]>(
    (settings.activeTabs || ["index", "finance", "vehicles", "shifts"]).filter((t) => t !== "index")
  );

  const toggleTab = (id: TabName) => {
    if (activeList.includes(id)) {
      if (activeList.length <= 1) {
        Alert.alert("Limite Mínimo", "Você precisa manter pelo menos 1 aba opcional ativa na barra inferior.");
        return;
      }
      setActiveList(activeList.filter((item) => item !== id));
    } else {
      if (activeList.length >= 3) {
        Alert.alert("Limite Máximo", "Você pode exibir no máximo 3 abas opcionais (junto com a aba fixa de Início).");
        return;
      }
      setActiveList([...activeList, id]);
    }
  };

  const handleSave = async () => {
    await setActiveTabs(["index", ...activeList]);
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Customizar Abas",
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={{ marginLeft: -10, padding: 8 }}
            >
              <Feather name="arrow-left" size={24} color={colors.foreground} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
      >
        <View style={styles.headerInfo}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Escolha as abas do Menu
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            A aba 'Início' é fixa e obrigatória. Escolha de 1 a 3 abas adicionais para exibir na barra inferior do menu. As outras ficarão ocultas, mas seus dados continuarão salvos normalmente.
          </Text>
        </View>

        <View style={styles.listContainer}>
          {ALL_TABS.map((tab) => {
            const isActive = activeList.includes(tab.id);
            return (
              <Pressable
                key={tab.id}
                onPress={() => toggleTab(tab.id)}
                style={[
                  styles.tabRow,
                  {
                    backgroundColor: colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isActive ? colors.primary + "15" : colors.muted,
                    },
                  ]}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={22}
                    color={isActive ? colors.primary : colors.mutedForeground}
                  />
                </View>

                <View style={styles.infoBox}>
                  <Text style={[styles.label, { color: colors.foreground }]}>
                    {tab.label}
                  </Text>
                  <Text style={[styles.desc, { color: colors.mutedForeground }]}>
                    {tab.description}
                  </Text>
                </View>

                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: isActive ? colors.primary : colors.mutedForeground,
                      backgroundColor: isActive ? colors.primary : "transparent",
                    },
                  ]}
                >
                  {isActive && <Feather name="check" size={14} color="#FFF" />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>
            Salvar Preferências
          </Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60, gap: 24 },
  headerInfo: { gap: 8 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  listContainer: { gap: 12 },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBox: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },
  saveText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
