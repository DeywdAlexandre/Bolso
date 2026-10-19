import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useColors } from "@/hooks/useColors";
import { useLoansDashboard } from "@/hooks/useLoansDashboard";

import { LoansStatsCard } from "@/components/loans/LoansStatsCard";
import { LoansExpandedGrid } from "@/components/loans/LoansExpandedGrid";
import { ContactItemCard } from "@/components/loans/ContactItemCard";

export default function LoansDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const {
    search,
    setSearch,
    isExpanded,
    toggleExpand,
    stats,
    filteredContacts,
  } = useLoansDashboard();

  const topPad = Platform.OS === "web" ? 15 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerBackground, { backgroundColor: colors.primary, height: topPad + 160 }]} />
      
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.primaryForeground }]}>Empréstimos</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable 
              onPress={() => router.push("/loans/agenda")}
              style={[styles.expandBtn, { backgroundColor: colors.primaryForeground + "20" }]}
            >
              <Feather name="calendar" size={18} color={colors.primaryForeground} />
            </Pressable>
            <Pressable 
              onPress={toggleExpand}
              style={[styles.expandBtn, { backgroundColor: colors.primaryForeground + "20" }]}
            >
              <Feather 
                name={isExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={colors.primaryForeground} 
              />
              <Text style={[styles.expandBtnText, { color: colors.primaryForeground }]}>
                {isExpanded ? "Recolher" : "Detalhes"}
              </Text>
            </Pressable>
          </View>
        </View>
        
        {/* Cards de Resumo Principais */}
        <LoansStatsCard toReceive={stats.toReceive} toPay={stats.toPay} />

        {/* Grade de Detalhes (Expansível) */}
        {isExpanded && <LoansExpandedGrid stats={stats} />}
      </View>

      <View style={styles.content}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { backgroundColor: colors.muted }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              placeholder="Buscar pessoa..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <Pressable
            onPress={() => router.push("/loans/new-contact")}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="plus" size={24} color={colors.primaryForeground} />
          </Pressable>
        </View>

        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ContactItemCard item={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="users"
              title="Nenhuma pessoa"
              description="Adicione contatos para gerenciar empréstimos."
            />
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  expandBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  expandBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  searchRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 25,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  addBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingBottom: 40,
    gap: 12,
  },
});
