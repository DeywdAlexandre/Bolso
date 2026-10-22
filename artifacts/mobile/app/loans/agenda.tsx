import React, { useMemo } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatDate } from "@/lib/format";
import { dueSoon } from "@/lib/loanDue";
import type { Loan, LoanContact } from "@/lib/types";

type AgendaItem = {
  loanId: string;
  contactId: string;
  contactName: string;
  description: string;
  amount: number;
  dueDate: string;
  type: "overdue" | "upcoming" | "today";
  direction: "lend" | "borrow";
};

export default function LoansAgendaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loans, loanPayments, loanContacts } = useAppData();

  const agenda = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue: AgendaItem[] = [];
    const upcoming: AgendaItem[] = [];
    const todayItems: AgendaItem[] = [];

    dueSoon(loans, loanPayments, today, 7).forEach((d) => {
      const loan = loans.find((l) => l.id === d.loanId)!;
      const contact = loanContacts.find((c) => c.id === loan.contactId);
      const item: AgendaItem = {
        loanId: loan.id,
        contactId: loan.contactId,
        contactName: contact?.name || "Desconhecido",
        description: loan.description,
        amount: d.amount,
        dueDate: d.dueDate,
        direction: loan.direction,
        type: d.status,
      };
      if (d.status === "overdue") overdue.push(item);
      else if (d.status === "today") todayItems.push(item);
      else upcoming.push(item);
    });

    // Ordenar
    const sortFn = (a: AgendaItem, b: AgendaItem) => a.dueDate.localeCompare(b.dueDate);
    
    return {
      overdue: overdue.sort(sortFn),
      today: todayItems.sort(sortFn),
      upcoming: upcoming.sort(sortFn),
      totalOverdue: overdue.reduce((s, i) => s + i.amount, 0),
      totalUpcoming: upcoming.reduce((s, i) => s + i.amount, 0) + todayItems.reduce((s, i) => s + i.amount, 0),
    };
  }, [loans, loanPayments, loanContacts]);

  const monthProgress = useMemo(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Total recebido/pago este mês
    const activityThisMonth = loanPayments.filter(p => new Date(p.date) >= firstDay);
    const totalReceived = activityThisMonth.reduce((s, p) => s + p.amount, 0);

    // Total que ainda falta (atrasados + próximos 7 dias)
    const pendingTotal = agenda.totalOverdue + agenda.totalUpcoming;

    if (totalReceived + pendingTotal === 0) return 0;
    return totalReceived / (totalReceived + pendingTotal);
  }, [loanPayments, agenda]);

  const renderItem = (item: AgendaItem) => (
    <Pressable
      key={`${item.loanId}-${item.dueDate}`}
      onPress={() => router.push({ pathname: "/loans/loan-detail/[id]", params: { id: item.loanId } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }
      ]}
    >
      <View style={[styles.statusIndicator, { backgroundColor: item.type === "overdue" ? colors.destructive : item.type === "today" ? colors.income : colors.accent }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[styles.contactName, { color: colors.foreground }]}>{item.contactName}</Text>
          <Text style={[styles.amount, { color: item.direction === "lend" ? colors.income : colors.expense }]}>
            {formatCurrency(item.amount)}
          </Text>
        </View>
        <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={1}>{item.description}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.dateBox}>
            <Feather name="calendar" size={12} color={colors.mutedForeground} />
            <Text style={[styles.dateText, { color: item.type === "overdue" ? colors.destructive : colors.mutedForeground }]}>
              {item.type === "overdue" ? `Vencido em ${formatDate(item.dueDate)}` : `Vence em ${formatDate(item.dueDate)}`}
            </Text>
          </View>
          <View style={[styles.directionBadge, { backgroundColor: item.direction === "lend" ? colors.income + "15" : colors.expense + "15" }]}>
            <Text style={[styles.directionText, { color: item.direction === "lend" ? colors.income : colors.expense }]}>
              {item.direction === "lend" ? "RECEBER" : "PAGAR"}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: "Agenda Situacional",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.primaryForeground,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ padding: 8, marginLeft: -10 }}>
              <Feather name="arrow-left" size={24} color={colors.primaryForeground} />
            </Pressable>
          ),
        }}
      />

      <View style={[styles.headerBackground, { backgroundColor: colors.primary }]} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: 20 }]} showsVerticalScrollIndicator={false}>
        {/* Painel de Saúde */}
        <View style={[styles.healthCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.healthTitle, { color: colors.mutedForeground }]}>Saúde da Carteira (Mensal)</Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${monthProgress * 100}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.foreground }]}>{Math.round(monthProgress * 100)}%</Text>
          </View>
          <View style={styles.kpiRow}>
            <View style={styles.kpi}>
              <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]}>Atrasado Total</Text>
              <Text style={[styles.kpiValue, { color: colors.destructive }]}>{formatCurrency(agenda.totalOverdue)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.kpi}>
              <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]}>Previsto 7 dias</Text>
              <Text style={[styles.kpiValue, { color: colors.income }]}>{formatCurrency(agenda.totalUpcoming)}</Text>
            </View>
          </View>
        </View>

        {/* Seção: Vencidos */}
        {agenda.overdue.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.destructive }]}>🚩 Vencidos</Text>
              <View style={[styles.countBadge, { backgroundColor: colors.destructive + "15" }]}>
                <Text style={[styles.countText, { color: colors.destructive }]}>{agenda.overdue.length}</Text>
              </View>
            </View>
            {agenda.overdue.map(renderItem)}
          </View>
        )}

        {/* Seção: Hoje */}
        {agenda.today.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.income }]}>⭐ Vence Hoje</Text>
            </View>
            {agenda.today.map(renderItem)}
          </View>
        )}

        {/* Seção: Próximos 7 dias */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>⏳ Próximos 7 Dias</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>{agenda.upcoming.length} pendentes</Text>
          </View>
          {agenda.upcoming.map(renderItem)}
          {agenda.upcoming.length === 0 && agenda.today.length === 0 && agenda.overdue.length === 0 && (
             <EmptyState 
               icon="calendar"
               title="Agenda Limpa"
               description="Nenhum vencimento pendente para os próximos dias."
             />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    gap: 24,
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140, // Altura suficiente para o header verde
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  healthCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  healthTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    width: 40,
  },
  kpiRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  kpi: {
    flex: 1,
    gap: 4,
  },
  kpiLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  kpiValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginHorizontal: 15,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  sectionSub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  card: {
    flexDirection: "row",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    height: 100,
  },
  statusIndicator: {
    width: 6,
    height: "100%",
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contactName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  amount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  directionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  directionText: {
    fontSize: 9,
    fontFamily: "Inter_800ExtraBold",
  },
});
