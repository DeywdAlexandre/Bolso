import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";

import { AccountChip } from "@/components/accounts/AccountChip";
import { AmountInput } from "@/components/AmountInput";
import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { validateTransfer } from "@/lib/accounts";
import { formatDate, todayIso } from "@/lib/format";

export default function TransferScreen() {
  const colors = useColors();
  const { id, from: fromParam, to: toParam, amount: amountParam, note: noteParam } =
    useLocalSearchParams<{ id?: string; from?: string; to?: string; amount?: string; note?: string }>();
  const { accounts, transfers, addTransfer, updateTransfer, removeTransfer } = useAppData();
  const active = accounts.filter((a) => !a.archived);
  const editing = id ? transfers.find((t) => t.id === id) : undefined;

  const initialFrom = editing?.fromAccountId ?? (active.some((a) => a.id === fromParam) ? fromParam : active[0]?.id);
  const [from, setFrom] = useState<string | undefined>(initialFrom);
  // Destino: o pedido, senão a primeira conta diferente da origem (nunca a mesma).
  const [to, setTo] = useState<string | undefined>(
    editing?.toAccountId ??
      (active.some((a) => a.id === toParam && a.id !== initialFrom) ? toParam : active.find((a) => a.id !== initialFrom)?.id),
  );
  const [amount, setAmount] = useState(editing?.amount ?? (Number(amountParam) > 0 ? Number(amountParam) : 0));
  const [date, setDate] = useState(editing?.date ?? todayIso());
  const [note, setNote] = useState(editing?.note ?? noteParam ?? "");

  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString());
  };

  const save = async () => {
    const error = validateTransfer(accounts, { fromAccountId: from ?? "", toAccountId: to ?? "", amount });
    if (error) {
      Alert.alert("Transferência", error);
      return;
    }
    const values = { fromAccountId: from!, toAccountId: to!, amount, date, note: note.trim() || undefined };
    if (editing) await updateTransfer(editing.id, values);
    else await addTransfer(values);
    router.back();
  };

  const remove = async () => {
    if (!editing) return;
    const run = async () => {
      await removeTransfer(editing.id);
      router.back();
    };
    if (Platform.OS === "web") {
      if (globalThis.confirm?.("Excluir esta transferência? Os saldos das duas contas voltam ao que eram.")) void run();
      return;
    }
    Alert.alert("Excluir", "Os saldos das duas contas voltam ao que eram.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => void run() },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: editing ? "Editar transferência" : "Transferir" }} />
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
        {active.length < 2 && (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Cadastre pelo menos duas contas para transferir dinheiro entre elas.
          </Text>
        )}

        <View style={styles.amountWrap}>
          <AmountInput value={amount} onChange={setAmount} type="income" />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>De</Text>
          <View style={styles.wrap}>
            {active.map((a) => (
              <AccountChip key={a.id} label={a.name} color={a.color} active={from === a.id} onPress={() => setFrom(a.id)} />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Para</Text>
          <View style={styles.wrap}>
            {active.map((a) => (
              <AccountChip key={a.id} label={a.name} color={a.color} active={to === a.id} onPress={() => setTo(a.id)} />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Data</Text>
          <View style={[styles.dateRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={() => shiftDate(-1)} hitSlop={8} style={styles.dateBtn}>
              <Feather name="chevron-left" size={20} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.dateLabel, { color: colors.foreground }]}>{formatDate(date)}</Text>
            <Pressable onPress={() => shiftDate(1)} hitSlop={8} style={styles.dateBtn}>
              <Feather name="chevron-right" size={20} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Observação (opcional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Ex: saque para o fim de semana"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
          />
        </View>

        <Pressable
          onPress={save}
          style={({ pressed }) => [styles.save, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>{editing ? "Salvar" : "Transferir"}</Text>
        </Pressable>

        {editing && (
          <Pressable onPress={remove} style={styles.remove}>
            <Feather name="trash-2" size={16} color={colors.destructive} />
            <Text style={{ color: colors.destructive, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Excluir transferência</Text>
          </Pressable>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 18, paddingBottom: 60 },
  amountWrap: { alignItems: "center", paddingVertical: 4 },
  field: { gap: 8 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hint: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_500Medium" },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 14 },
  dateBtn: { padding: 14 },
  dateLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  save: { paddingVertical: 15, borderRadius: 16, alignItems: "center" },
  saveText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  remove: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10 },
});
