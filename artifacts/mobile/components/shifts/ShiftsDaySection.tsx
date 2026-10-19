import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/format";
import { formatHours, shiftHours } from "@/lib/shifts";
import type { Shift, ShiftTemplate } from "@/lib/types";

import { MONTHS } from "./constants";
import { styles } from "./styles";

type Props = {
  selectedDate: Date;
  selectedDateStr: string;
  shiftsOfSelectedDay: Shift[];
  shiftTemplates: ShiftTemplate[];
  onOpenTemplates: () => void;
  onOpenRules: () => void;
  onAddSingle: () => void;
  onApplyTemplate: (template: ShiftTemplate, dateStr: string) => void;
  onTogglePaid: (shift: Shift) => void;
  onDeleteShift: (id: string) => void;
  onEditShift: (shift: Shift) => void;
};

export function ShiftsDaySection({ selectedDate, selectedDateStr, shiftsOfSelectedDay, shiftTemplates, onOpenTemplates, onOpenRules, onAddSingle, onApplyTemplate, onTogglePaid, onDeleteShift, onEditShift }: Props) {
  const colors = useColors();

  return (
    <View style={styles.daySection}>
      <View style={styles.daySectionHeader}>
        <Text style={[styles.daySectionTitle, { color: colors.foreground }]}>
          {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable
            onPress={() => onOpenTemplates()}
            style={({ pressed }) => [styles.rulesBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="list" size={14} color={colors.primary} />
            <Text style={[styles.rulesBtnText, { color: colors.primary }]}>Modelos</Text>
          </Pressable>
          <Pressable
            onPress={() => onOpenRules()}
            style={({ pressed }) => [styles.rulesBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="settings" size={14} color={colors.primary} />
            <Text style={[styles.rulesBtnText, { color: colors.primary }]}>Minhas Regras</Text>
          </Pressable>
        </View>
      </View>

      {shiftsOfSelectedDay.length === 0 ? (
        <View style={{ gap: 12 }}>
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="calendar" size={24} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Nenhum plantão ou serviço para este dia.
            </Text>
            <Pressable
              onPress={onAddSingle}
              style={[styles.addSingleBtn, { backgroundColor: colors.primary + "15" }]}
            >
              <Feather name="plus" size={14} color={colors.primary} />
              <Text style={[styles.addSingleBtnText, { color: colors.primary }]}>Adicionar Plantão</Text>
            </Pressable>
          </View>

          {shiftTemplates.length > 0 && (
            <View style={[styles.quickTemplatesBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.quickTemplatesTitle, { color: colors.mutedForeground }]}>
                Acoplar Modelo Rápido:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {shiftTemplates.map((temp) => (
                  <Pressable
                    key={temp.id}
                    onPress={() => onApplyTemplate(temp, selectedDateStr)}
                    style={({ pressed }) => [
                      styles.quickTemplateItem,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.quickTemplateDot, { backgroundColor: temp.color || colors.primary }]} />
                    <View>
                      <Text style={[styles.quickTemplateName, { color: colors.foreground }]} numberOfLines={1}>
                        {temp.name}
                      </Text>
                      <Text style={[styles.quickTemplateTime, { color: colors.mutedForeground }]}>
                        {temp.startTime} - {temp.endTime}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.shiftsList}>
          {shiftsOfSelectedDay.map((s) => {
            const isExtra = s.type === "extra";
            return (
              <View
                key={s.id}
                style={[styles.shiftRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.shiftTypeIndicator, { backgroundColor: isExtra ? "#10b981" : "#3b82f6" }]} />
                <View style={styles.shiftDetails}>
                  <Text style={[styles.shiftName, { color: colors.foreground }]}>{s.name}</Text>
                  <Text style={[styles.shiftTime, { color: colors.mutedForeground }]}>
                    <Feather name="clock" size={12} /> {s.startTime} às {s.endTime} · {formatHours(shiftHours(s.startTime, s.endTime))}
                  </Text>
                  {isExtra && (
                    <Text style={[styles.shiftValue, { color: colors.income }]}>
                      {formatCurrency(s.value || 0)}
                    </Text>
                  )}
                </View>

                {isExtra && (
                  <Pressable
                    onPress={() => onTogglePaid(s)}
                    style={[
                      styles.paidBadge,
                      {
                        backgroundColor: s.isPaid ? colors.income + "20" : colors.muted,
                        borderColor: s.isPaid ? colors.income : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.paidBadgeText, { color: s.isPaid ? colors.income : colors.mutedForeground }]}>
                      {s.isPaid ? "Recebido" : "Confirmar"}
                    </Text>
                  </Pressable>
                )}

                <Pressable onPress={() => onEditShift(s)} hitSlop={12} style={styles.deleteShiftBtn} accessibilityLabel={`Editar ${s.name}`}>
                  <Feather name="edit-2" size={16} color={colors.mutedForeground} />
                </Pressable>

                <Pressable onPress={() => onDeleteShift(s.id)} hitSlop={12} style={styles.deleteShiftBtn} accessibilityLabel={`Excluir ${s.name}`}>
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
