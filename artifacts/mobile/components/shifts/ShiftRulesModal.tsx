import React from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/format";
import type { ShiftRule } from "@/lib/types";

import { styles } from "./styles";

type Props = {
  visible: boolean;
  shiftRules: ShiftRule[];
  onClose: () => void;
  onDeleteRule: (id: string) => void;
};

export function ShiftRulesModal({ visible, shiftRules, onClose, onDeleteRule }: Props) {
  const colors = useColors();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBg}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, maxHeight: "80%" }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Minhas Escalas Recorrentes</Text>
            <Pressable onPress={() => onClose()} hitSlop={12}>
              <Feather name="x" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          {shiftRules.length === 0 ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Feather name="sliders" size={32} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Nenhuma escala recorrente criada. Crie uma escala ao adicionar um serviço selecionando a aba "Escala Recorrente".
              </Text>
            </View>
          ) : (
            <FlatList
              data={shiftRules}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
              renderItem={({ item }) => {
                const isRotative = item.recurrenceType === "rotative";
                return (
                  <View style={[styles.ruleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.ruleColorDot, { backgroundColor: item.color || colors.primary }]} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.ruleName, { color: colors.foreground }]}>{item.name}</Text>
                      <Text style={[styles.ruleMeta, { color: colors.mutedForeground }]}>
                        {isRotative
                          ? `Rotativo: ${item.workHours}h por ${item.offHours}h`
                          : "Semanal Fixa"}
                        {" · "}
                        {item.startTime} às {item.endTime}
                      </Text>
                      {item.type === "extra" && (
                        <Text style={[styles.ruleValue, { color: colors.income }]}>
                          {formatCurrency(item.value || 0)} / plantão
                        </Text>
                      )}
                    </View>
                    <Pressable onPress={() => onDeleteRule(item.id)} hitSlop={12}>
                      <Feather name="trash-2" size={18} color={colors.destructive} />
                    </Pressable>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
