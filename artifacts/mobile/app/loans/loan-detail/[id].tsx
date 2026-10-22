import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  Switch,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";

import { EmptyState } from "@/components/EmptyState";
import { useAppData } from "@/contexts/AppDataContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatDate, genId, toIsoDay, parseDecimalPtBr } from "@/lib/format";
import { AccountMethodFields } from "@/components/accounts/AccountMethodFields";
import { useAccountChoice } from "@/hooks/useAccountChoice";
import { generateLoanReport } from "@/lib/reports";

export default function LoanDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loans, loanPayments, addLoanPayment, removeLoanPayment, addTransactionRaw, removeLoan, loanContacts } = useAppData();

  const loan = useMemo(() => loans.find((l) => l.id === id), [loans, id]);
  const contact = useMemo(() => loanContacts.find(c => c.id === loan?.contactId), [loanContacts, loan]);
  const payments = useMemo(() => 
    loanPayments.filter((p) => p.loanId === id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [loanPayments, id]);

  const [modalOpen, setModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [addToExtrat, setAddToExtrat] = useState(true);
  const [saving, setSaving] = useState(false);
  const { accountId, setAccountId, paymentMethod, setPaymentMethod } = useAccountChoice(true);
  const { updateSettings } = useSettings();

  // Cálculos de Status
  const currentStatus = useMemo(() => {
    if (!loan) return null;
    const paidPrincipal = payments.reduce((s, p) => s + p.principalPaid, 0);
    const paidInterest = payments.reduce((s, p) => s + p.interestPaid, 0);
    const remainingPrincipal = loan.principalAmount - paidPrincipal;
    
    // Juros do mês atual
    const currentMonthInterest = (remainingPrincipal * loan.interestRate) / 100;

    // Cálculo da Data de Vencimento (mesmo dia do mês seguinte)
    const lastDate = payments.length > 0 ? payments[0].date : loan.startDate;
    const nextDue = new Date(lastDate);
    nextDue.setMonth(nextDue.getMonth() + 1);
    
    // Lógica para Parcelas Fixas
    const isFixed = loan.type === "fixed_installments";
    const totalContracted = loan.principalAmount * (1 + loan.interestRate / 100);
    const installmentValue = isFixed ? (totalContracted / (loan.installmentsCount || 1)) : 0;
    const installmentsPaid = isFixed ? Math.floor((paidPrincipal + paidInterest) / (installmentValue || 1)) : 0;

    return {
      paidPrincipal,
      paidInterest,
      remainingPrincipal,
      currentMonthInterest,
      totalRemaining: isFixed ? (totalContracted - (paidPrincipal + paidInterest)) : (remainingPrincipal + currentMonthInterest),
      nextDue: nextDue.toISOString(),
      isFixed,
      totalContracted,
      installmentValue,
      installmentsPaid,
    };
  }, [loan, payments]);

  if (!loan || !currentStatus) return null;

  const handleRegisterPayment = async () => {
    const val = parseDecimalPtBr(payAmount);
    if (val <= 0 || saving) return;

    setSaving(true);
    try {
      // Lógica Inteligente solicitada pelo usuário:
      // 1. Quita os juros primeiro
      // 2. O que sobra abate no principal
      const interestToPay = Math.min(val, currentStatus.currentMonthInterest);
      const principalToPay = val - interestToPay;

      const transactionId = genId();

      // Se marcado, adiciona no extrato principal
      if (addToExtrat) {
        const isLend = loan.direction === "lend";
        await addTransactionRaw({
          id: transactionId,
          type: isLend ? "income" : "expense",
          amount: val,
          categoryId: isLend ? "cat_loan_income" : "cat_loan_expense",
          date: toIsoDay(new Date()),
          description: `${isLend ? "Recebimento" : "Pagamento"}: ${loan.description}`,
          accountId,
          paymentMethod,
          createdAt: new Date().toISOString(),
        });
      }

      if (addToExtrat && accountId) updateSettings({ lastAccountId: accountId });

      const lp = await addLoanPayment({
        loanId: loan.id,
        amount: val,
        interestPaid: interestToPay,
        principalPaid: principalToPay,
        date: new Date().toISOString(),
        isMainExtratEntry: addToExtrat,
        transactionId: addToExtrat ? transactionId : undefined,
      });

      setModalOpen(false);
      setPayAmount("");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!loan || !currentStatus) return null;

  const handleDeleteLoan = () => {
    const confirmMsg = "Isso vai apagar o empréstimo e todo o histórico de pagamentos vinculados a ele. Tem certeza?";
    
    if (Platform.OS === "web") {
      if (window.confirm(confirmMsg)) {
        removeLoan(loan.id).then(() => router.back());
      }
    } else {
      Alert.alert(
        "Excluir Empréstimo",
        confirmMsg,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Excluir",
            style: "destructive",
            onPress: async () => {
              await removeLoan(loan.id);
              router.back();
            },
          },
        ]
      );
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Detalhes",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerLeft: () => (
            <Pressable 
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/loans");
                }
              }} 
              hitSlop={12} 
              style={{ marginLeft: -10, padding: 8 }}
            >
              <Feather name="arrow-left" size={24} color={colors.foreground} />
            </Pressable>
          ),
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => {
                  if (loan && contact) {
                    generateLoanReport(loan, contact, payments);
                  }
                }}
                hitSlop={8}
                style={{ padding: 6 }}
              >
                <Feather name="printer" size={18} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => router.push({ pathname: "/loans/new", params: { id: loan.id, contactId: loan.contactId } })}
                hitSlop={8}
                style={{ padding: 6 }}
              >
                <Feather name="edit-2" size={18} color={colors.foreground} />
              </Pressable>
              <Pressable onPress={handleDeleteLoan} hitSlop={8} style={{ padding: 6 }}>
                <Feather name="trash-2" size={18} color={colors.destructive} />
              </Pressable>
            </View>
          ),
        }}
      />
      
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          {/* Card de Resumo do Empréstimo */}
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryHeader}>
              <View style={[styles.iconBox, { backgroundColor: loan.direction === "lend" ? colors.income + "15" : colors.expense + "15" }]}>
                <Feather 
                  name={loan.direction === "lend" ? "arrow-up-right" : "arrow-down-left"} 
                  size={24} 
                  color={loan.direction === "lend" ? colors.income : colors.expense} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.loanDesc, { color: colors.foreground }]}>{loan.description}</Text>
                <Text style={[styles.loanMeta, { color: colors.mutedForeground }]}>
                  {loan.direction === "lend" ? "Você emprestou" : "Você pegou emprestado"}
                </Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Principal Restante</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {formatCurrency(currentStatus.remainingPrincipal)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Vencimento</Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {formatDate(currentStatus.nextDue)}
                </Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Juros do Mês ({loan.interestRate}%)</Text>
                <Text style={[styles.statValue, { color: colors.accent }]}>
                  {formatCurrency(currentStatus.currentMonthInterest)}
                </Text>
              </View>
            </View>

            <View style={[styles.totalBox, { backgroundColor: colors.muted }]}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>
                {currentStatus.isFixed ? "Saldo Restante Total" : "Expectativa Total Próximo Mês"}
              </Text>
              <Text style={[styles.totalValue, { color: colors.foreground }]}>
                {formatCurrency(currentStatus.totalRemaining)}
              </Text>
            </View>
          </View>

          {/* Cronograma de Parcelas (Apenas para Fixed Installments) */}
          {currentStatus.isFixed && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Cronograma de Parcelas</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.installmentsScroll}>
                {Array.from({ length: loan.installmentsCount || 0 }).map((_, i) => {
                  const installmentNum = i + 1;
                  const isPaid = installmentNum <= currentStatus.installmentsPaid;
                  const dueDate = new Date(loan.startDate);
                  dueDate.setMonth(dueDate.getMonth() + installmentNum);

                  return (
                    <View 
                      key={i} 
                      style={[
                        styles.installmentCard, 
                        { 
                          backgroundColor: isPaid ? colors.income + "10" : colors.card,
                          borderColor: isPaid ? colors.income : colors.border
                        }
                      ]}
                    >
                      <View style={styles.installmentHeader}>
                        <Text style={[styles.installmentNum, { color: colors.mutedForeground }]}>#{installmentNum}</Text>
                        {isPaid && <Feather name="check-circle" size={12} color={colors.income} />}
                      </View>
                      <Text style={[styles.installmentValue, { color: colors.foreground }]}>
                        {formatCurrency(currentStatus.installmentValue)}
                      </Text>
                      <Text style={[styles.installmentDate, { color: colors.mutedForeground }]}>
                        {formatDate(dueDate.toISOString())}
                      </Text>
                      <Text style={[styles.installmentStatus, { color: isPaid ? colors.income : colors.accent }]}>
                        {isPaid ? "Paga" : "Pendente"}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Botão de Ação */}
          <Pressable
            onPress={() => setModalOpen(true)}
            style={({ pressed }) => [
              styles.payBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="dollar-sign" size={20} color={colors.primaryForeground} />
            <Text style={[styles.payBtnText, { color: colors.primaryForeground }]}>
              {loan.direction === "lend" ? "Registrar Recebimento" : "Registrar Pagamento"}
            </Text>
          </Pressable>

          {/* Histórico */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Histórico de Movimentações</Text>
            {payments.length === 0 ? (
              <EmptyState
                icon="clock"
                title="Sem movimentações"
                description="Os pagamentos registrados aparecerão aqui."
              />
            ) : (
              payments.map((p) => (
                <View key={p.id} style={[styles.paymentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.paymentInfo}>
                    <Text style={[styles.paymentDate, { color: colors.mutedForeground }]}>{formatDate(p.date)}</Text>
                    <Text style={[styles.paymentAmount, { color: colors.foreground }]}>{formatCurrency(p.amount)}</Text>
                  </View>
                  <View style={styles.paymentDetails}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ alignItems: "flex-end", gap: 2 }}>
                        <Text style={[styles.paymentDetailText, { color: colors.mutedForeground }]}>
                          Juros: <Text style={{ color: colors.accent }}>{formatCurrency(p.interestPaid)}</Text>
                        </Text>
                        <Text style={[styles.paymentDetailText, { color: colors.mutedForeground }]}>
                          Principal: <Text style={{ color: colors.income }}>{formatCurrency(p.principalPaid)}</Text>
                        </Text>
                      </View>
                      <Pressable 
                        onPress={() => {
                          const confirmMsg = "Deseja excluir este registro? Isso reverterá o saldo do empréstimo e também removerá o lançamento do extrato principal (se houver).";
                          if (Platform.OS === "web") {
                            if (window.confirm(confirmMsg)) {
                              removeLoanPayment(p.id);
                            }
                          } else {
                            Alert.alert("Excluir Registro", confirmMsg, [
                              { text: "Cancelar", style: "cancel" },
                              { text: "Excluir", style: "destructive", onPress: () => removeLoanPayment(p.id) }
                            ]);
                          }
                        }}
                        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 8 }]}
                      >
                        <Feather name="trash-2" size={16} color={colors.destructive} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Modal de Pagamento */}
        <Modal visible={modalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Registrar Valor</Text>
                <Pressable onPress={() => setModalOpen(false)}>
                  <Feather name="x" size={24} color={colors.foreground} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.modalForm}>
                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={[styles.label, { color: colors.mutedForeground }]}>Valor Recebido/Pago</Text>
                    {currentStatus.currentMonthInterest > 0 && (
                      <Pressable 
                        onPress={() => setPayAmount(currentStatus.currentMonthInterest.toFixed(2).replace(".", ","))}
                        style={[styles.quickPayBtn, { backgroundColor: colors.accent + "15" }]}
                      >
                        <Text style={[styles.quickPayText, { color: colors.accent }]}>
                          Apenas Juros ({formatCurrency(currentStatus.currentMonthInterest)})
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  <TextInput
                    autoFocus
                    keyboardType="numeric"
                    placeholder="0,00"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border }]}
                    value={payAmount}
                    onChangeText={setPayAmount}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchLabel, { color: colors.foreground }]}>Lançar no extrato principal?</Text>
                    <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>Afeta seu saldo geral do dia</Text>
                  </View>
                  <Switch
                    value={addToExtrat}
                    onValueChange={setAddToExtrat}
                    trackColor={{ true: colors.primary }}
                  />
                </View>

                {addToExtrat && (
                  <AccountMethodFields
                    accountId={accountId}
                    onAccountChange={setAccountId}
                    paymentMethod={paymentMethod}
                    onPaymentMethodChange={setPaymentMethod}
                    hideCards
                    accountLabel={loan.direction === "lend" ? "Em qual conta você recebeu?" : "De qual conta saiu?"}
                  />
                )}

                <Pressable
                  onPress={handleRegisterPayment}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.confirmBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={[styles.confirmBtnText, { color: colors.primaryForeground }]}>
                    {saving ? "Processando..." : "Confirmar Registro"}
                  </Text>
                </Pressable>
              </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 20,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  loanDesc: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  loanMeta: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 20,
  },
  statItem: {
    flex: 1,
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  totalBox: {
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    gap: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  totalValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  payBtn: {
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  payBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  section: {
    gap: 16,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  paymentCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  paymentInfo: {
    gap: 2,
  },
  paymentDate: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  paymentAmount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  paymentDetails: {
    alignItems: "flex-end",
    gap: 2,
  },
  paymentDetailText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000080",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  modalForm: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  quickPayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickPayText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  modalInput: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  switchLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  switchSub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  confirmBtn: {
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  installmentsScroll: {
    gap: 12,
    paddingRight: 20,
  },
  installmentCard: {
    width: 130,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  installmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  installmentNum: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  installmentValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  installmentDate: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  installmentStatus: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    marginTop: 4,
  },
});
