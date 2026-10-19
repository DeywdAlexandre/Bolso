import React, { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { parseDecimalPtBr } from "@/lib/format";
import { normalizeTime, validateShiftForm } from "@/lib/shifts";
import type { Shift } from "@/lib/types";

import { styles } from "./styles";

type Props = {
  shift: Shift | null;
  onClose: () => void;
  onSave: (id: string, patch: Pick<Shift, "name" | "type" | "value" | "startTime" | "endTime">) => void;
};

/** Edita nome, tipo, valor e horário de um plantão (só esta data; a escala não muda). */
export function ShiftEditModal({ shift, onClose, onSave }: Props) {
  const colors = useColors();
  const [name, setName] = useState("");
  const [type, setType] = useState<"ordinary" | "extra">("ordinary");
  const [value, setValue] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  useEffect(() => {
    if (!shift) return;
    setName(shift.name);
    setType(shift.type);
    setValue(shift.value ? String(shift.value).replace(".", ",") : "");
    setStart(shift.startTime);
    setEnd(shift.endTime);
  }, [shift]);

  if (!shift) return null;
  // Plantão já recebido tem uma receita no extrato: o tipo só muda depois de desfazer o recebimento.
  const typeLocked = !!shift.isPaid;

  const save = () => {
    const error = validateShiftForm({ name, startTime: start, endTime: end });
    if (error) {
      Alert.alert("Plantão", error);
      return;
    }
    onSave(shift.id, {
      name: name.trim(),
      type,
      value: type === "extra" ? parseDecimalPtBr(value) : undefined,
      startTime: normalizeTime(start)!,
      endTime: normalizeTime(end)!,
    });
  };

  const input = [styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Editar plantão</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar">
              <Feather name="x" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Nome</Text>
              <TextInput value={name} onChangeText={setName} placeholderTextColor={colors.mutedForeground} style={input} />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Tipo</Text>
              <View style={[styles.toggleGroup, { backgroundColor: colors.muted, opacity: typeLocked ? 0.5 : 1 }]}>
                {(["ordinary", "extra"] as const).map((t) => (
                  <Pressable
                    key={t}
                    disabled={typeLocked}
                    onPress={() => setType(t)}
                    style={[styles.toggleBtn, type === t && { backgroundColor: colors.card }]}
                  >
                    <Text style={[styles.toggleText, { color: colors.foreground }]}>
                      {t === "ordinary" ? "Ordinário (Fixo)" : "Extra (Remunerado)"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {typeLocked && (
                <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                  Este plantão já foi recebido. Desfaça o recebimento para mudar o tipo.
                </Text>
              )}
            </View>

            {type === "extra" && (
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Valor (R$)</Text>
                <TextInput value={value} onChangeText={setValue} keyboardType="numeric" placeholder="0,00" placeholderTextColor={colors.mutedForeground} style={input} />
              </View>
            )}

            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Início</Text>
                <TextInput value={start} onChangeText={setStart} placeholder="07:00" placeholderTextColor={colors.mutedForeground} style={input} />
              </View>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Fim</Text>
                <TextInput value={end} onChangeText={setEnd} placeholder="19:00" placeholderTextColor={colors.mutedForeground} style={input} />
              </View>
            </View>

            <Pressable onPress={save} style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}>
              <Text style={[styles.saveText, { color: colors.primaryForeground }]}>Salvar alterações</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
