import React, { useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { AmountInput } from "@/components/AmountInput";
import { CategoryPicker } from "@/components/CategoryPicker";
import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { formatDate, todayIso } from "@/lib/format";
import { AccountMethodFields } from "@/components/accounts/AccountMethodFields";
import { useSettings } from "@/contexts/SettingsContext";
import { preselectedAccountId } from "@/lib/accounts";
import type { PaymentMethod, TransactionType } from "@/lib/types";

type Initial = {
  type: TransactionType;
  amount: number;
  categoryId: string | null;
  description: string;
  date: string;
  accountId: string;
  paymentMethod: PaymentMethod;
};

type Props = {
  initial?: Partial<Initial>;
  /** Lançamento novo: conta e forma de pagamento vêm pré-selecionadas com a última escolha. */
  rememberLast?: boolean;
  submitLabel: string;
  onSubmit: (values: {
    type: TransactionType;
    amount: number;
    categoryId: string;
    description: string;
    date: string;
    accountId?: string;
    paymentMethod?: PaymentMethod;
  }) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
};

export function TransactionForm({ initial, rememberLast, submitLabel, onSubmit, onDelete }: Props) {
  const colors = useColors();
  const { categories, accounts } = useAppData();
  const { settings, updateSettings } = useSettings();

  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState<number>(initial?.amount ?? 0);
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [description, setDescription] = useState<string>(initial?.description ?? "");
  const [date, setDate] = useState<string>(initial?.date ?? todayIso());
  const [accountId, setAccountId] = useState<string | undefined>(
    rememberLast
      ? preselectedAccountId(accounts, settings.lastAccountId, settings.defaultAccountId)
      : initial?.accountId,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>(
    rememberLast ? settings.lastPaymentMethod : initial?.paymentMethod,
  );

  const filteredCats = useMemo(() => categories.filter((c) => c.type === type), [categories, type]);

  const handleSubmit = async () => {
    if (amount <= 0) {
      Alert.alert("Valor inválido", "Informe um valor maior que zero.");
      return;
    }
    const cat = categoryId ?? filteredCats[0]?.id;
    if (!cat) {
      Alert.alert("Categoria", "Selecione uma categoria.");
      return;
    }
    if (rememberLast) {
      await updateSettings({
        lastAccountId: accountId ?? settings.lastAccountId,
        lastPaymentMethod: paymentMethod ?? settings.lastPaymentMethod,
      });
    }
    await onSubmit({
      type,
      amount,
      categoryId: cat,
      description: description.trim(),
      date,
      accountId,
      paymentMethod,
    });
  };

  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString());
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.toggle, { backgroundColor: colors.muted }]}>
        {(["expense", "income"] as TransactionType[]).map((t) => {
          const active = type === t;
          const color = t === "income" ? colors.income : colors.expense;
          return (
            <Pressable
              key={t}
              onPress={() => {
                setType(t);
                if (categoryId) {
                  const cat = categories.find((c) => c.id === categoryId);
                  if (!cat || cat.type !== t) setCategoryId(null);
                }
              }}
              style={[
                styles.toggleBtn,
                {
                  backgroundColor: active ? colors.background : "transparent",
                },
              ]}
            >
              <Feather
                name={t === "income" ? "arrow-down-left" : "arrow-up-right"}
                size={14}
                color={active ? color : colors.mutedForeground}
              />
              <Text
                style={{
                  color: active ? color : colors.mutedForeground,
                  fontFamily: active ? "Inter_700Bold" : "Inter_500Medium",
                  fontSize: 13,
                }}
              >
                {t === "income" ? "Entrada" : "Gasto"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.amountWrap}>
        <AmountInput value={amount} onChange={setAmount} type={type} />
      </View>

      <Field label="Categoria">
        <View style={{ marginHorizontal: -20 }}>
          <CategoryPicker
            categories={filteredCats}
            selectedId={categoryId}
            onSelect={setCategoryId}
          />
        </View>
      </Field>

      <AccountMethodFields
        accountId={accountId}
        onAccountChange={setAccountId}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
      />

      <Field label="Descrição">
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Ex: almoço, mercado, salário"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
          ]}
        />
      </Field>

      <Field label="Data">
        <View style={[styles.dateRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable onPress={() => shiftDate(-1)} hitSlop={8} style={styles.dateBtn}>
            <Feather name="chevron-left" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.dateLabel, { color: colors.foreground }]}>{formatDate(date)}</Text>
          <Pressable onPress={() => shiftDate(1)} hitSlop={8} style={styles.dateBtn}>
            <Feather name="chevron-right" size={20} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.quickDates}>
          {[
            { label: "Hoje", offset: 0 },
            { label: "Ontem", offset: -1 },
          ].map((q) => (
            <Pressable
              key={q.label}
              onPress={() => {
                const d = new Date();
                d.setDate(d.getDate() + q.offset);
                d.setHours(12, 0, 0, 0);
                setDate(d.toISOString());
              }}
              style={[styles.quickBtn, { backgroundColor: colors.muted }]}
            >
              <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                {q.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Pressable
        onPress={handleSubmit}
        style={({ pressed }) => [
          styles.submit,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[styles.submitText, { color: colors.primaryForeground }]}>{submitLabel}</Text>
      </Pressable>

      {onDelete ? (
        <Pressable
          onPress={async () => {
            if (Platform.OS === "web") {
              await onDelete();
              return;
            }
            Alert.alert("Excluir", "Tem certeza que deseja excluir esta transação?", [
              { text: "Cancelar", style: "cancel" },
              { text: "Excluir", style: "destructive", onPress: () => void onDelete() },
            ]);
          }}
          style={({ pressed }) => [styles.delete, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="trash-2" size={16} color={colors.destructive} />
          <Text style={[styles.deleteText, { color: colors.destructive }]}>Excluir</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
    gap: 16,
  },
  toggle: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  amountWrap: {
    paddingVertical: 12,
  },
  field: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
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
  quickDates: {
    flexDirection: "row",
    gap: 8,
  },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  submit: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  delete: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  deleteText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
