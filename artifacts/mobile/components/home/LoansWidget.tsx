import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/format";
import { dueLabel, dueSoon } from "@/lib/loanDue";
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
  const money = (v: number) => (showValue ? formatCurrency(v) : "••••••");

  const hasActive = loans.some((l) => l.status === "active");
  // Só o que vence: juros ou parcela, vencidos e dos próximos 7 dias (nunca o principal).
  const due = dueSoon(loans, loanPayments, new Date(), 7);
  const toReceive = due.filter((d) => d.direction === "lend").reduce((s, d) => s + d.amount, 0);
  const toPay = due.filter((d) => d.direction === "borrow").reduce((s, d) => s + d.amount, 0);
  const displayDue = due.slice(0, 3);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={[styles.iconBox, { backgroundColor: colors.primary + "12" }]}>
            <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Empréstimos</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Vencidos e próximos 7 dias</Text>
          </View>
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

      {due.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>A Receber</Text>
            <Text style={[styles.statValue, { color: colors.income }]}>{money(toReceive)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>A Pagar</Text>
            <Text style={[styles.statValue, { color: colors.destructive }]}>{money(toPay)}</Text>
          </View>
        </View>
      )}

      <View style={styles.loansContainer}>
        {!hasActive ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Nenhum empréstimo ativo registrado.
          </Text>
        ) : due.length === 0 ? (
          <View style={styles.allClear}>
            <Feather name="check-circle" size={16} color={colors.income} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, paddingVertical: 0 }]}>
              Nada vencido nem a vencer nos próximos 7 dias.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {displayDue.map((d) => {
              const loan = loans.find((l) => l.id === d.loanId)!;
              const contact = loanContacts.find((c) => c.id === loan.contactId);
              const isLend = d.direction === "lend";
              const late = d.status === "overdue";
              const tone = late ? colors.destructive : d.status === "today" ? colors.accent : colors.mutedForeground;
              return (
                <Pressable
                  key={d.loanId}
                  onPress={() => router.push(`/loans/loan-detail/${d.loanId}`)}
                  style={[styles.loanRow, { borderColor: late ? colors.destructive + "55" : colors.border }]}
                >
                  <View style={styles.loanInfo}>
                    <Text style={[styles.contactName, { color: colors.foreground }]} numberOfLines={1}>
                      {contact?.name || "Contato"}
                    </Text>
                    <Text style={[styles.description, { color: tone, fontFamily: late ? "Inter_600SemiBold" : "Inter_400Regular" }]} numberOfLines={1}>
                      {dueLabel(d)}
                      {d.overdueCount > 1 ? ` · ${d.overdueCount} ${loan.type === "monthly_interest" ? "meses" : "parcelas"}` : ""}
                    </Text>
                  </View>

                  <View style={styles.amountCol}>
                    <Text style={[styles.loanAmount, { color: isLend ? colors.income : colors.destructive }]}>
                      {isLend ? "+" : "-"} {money(d.amount)}
                    </Text>
                    <Text style={[styles.directionLabel, { color: colors.mutedForeground }]}>
                      {isLend ? "receber" : "pagar"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            {due.length > displayDue.length && (
              <Text style={[styles.more, { color: colors.mutedForeground }]}>
                + {due.length - displayDue.length} {due.length - displayDue.length === 1 ? "outro vencimento" : "outros vencimentos"}
              </Text>
            )}
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
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  allClear: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 },
  more: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
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
