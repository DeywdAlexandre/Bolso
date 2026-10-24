import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { formatDate } from "@/lib/format";
import { parseDateString } from "@/lib/invoiceImport";
import type { VehicleReminderKind } from "@/lib/types";
import {
  completionPatch,
  REMINDER_KINDS,
  reminderLabel,
  reminderStatus,
  sortReminders,
} from "@/lib/vehicleReminders";

/** Vencimentos do veículo (IPVA, seguro, licenciamento, revisão…): lista, conclusão e cadastro. */
export function VehicleRemindersCard({ vehicleId }: { vehicleId: string }) {
  const colors = useColors();
  const { vehicleReminders, addVehicleReminder, updateVehicleReminder, removeVehicleReminder } = useAppData();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<VehicleReminderKind>("ipva");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [yearly, setYearly] = useState(true);

  const list = useMemo(
    () => sortReminders(vehicleReminders.filter((r) => r.vehicleId === vehicleId)),
    [vehicleReminders, vehicleId],
  );

  const pickKind = (k: VehicleReminderKind) => {
    setKind(k);
    setYearly(REMINDER_KINDS.find((x) => x.kind === k)?.yearly ?? false);
  };

  const save = async () => {
    const dueDate = parseDateString(due);
    if (!dueDate) {
      Alert.alert("Lembrete", "Informe a data de vencimento, por exemplo 15/03/2027.");
      return;
    }
    const label = REMINDER_KINDS.find((x) => x.kind === kind)?.label ?? "Lembrete";
    await addVehicleReminder({ vehicleId, kind, title: title.trim() || label, dueDate, repeatsYearly: yearly });
    setOpen(false);
    setTitle("");
    setDue("");
  };

  const confirmDelete = (id: string, name: string) =>
    Alert.alert("Excluir lembrete", `Excluir "${name}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => void removeVehicleReminder(id) },
    ]);

  const input = { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.foreground }]}>Vencimentos</Text>
        <Pressable onPress={() => setOpen(true)} hitSlop={8} style={[styles.add, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="plus" size={14} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Novo</Text>
        </Pressable>
      </View>

      {list.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          Cadastre IPVA, seguro, licenciamento ou revisão para não perder nenhum prazo.
        </Text>
      ) : (
        list.map((r) => {
          const status = reminderStatus(r);
          const color =
            status.state === "overdue" ? colors.destructive : status.state === "soon" ? colors.accent : colors.mutedForeground;
          const icon = (REMINDER_KINDS.find((x) => x.kind === r.kind)?.icon ?? "bell") as keyof typeof Feather.glyphMap;
          return (
            <View key={r.id} style={[styles.row, { borderTopColor: colors.border, opacity: status.state === "done" ? 0.55 : 1 }]}>
              <Feather name={icon} size={18} color={color} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>
                  {r.title}
                </Text>
                <Text style={{ color, fontSize: 12, fontFamily: "Inter_500Medium" }}>
                  {formatDate(r.dueDate)} · {reminderLabel(status)}
                  {r.repeatsYearly ? " · anual" : ""}
                </Text>
              </View>
              {status.state !== "done" && (
                <Pressable
                  onPress={() => void updateVehicleReminder(r.id, completionPatch(r))}
                  hitSlop={10}
                  accessibilityLabel={`Concluir ${r.title}`}
                >
                  <Feather name="check-circle" size={20} color={colors.income} />
                </Pressable>
              )}
              <Pressable onPress={() => confirmDelete(r.id, r.title)} hitSlop={10} accessibilityLabel={`Excluir ${r.title}`}>
                <Feather name="trash-2" size={17} color={colors.destructive} />
              </Pressable>
            </View>
          );
        })
      )}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.head}>
              <Text style={[styles.title, { color: colors.foreground, fontSize: 18 }]}>Novo vencimento</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <Feather name="x" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={styles.chips}>
              {REMINDER_KINDS.map((k) => {
                const active = k.kind === kind;
                return (
                  <Pressable
                    key={k.kind}
                    onPress={() => pickKind(k.kind)}
                    style={[
                      styles.chip,
                      { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + "22" : colors.card },
                    ]}
                  >
                    <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: active ? colors.primary : colors.mutedForeground }}>
                      {k.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Nome (opcional)"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, input]}
            />
            <TextInput
              value={due}
              onChangeText={setDue}
              placeholder="Vencimento (dd/mm/aaaa)"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numbers-and-punctuation"
              style={[styles.input, input]}
            />
            <View style={styles.switchRow}>
              <Text style={{ color: colors.foreground, fontSize: 14, flex: 1 }}>Repete todo ano</Text>
              <Switch value={yearly} onValueChange={setYearly} />
            </View>
            <Pressable onPress={save} style={[styles.save, { backgroundColor: colors.primary }]}>
              <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 15 }}>Salvar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 10 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 14, fontFamily: "Inter_700Bold" },
  add: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  empty: { fontSize: 12, fontFamily: "Inter_500Medium" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 10, borderTopWidth: 1 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15 },
  switchRow: { flexDirection: "row", alignItems: "center" },
  save: { alignItems: "center", paddingVertical: 14, borderRadius: 14 },
});
