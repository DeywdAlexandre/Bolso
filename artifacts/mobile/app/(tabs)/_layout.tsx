import { Tabs } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useChat } from "@/contexts/ChatContext";
import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/contexts/SettingsContext";
import type { TabName } from "@/lib/types";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const META: Record<
  TabName,
  { title: string; icon: IoniconsName; iconActive: IoniconsName }
> = {
  index: { title: "Início", icon: "home-outline", iconActive: "home" },
  loans: { title: "Empréstimos", icon: "briefcase-outline", iconActive: "briefcase" },
  goals: { title: "Metas", icon: "flag-outline", iconActive: "flag" },
  vehicles: {
    title: "Veículos",
    icon: "car-sport-outline",
    iconActive: "car-sport",
  },
  shifts: {
    title: "Escalas",
    icon: "calendar-outline",
    iconActive: "calendar",
  },
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BolsoTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="vehicles" />
      <Tabs.Screen name="goals" />
      <Tabs.Screen name="loans" />
      <Tabs.Screen name="shifts" />
    </Tabs>
  );
}

type TabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  navigation: {
    emit: (event: {
      type: "tabPress";
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: never) => void;
  };
};

function BolsoTabBar({ state, navigation }: TabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { open, unread } = useChat();
  const { settings } = useSettings();
  const isWeb = Platform.OS === "web";
  const bottomInset = isWeb ? 12 : Math.max(insets.bottom, 10);

  const activeTabs = settings.activeTabs || ["index", "vehicles", "goals", "loans"];
  // Limita a exibição a no máximo 4 abas para manter a simetria com o botão da IA central
  const visibleTabs = activeTabs.slice(0, 4);
  const mid = Math.ceil(visibleTabs.length / 2);
  const leftTabs = visibleTabs.slice(0, mid);
  const rightTabs = visibleTabs.slice(mid);

  const renderTab = (name: TabName) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return null;
    const focused =
      state.routes[state.index]?.name === name ? true : false;
    const meta = META[name];

    const handlePress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) {
        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
        navigation.navigate(route.name as never);
      }
    };

    return (
      <Pressable
        key={name}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        onPress={handlePress}
        style={styles.tab}
      >
        <View
          style={[
            styles.indicator,
            { backgroundColor: focused ? colors.primary : "transparent" },
          ]}
        />
        <Ionicons
          name={focused ? meta.iconActive : meta.icon}
          size={22}
          color={focused ? colors.primary : colors.mutedForeground}
        />
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: focused ? colors.primary : colors.mutedForeground,
              fontFamily: focused ? "Inter_600SemiBold" : "Inter_500Medium",
            },
          ]}
        >
          {meta.title}
        </Text>
      </Pressable>
    );
  };

  const handleAiPress = () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    open();
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: bottomInset,
          height: 64 + bottomInset,
        },
      ]}
    >
      {leftTabs.map(renderTab)}

      <View style={styles.aiSlot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Conversar com a IA"
          onPress={handleAiPress}
          style={({ pressed }) => [
            styles.aiButton,
            {
              backgroundColor: colors.primary,
              borderColor: colors.background,
              transform: [{ scale: pressed ? 0.94 : 1 }],
              shadowColor: colors.primary,
            },
          ]}
        >
          <Feather name="zap" size={26} color={colors.primaryForeground} />
          {unread > 0 ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.expense, borderColor: colors.card },
              ]}
            >
              <Text style={styles.badgeText}>
                {unread > 9 ? "9+" : unread}
              </Text>
            </View>
          ) : null}
        </Pressable>
        <Text
          style={[styles.aiLabel, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          Assistente
        </Text>
      </View>

      {rightTabs.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 3,
    paddingTop: 4,
  },
  indicator: {
    width: 22,
    height: 3,
    borderRadius: 2,
    marginBottom: 2,
  },
  label: {
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  aiSlot: {
    width: 78,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
  },
  aiButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -28,
    borderWidth: 5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 12,
  },
  aiLabel: {
    fontSize: 10.5,
    letterSpacing: 0.2,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
