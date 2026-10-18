import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";

import { AccountChip } from "@/components/accounts/AccountChip";
import { AmountInput } from "@/components/AmountInput";
import { useAppData } from "@/contexts/AppDataContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { ACCOUNT_COLORS, ACCOUNT_KINDS } from "@/lib/accounts";
import { formatCurrency } from "@/lib/format";
import type { AccountKind } from "@/lib/types";

export default function AccountFormScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accounts, balances, addAccount, updateAccount, correctAccountBalance } = useAppData();
  const { settings, updateSettings } = useSettings();

  const editing = id && id !== "new" ? accounts.find((a) => a.id === id) : undefined;
  const currentBalance = editing
    ? [...balances.accounts, ...balances.cards].find((b) => b.account.id === editing.id)?.balance ?? 0
    : 0;

  const [name, setName] = useState(editing?.name ?? "");
  const [kind, setKind] = useState<AccountKind>(editing?.kind ?? "bank");
  const [color, setColor] = useState(editing?.color ?? ACCOUNT_COLORS[accounts.length % ACCOUNT_COLORS.length]!);
  const isCard = kind === "card";
  // Em cartão o valor informado é a dívida (positiva na tela, negativa no saldo).
  const [balance, setBalance] = useState(editing ? (editing.kind === "card" ? -currentBalance : currentBalance) : 0);
  const [closingDay, setClosingDay] = useState(String(editing?.closingDay ?? 20));
  const [dueDay, setDueDay] = useState(String(editing?.dueDay ?? 28));
  const [limit, setLimit] = useState(editing?.creditLimit ?? 0);
  const [makeDefault, setMakeDefault] = useState(editing ? settings.defaultAccountId === editing.id : accounts.length === 0);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Nome", "Dê um nome para a conta (ex.: Nubank, Carteira).");
      return;
    }
    const closing = parseInt(closingDay, 10);
    const due = parseInt(dueDay, 10);
    if (isCard && (!(closing >= 1 && closing <= 31) || !(due >= 1 && due <= 31))) {
      Alert.alert("Cartão", "Informe dias de fechamento e vencimento entre 1 e 31.");
      return;
    }
    const signedBalance = isCard ? -balance : balance;
    const cardFields = isCard
      ? { closingDay: closing, dueDay: due, creditLimit: limit > 0 ? limit : undefined }
      : { closingDay: undefined, dueDay: undefined, creditLimit: undefined };
    let accountId = editing?.id;
    if (editing) {
      await updateAccount(editing.id, { name: trimmed, kind, color, ...cardFields });
      if (signedBalance !== currentBalance) await correctAccountBalance(editing.id, signedBalance);
    } else {
      accountId = (await addAccount({ name: trimmed, kind, color, balance: signedBalance, ...cardFields })).id;
    }
    if (makeDefault && accountId && !isCard) await updateSettings({ defaultAccountId: accountId });
    else if (!makeDefault && editing && settings.defaultAccountId === editing.id) {
      await updateSettings({ defaultAccountId: undefined });
    }
    router.back();
  };

  const archive = () => {
    if (!editing) return;
    const msg = `Arquivar "${editing.name}"? O saldo de ${formatCurrency(currentBalance)} deixa de contar no total. Você pode reativar depois.`;
    const run = async () => {
      await updateAccount(editing.id, { archived: true });
      if (settings.defaultAccountId === editing.id) await updateSettings({ defaultAccountId: undefined });
      router.back();
    };
    if (Platform.OS === "web") {
      if (globalThis.confirm?.(msg)) void run();
      return;
    }
    Alert.alert("Arquivar conta", msg, [
      { text: "Cancelar", style: "cancel" },
      { text: "Arquivar", style: "destructive", onPress: () => void run() },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: editing ? "Editar conta" : "Nova conta" }} />
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Nome</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex: Nubank, Itaú, Carteira"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Tipo</Text>
          <View style={styles.wrap}>
            {ACCOUNT_KINDS.map((k) => (
              <AccountChip key={k.value} label={k.label} active={kind === k.value} onPress={() => setKind(k.value)} />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Cor</Text>
          <View style={styles.wrap}>
            {ACCOUNT_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                accessibilityLabel={`Cor ${c}`}
                style={[styles.swatch, { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: colors.foreground }]}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            {isCard
              ? "Fatura/dívida em aberto hoje"
              : editing
                ? "Saldo atual"
                : "Quanto há nesta conta hoje?"}
          </Text>
          <View style={styles.amountWrap}>
            <AmountInput value={balance} onChange={setBalance} type="income" />
          </View>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {isCard
              ? "Quanto você já deve no cartão agora (fatura em aberto e parcelas a vencer). Deixe 0 se quiser começar do zero; daqui em diante cada compra lançada no cartão entra na fatura."
              : editing
                ? "Se o valor não bate com o seu banco, corrija aqui. Os lançamentos já feitos são mantidos."
                : "É o ponto de partida: daqui em diante cada gasto e entrada lançados nesta conta atualizam o saldo."}
          </Text>
        </View>

        {isCard && (
          <>
            <View style={styles.dayRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Fecha no dia</Text>
                <TextInput
                  value={closingDay}
                  onChangeText={(v) => setClosingDay(v.replace(/\D/g, "").slice(0, 2))}
                  keyboardType="number-pad"
                  style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Vence no dia</Text>
                <TextInput
                  value={dueDay}
                  onChangeText={(v) => setDueDay(v.replace(/\D/g, "").slice(0, 2))}
                  keyboardType="number-pad"
                  style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Limite (opcional)</Text>
              <View style={styles.amountWrap}>
                <AmountInput value={limit} onChange={setLimit} type="income" />
              </View>
            </View>
          </>
        )}

        {!isCard && (
        <View style={[styles.switchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchTitle, { color: colors.foreground }]}>Conta padrão</Text>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Usada em lançamentos automáticos (fixos, abastecimentos, empréstimos...).
            </Text>
          </View>
          <Switch value={makeDefault} onValueChange={setMakeDefault} trackColor={{ true: colors.primary }} />
        </View>
        )}

        <Pressable
          onPress={save}
          style={({ pressed }) => [styles.save, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>{editing ? "Salvar" : "Criar conta"}</Text>
        </Pressable>

        {editing && (
          <Pressable onPress={archive} style={styles.archive}>
            <Feather name="archive" size={16} color={colors.destructive} />
            <Text style={{ color: colors.destructive, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Arquivar conta</Text>
          </Pressable>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 18, paddingBottom: 60 },
  field: { gap: 8 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_500Medium" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  amountWrap: { alignItems: "center", paddingVertical: 4 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  dayRow: { flexDirection: "row", gap: 12 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  switchTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  save: { paddingVertical: 15, borderRadius: 16, alignItems: "center" },
  saveText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  archive: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10 },
});
