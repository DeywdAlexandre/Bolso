import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/contexts/SettingsContext";
import { useAppData } from "@/contexts/AppDataContext";

import { HomeHeader } from "@/components/home/HomeHeader";
import { FinanceWidget } from "@/components/home/FinanceWidget";
import { GoalsWidget } from "@/components/home/GoalsWidget";
import { VehiclesWidget } from "@/components/home/VehiclesWidget";
import { LoansWidget } from "@/components/home/LoansWidget";
import { ShiftsWidget } from "@/components/home/ShiftsWidget";

export default function HomeScreen() {
  const colors = useColors();
  const { settings } = useSettings();
  const {
    ready,
    userName,
    transactions,
    categories,
    vehicles,
    fuelings,
    oilChanges,
    vehicleExpenses,
    loans,
    loanPayments,
    loanContacts,
    goals,
    shifts,
    shiftRules,
  } = useAppData();

  const [showValue, setShowValue] = useState(true);

  if (!ready) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // 1. Abas ativas nas configurações
  const activeTabs = settings.activeTabs || ["index", "finance", "vehicles", "shifts"];

  // 2. Cálculos consolidados para o Cabeçalho e Widgets
  // Saldo geral acumulado das transações
  const globalBalance = transactions.reduce(
    (acc, tx) => acc + (tx.type === "income" ? tx.amount : -tx.amount),
    0
  );

  // Total acumulado nas metas
  const goalsTotal = goals.reduce((acc, g) => acc + (g.currentAmount || 0), 0);

  // Patrimônio consolidado
  const patrimony = globalBalance + goalsTotal;

  // Transações do mês atual
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const [currYear, currMonth] = todayStr.split("-").map(Number);

  const monthTransactions = transactions.filter((tx) => {
    const [y, m] = tx.date.split("-").map(Number);
    return y === currYear && m === currMonth;
  });

  const incomeMonth = monthTransactions.reduce(
    (acc, tx) => acc + (tx.type === "income" ? tx.amount : 0),
    0
  );
  const expenseMonth = monthTransactions.reduce(
    (acc, tx) => acc + (tx.type === "expense" ? tx.amount : 0),
    0
  );

  // Transações recentes (mini-extrato)
  const sortedTransactions = [...transactions].sort((a, b) => {
    const cmp = b.date.localeCompare(a.date);
    if (cmp !== 0) return cmp;
    return b.id.localeCompare(a.id);
  });
  const recentTransactions = sortedTransactions.slice(0, 2);

  // Verificar se há algum widget ativo na tela
  const hasAnyWidget =
    activeTabs.includes("finance") ||
    activeTabs.includes("vehicles") ||
    activeTabs.includes("goals") ||
    activeTabs.includes("loans") ||
    activeTabs.includes("shifts");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Cabeçalho Fixo */}
      <HomeHeader
        showValue={showValue}
        onToggleShowValue={() => setShowValue(!showValue)}
      />

      {/* Widgets em Scroll */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.widgetsContainer}>
          {/* Widget Finanças */}
          {activeTabs.includes("finance") && (
            <FinanceWidget
              globalBalance={globalBalance}
              incomeMonth={incomeMonth}
              expenseMonth={expenseMonth}
              recentTransactions={recentTransactions}
              categories={categories}
              showValue={showValue}
            />
          )}

          {/* Widget Metas */}
          {activeTabs.includes("goals") && (
            <GoalsWidget
              goals={goals}
              goalsTotal={goalsTotal}
              showValue={showValue}
            />
          )}

          {/* Widget Veículos */}
          {activeTabs.includes("vehicles") && (
            <VehiclesWidget
              vehicles={vehicles}
              fuelings={fuelings}
              oilChanges={oilChanges}
              vehicleExpenses={vehicleExpenses}
            />
          )}

          {/* Widget Empréstimos */}
          {activeTabs.includes("loans") && (
            <LoansWidget
              loans={loans}
              loanPayments={loanPayments}
              loanContacts={loanContacts}
              showValue={showValue}
            />
          )}

          {/* Widget Plantões */}
          {activeTabs.includes("shifts") && (
            <ShiftsWidget
              shifts={shifts}
              shiftRules={shiftRules}
              showValue={showValue}
            />
          )}

          {/* Estado Vazio (caso todos os widgets extras estejam desativados) */}
          {!hasAnyWidget && (
            <View style={[styles.emptyWidget, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.emptyWidgetTitle, { color: colors.foreground }]}>
                Nenhum widget ativo
              </Text>
              <Text style={[styles.emptyWidgetDesc, { color: colors.mutedForeground }]}>
                Vá em Configurações &gt; Menu Inferior e selecione as abas que deseja exibir no menu e no painel inicial.
              </Text>
            </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  widgetsContainer: {
    paddingHorizontal: 20,
    marginTop: -12, // Sobrepõe suavemente os widgets no cabeçalho arredondado
    gap: 20,
  },
  emptyWidget: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyWidgetTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  emptyWidgetDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
});
