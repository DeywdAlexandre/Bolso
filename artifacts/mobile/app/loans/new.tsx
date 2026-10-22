import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatDate, todayIso, genId, parseDecimalPtBr } from "@/lib/format";
import { AccountMethodFields } from "@/components/accounts/AccountMethodFields";
import { useAccountChoice } from "@/hooks/useAccountChoice";
import { useSettings } from "@/contexts/SettingsContext";
import type { LoanType } from "@/lib/types";

export default function NewLoanScreen() {
  const colors = useColors();
  const { contactId, id } = useLocalSearchParams<{ contactId: string; id?: string }>();
  const { loans, addLoan, updateLoan } = useAppData();
  
  const [direction, setDirection] = useState<"lend" | "borrow">("lend");
  const [type, setType] = useState<"monthly_interest" | "fixed_installments">("monthly_interest");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [interest, setInterest] = useState("");
  const [installments, setInstallments] = useState("1");
  const [date, setDate] = useState(todayIso());
  const [addToExtrat, setAddToExtrat] = useState(true);
  const [saving, setSaving] = useState(false);
  const { accountId, setAccountId, paymentMethod, setPaymentMethod } = useAccountChoice(true);
  const { updateSettings } = useSettings();

  const editingLoan = useMemo(() => (id ? loans.find((l) => l.id === id) : null), [id, loans]);

  useEffect(() => {
    if (editingLoan) {
      setDirection(editingLoan.direction);
      setType(editingLoan.type);
      setDescription(editingLoan.description);
      setAmount(editingLoan.principalAmount.toString());
      setInterest(editingLoan.interestRate.toString());
      setInstallments(editingLoan.installmentsCount?.toString() || "1");
      setDate(editingLoan.startDate);
    }
  }, [editingLoan]);

  const { addTransactionRaw } = useAppData();

  const handleSave = async () => {
    if (saving) return;

    // Validação inteligente
    const missingFields = [];
    if (!description) missingFields.push("Descrição");
    if (!amount) missingFields.push("Valor");
    if (interest === "") missingFields.push("Taxa de Juros");

    if (missingFields.length > 0) {
      const msg = `Para salvar, preencha os seguintes campos: ${missingFields.join(", ")}.`;
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Campos Obrigatórios", msg);
      }
      return;
    }
    
    setSaving(true);
    try {
      const pAmount = parseDecimalPtBr(amount);
      
      const payload = {
        contactId,
        direction,
        type,
        description: description.trim(),
        principalAmount: pAmount,
        interestRate: parseDecimalPtBr(interest),
        installmentsCount: type === "fixed_installments" ? parseInt(installments) : undefined,
        startDate: date,
      };

      if (id) {
        await updateLoan(id, payload);
      } else {
        const initialTxId = addToExtrat ? genId() : undefined;
        
        const newLoan = await addLoan({
          ...payload,
          initialTransactionId: initialTxId,
        });

        if (addToExtrat && initialTxId) {
          const isLend = direction === "lend";
          await addTransactionRaw({
            id: initialTxId,
            type: isLend ? "expense" : "income",
            amount: pAmount,
            categoryId: isLend ? "cat_loan_expense" : "cat_loan_income",
            date: date,
            description: `${isLend ? "Empréstimo concedido" : "Empréstimo recebido"}: ${description.trim()}`,
            accountId,
            paymentMethod,
            createdAt: new Date().toISOString(),
          });
          if (accountId) updateSettings({ lastAccountId: accountId });
        }
      }
      router.back();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const totalPreview = useMemo(() => {
    const p = parseFloat(amount) || 0;
    const i = parseFloat(interest) || 0;
    return p + (p * i) / 100;
  }, [amount, interest]);

  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString());
  };

  const nextPaymentDate = useMemo(() => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1);
    return d;
  }, [date]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {id ? "Editar Empréstimo" : "Novo Empréstimo"}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => setDirection("lend")}
              style={[
                styles.toggleBtn,
                { backgroundColor: direction === "lend" ? colors.income : colors.card },
              ]}
            >
              <Text style={[styles.toggleText, { color: direction === "lend" ? colors.primaryForeground : colors.foreground }]}>
                Emprestei
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setDirection("borrow")}
              style={[
                styles.toggleBtn,
                { backgroundColor: direction === "borrow" ? colors.expense : colors.card },
              ]}
            >
              <Text style={[styles.toggleText, { color: direction === "borrow" ? colors.primaryForeground : colors.foreground }]}>
                Peguei
              </Text>
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Data do Empréstimo</Text>
            <View style={[styles.dateRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable onPress={() => shiftDate(-1)} hitSlop={8} style={styles.dateBtn}>
                <Feather name="chevron-left" size={20} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.dateLabel, { color: colors.foreground }]}>{formatDate(date)}</Text>
              <Pressable onPress={() => shiftDate(1)} hitSlop={8} style={styles.dateBtn}>
                <Feather name="chevron-right" size={20} color={colors.foreground} />
              </Pressable>
            </View>
            <Text style={[styles.dueDateHint, { color: colors.mutedForeground }]}>
              Vencimento previsto: <Text style={{ color: colors.primary }}>{formatDate(nextPaymentDate.toISOString())}</Text>
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Tipo de Cobrança</Text>
            <View style={styles.typeRow}>
              <Pressable
                onPress={() => setType("monthly_interest")}
                style={[
                  styles.typeBtn,
                  { borderColor: type === "monthly_interest" ? colors.primary : colors.border },
                ]}
              >
                <Feather name="refresh-cw" size={18} color={type === "monthly_interest" ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.typeBtnText, { color: type === "monthly_interest" ? colors.foreground : colors.mutedForeground }]}>
                  Juros Mensais
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setType("fixed_installments")}
                style={[
                  styles.typeBtn,
                  { borderColor: type === "fixed_installments" ? colors.primary : colors.border },
                ]}
              >
                <Feather name="list" size={18} color={type === "fixed_installments" ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.typeBtnText, { color: type === "fixed_installments" ? colors.foreground : colors.mutedForeground }]}>
                  Parcelas Fixas
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Descrição</Text>
            <TextInput
              placeholder="Ex: Empréstimo para reforma"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Valor Principal</Text>
              <TextInput
                placeholder="0,00"
                keyboardType="numeric"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={amount}
                onChangeText={setAmount}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Taxa de Juros (%)</Text>
              <TextInput
                placeholder="10%"
                keyboardType="numeric"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={interest}
                onChangeText={setInterest}
              />
            </View>
          </View>

          {type === "fixed_installments" && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Número de Parcelas</Text>
              <TextInput
                placeholder="1"
                keyboardType="numeric"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={installments}
                onChangeText={setInstallments}
              />
            </View>
          )}

          {!id && (
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.foreground }]}>Lançar no extrato principal?</Text>
                <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>Registra a saída/entrada inicial do valor</Text>
              </View>
              <Switch
                value={addToExtrat}
                onValueChange={setAddToExtrat}
                trackColor={{ true: colors.primary }}
              />
            </View>
          )}

          {!id && addToExtrat && (
            <AccountMethodFields
              accountId={accountId}
              onAccountChange={setAccountId}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              hideCards
              accountLabel={direction === "lend" ? "De qual conta saiu o dinheiro?" : "Em qual conta você recebeu?"}
            />
          )}

          <View style={[styles.previewCard, { backgroundColor: colors.primary + "10" }]}>
            <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>
              {direction === "lend" ? "Você receberá no total:" : "Você pagará no total:"}
            </Text>
            <Text style={[styles.previewValue, { color: direction === "lend" ? colors.income : colors.expense }]}>
              {formatCurrency(totalPreview)}
            </Text>
            {type === "fixed_installments" && (
              <View style={styles.installmentPreview}>
                <Text style={[styles.previewSub, { color: colors.mutedForeground }]}>
                  {installments}x de <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold" }}>{formatCurrency(totalPreview / (parseInt(installments) || 1))}</Text>
                </Text>
              </View>
            )}
            <Text style={[styles.previewSub, { color: colors.mutedForeground }]}>
              Com base em {interest || "0"}% de juros
            </Text>
          </View>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              { 
                backgroundColor: colors.primary, 
                opacity: saving ? 0.5 : (pressed ? 0.8 : 1) 
              },
            ]}
          >
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
              {saving ? "Salvando..." : id ? "Salvar Alterações" : "Confirmar Empréstimo"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  form: {
    paddingHorizontal: 20,
    gap: 20,
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: "#00000010",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginLeft: 4,
  },
  input: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  typeRow: {
    flexDirection: "row",
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  typeBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  previewCard: {
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    gap: 4,
    marginTop: 12,
  },
  previewLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
  },
  previewValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  previewSub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  installmentPreview: {
    marginTop: 4,
    marginBottom: 2,
  },
  saveBtn: {
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  dateBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  dateLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  dueDateHint: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginLeft: 4,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 4,
  },
  switchLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  switchSub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
