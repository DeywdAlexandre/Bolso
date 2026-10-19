import React from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/format";
import type { ShiftTemplate } from "@/lib/types";

import { styles } from "./styles";

type Props = {
  visible: boolean;
  shiftTemplates: ShiftTemplate[];
  onClose: () => void;
  onNewTemplate: () => void;
  onDeleteTemplate: (id: string) => void;
};

export function ShiftTemplatesModal({ visible, shiftTemplates, onClose, onNewTemplate, onDeleteTemplate }: Props) {
  const colors = useColors();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBg}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, maxHeight: "80%" }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Modelos de Plantão</Text>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <Pressable
                onPress={() => onNewTemplate()}
                style={[styles.addTemplateHeaderBtn, { backgroundColor: colors.primary + "15" }]}
              >
                <Feather name="plus" size={14} color={colors.primary} />
                <Text style={[styles.addTemplateHeaderBtnText, { color: colors.primary }]}>Novo</Text>
              </Pressable>
              <Pressable onPress={() => onClose()} hitSlop={12}>
                <Feather name="x" size={24} color={colors.foreground} />
              </Pressable>
            </View>
          </View>

          {shiftTemplates.length === 0 ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Feather name="list" size={32} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Nenhum modelo cadastrado. Crie modelos de plantões extras ou fixos para acoplar facilmente em qualquer dia.
              </Text>
            </View>
          ) : (
            <FlatList
              data={shiftTemplates}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
              renderItem={({ item }) => (
                <View style={[styles.ruleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.ruleColorDot, { backgroundColor: item.color || colors.primary }]} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.ruleName, { color: colors.foreground }]}>{item.name}</Text>
                    <Text style={[styles.ruleMeta, { color: colors.mutedForeground }]}>
                      {item.type === "extra" ? "Extra (Remunerado)" : "Ordinário (Fixo)"}
                      {" · "}
                      {item.startTime} às {item.endTime}
                    </Text>
                    {item.type === "extra" && (
                      <Text style={[styles.ruleValue, { color: colors.income }]}>
                        {formatCurrency(item.value || 0)}
                      </Text>
                    )}
                  </View>
                  <Pressable onPress={() => onDeleteTemplate(item.id)} hitSlop={12} accessibilityLabel={`Excluir modelo ${item.name}`}>
                    <Feather name="trash-2" size={18} color={colors.destructive} />
                  </Pressable>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
