import React, { useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { AmountInput } from "@/components/AmountInput";
import { CategoryPicker } from "@/components/CategoryPicker";
import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { AccountMethodFields } from "@/components/accounts/AccountMethodFields";
import { useSettings } from "@/contexts/SettingsContext";
import { preselectedAccountId } from "@/lib/accounts";
import type { PaymentMethod, TransactionType } from "@/lib/types";

type Initial = {
  type: TransactionType;
  amount: number;
  categoryId: string | null;
  description: string;
  dayOfMonth: number;
  active: boolean;
  isSubscription: boolean;
  accountId: string;
  paymentMethod: PaymentMethod;
};

type Props = {
  initial?: Partial<Initial>;
  /** Fixo novo: conta e forma de pagamento vêm pré-selecionadas com a última escolha. */
  rememberLast?: boolean;
  submitLabel: string;
  onSubmit: (values: {
    type: TransactionType;
    amount: number;
    categoryId: string;
    description: string;
    dayOfMonth: number;
    active: boolean;
    isSubscription: boolean;
    accountId?: string;
    paymentMethod?: PaymentMethod;
  }) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
};

export function RecurringForm({ initial, rememberLast, submitLabel, onSubmit, onDelete }: Props) {
  const colors = useColors();
  const { categories, accounts } = useAppData();
  const { settings } = useSettings();

  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState<number>(initial?.amount ?? 0);
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [description, setDescription] = useState<string>(initial?.description ?? "");
  const [dayOfMonth, setDayOfMonth] = useState<number>(initial?.dayOfMonth ?? new Date().getDate());
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [isSubscription, setIsSubscription] = useState<boolean>(initial?.isSubscription ?? false);
  const [accountId, setAccountId] = useState<string | undefined>(
    rememberLast
      ? preselectedAccountId(accounts, settings.lastAccountId, settings.defaultAccountId)
      : initial?.accountId,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>(
    rememberLast ? settings.lastPaymentMethod : initial?.paymentMethod,
  );
  const isCard = accounts.find((a) => a.id === accountId)?.kind === "card";

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
    if (dayOfMonth < 1 || dayOfMonth > 31) {
      Alert.alert("Dia inválido", "Escolha um dia entre 1 e 31.");
      return;
    }
    await onSubmit({
      type,
      amount,
      categoryId: cat,
      description: description.trim(),
      dayOfMonth,
      active,
      isSubscription,
      accountId,
      paymentMethod: isCard ? "credit" : paymentMethod === "credit" ? undefined : paymentMethod,
    });
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.toggle, { backgroundColor: colors.muted }]}>
        {(["expense", "income"] as TransactionType[]).map((t) => {
          const activeT = type === t;
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
                { backgroundColor: activeT ? colors.background : "transparent" },
              ]}
            >
              <Feather
                name={t === "income" ? "arrow-down-left" : "arrow-up-right"}
                size={14}
                color={activeT ? color : colors.mutedForeground}
              />
              <Text
                style={{
                  color: activeT ? color : colors.mutedForeground,
                  fontFamily: activeT ? "Inter_700Bold" : "Inter_500Medium",
                  fontSize: 13,
                }}
              >
                {t === "income" ? "Entrada" : "Gasto"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <AmountInput value={amount} onChange={setAmount} type={type} />

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
          placeholder="Ex: Aluguel, Netflix, Salário"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
          ]}
        />
      </Field>

      <Field label="Repete todo dia">
        <View style={[styles.dayRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable onPress={() => setDayOfMonth(Math.max(1, dayOfMonth - 1))} style={styles.dayBtn} hitSlop={8}>
            <Feather name="minus" size={18} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.dayLabel, { color: colors.foreground }]}>Dia {dayOfMonth}</Text>
          <Pressable onPress={() => setDayOfMonth(Math.min(31, dayOfMonth + 1))} style={styles.dayBtn} hitSlop={8}>
            <Feather name="plus" size={18} color={colors.foreground} />
          </Pressable>
        </View>
      </Field>

      <View style={[styles.activeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.activeTitle, { color: colors.foreground }]}>Ativo</Text>
          <Text style={[styles.activeSub, { color: colors.mutedForeground }]}>
            Recorrências inativas não geram lançamentos
          </Text>
        </View>
        <Pressable
          onPress={() => setActive(!active)}
          style={[
            styles.switchTrack,
            { backgroundColor: active ? colors.primary : colors.border },
          ]}
        >
          <View
            style={[
              styles.switchThumb,
              { backgroundColor: colors.background, transform: [{ translateX: active ? 22 : 2 }] },
            ]}
          />
        </Pressable>
      </View>

      {type === "expense" && (
        <View style={[styles.activeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.activeTitle, { color: colors.foreground }]}>É uma assinatura?</Text>
            <Text style={[styles.activeSub, { color: colors.mutedForeground }]}>
              Ex: Netflix, Spotify, iCloud, Academia
            </Text>
          </View>
          <Pressable
            onPress={() => setIsSubscription(!isSubscription)}
            style={[
              styles.switchTrack,
              { backgroundColor: isSubscription ? colors.primary : colors.border },
            ]}
          >
            <View
              style={[
                styles.switchThumb,
                { backgroundColor: colors.background, transform: [{ translateX: isSubscription ? 22 : 2 }] },
              ]}
            />
          </Pressable>
        </View>
      )}

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
            Alert.alert("Excluir", "Tem certeza?", [
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
  container: { padding: 20, paddingBottom: 60, gap: 16 },
  toggle: { flexDirection: "row", padding: 4, borderRadius: 12 },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  field: { gap: 10 },
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
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  dayBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  dayLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  activeTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  activeSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
