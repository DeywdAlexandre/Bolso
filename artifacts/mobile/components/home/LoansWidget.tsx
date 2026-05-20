import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/format";
import type { Loan, LoanContact, LoanPayment } from "@/lib/types";

interface LoansWidgetProps {
  loans: Loan[];
  loanPayments: LoanPayment[];
  loanContacts: LoanContact[];
  showValue: boolean;
}

export function LoansWidget({
  loans,
  loanPayments,
  loanContacts,
  showValue,
}: LoansWidgetProps) {
  const colors = useColors();

  const activeLoans = loans.filter((l) => l.status === "active");

  // Calcular saldos restantes a pagar e a receber
  let totalToReceive = 0;
  let totalToPay = 0;

  const loanItems = activeLoans.map((loan) => {
    const contact = loanContacts.find((c) => c.id === loan.contactId);
    
    // Calcula pagamentos amortizados de principal para este empréstimo
    const payments = loanPayments.filter((p) => p.loanId === loan.id);
    const totalPrincipalPaid = payments.reduce((sum, p) => sum + (p.principalPaid || p.amount), 0);
    const balanceRemaining = Math.max(0, loan.principalAmount - totalPrincipalPaid);

    if (loan.direction === "lend") {
      totalToReceive += balanceRemaining;
    } else {
      totalToPay += balanceRemaining;
    }

    return {
      ...loan,
      contactName: contact?.name || "Contato",
      balanceRemaining,
    };
  }).filter(item => item.balanceRemaining > 0);

  const displayLoans = loanItems.slice(0, 2);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={[styles.iconBox, { backgroundColor: colors.primary + "12" }]}>
            <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Empréstimos</Text>
        </View>
        <Pressable
          onPress={() => router.push("/loans")}
          style={({ pressed }) => [
            styles.linkBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.linkText, { color: colors.primary }]}>Ver mais</Text>
          <Feather name="chevron-right" size={14} color={colors.primary} />
        </Pressable>
      </View>

      {/* Resumo consolidado */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>A Receber</Text>
          <Text style={[styles.statValue, { color: colors.income }]}>
            {showValue ? formatCurrency(totalToReceive) : "••••••"}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>A Pagar</Text>
          <Text style={[styles.statValue, { color: colors.destructive }]}>
            {showValue ? formatCurrency(totalToPay) : "••••••"}
          </Text>
        </View>
      </View>

      {/* Lista de Empréstimos Ativos */}
      <View style={styles.loansContainer}>
        {loanItems.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Nenhum empréstimo ativo registrado.
          </Text>
        ) : (
          <View style={styles.list}>
            {displayLoans.map((loan) => {
              const isLend = loan.direction === "lend";
              return (
                <Pressable
                  key={loan.id}
                  onPress={() => router.push(`/loans/loan-detail/${loan.id}`)}
                  style={[styles.loanRow, { borderColor: colors.border }]}
                >
                  <View style={styles.loanInfo}>
                    <Text style={[styles.contactName, { color: colors.foreground }]} numberOfLines={1}>
                      {loan.contactName}
                    </Text>
                    <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {loan.description || (isLend ? "Dinheiro Emprestado" : "Dinheiro Pegado")}
                    </Text>
                  </View>

                  <View style={styles.amountCol}>
                    <Text
                      style={[
                        styles.loanAmount,
                        { color: isLend ? colors.income : colors.destructive },
                      ]}
                    >
                      {isLend ? "+" : "-"} {showValue ? formatCurrency(loan.balanceRemaining) : "••••••"}
                    </Text>
                    <Text style={[styles.directionLabel, { color: colors.mutedForeground }]}>
                      {isLend ? "receber" : "pagar"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  linkText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statBox: {
    flex: 1,
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  divider: {
    width: 1,
    height: 28,
    marginHorizontal: 16,
  },
  loansContainer: {
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 8,
  },
  list: {
    gap: 8,
  },
  loanRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  loanInfo: {
    flex: 1,
    gap: 2,
    marginRight: 12,
  },
  contactName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  description: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  amountCol: {
    alignItems: "flex-end",
    gap: 2,
  },
  loanAmount: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  directionLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
