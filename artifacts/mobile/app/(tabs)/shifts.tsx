import React, { useState, useMemo } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, genId } from "@/lib/format";
import type { Shift, ShiftRecurrenceType, ShiftRule, ShiftTemplate } from "@/lib/types";

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const PRESETS_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"
];

export default function ShiftsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    shifts,
    shiftRules,
    shiftTemplates,
    addShift,
    removeShift,
    updateShift,
    addShiftRule,
    removeShiftRule,
    generateShiftsFromRule,
    addTransaction,
    removeTransaction,
    addShiftTemplate,
    removeShiftTemplate,
  } = useAppData();

  const topPad = Platform.OS === "web" ? 15 : insets.top;

  // Estados do Calendário
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Estados dos Modais
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);

  // Estados do Formulário de Plantão/Regra
  const [formMode, setFormMode] = useState<"single" | "recurrent">("single");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"ordinary" | "extra">("ordinary");
  const [formValue, setFormValue] = useState("");
  const [formRecurrenceType, setFormRecurrenceType] = useState<ShiftRecurrenceType>("rotative");
  const [formWorkHours, setFormWorkHours] = useState("12");
  const [formOffHours, setFormOffHours] = useState("36");
  const [formWeekDays, setFormWeekDays] = useState<number[]>([]);
  const [formStartTime, setFormStartTime] = useState("07:00");
  const [formEndTime, setFormEndTime] = useState("19:00");
  const [formColor, setFormColor] = useState(PRESETS_COLORS[0]);

  // Estados do Formulário de Modelo (Template)
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState<"ordinary" | "extra">("extra");
  const [templateValue, setTemplateValue] = useState("");
  const [templateStartTime, setTemplateStartTime] = useState("07:00");
  const [templateEndTime, setTemplateEndTime] = useState("19:00");
  const [templateColor, setTemplateColor] = useState(PRESETS_COLORS[0]);

  // Navegar calendário
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // Gerar dias do mês no calendário
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [currentMonth]);

  // Formatar data selecionada para YYYY-MM-DD
  const selectedDateStr = useMemo(() => {
    return selectedDate.toISOString().split("T")[0];
  }, [selectedDate]);

  // Filtros de Escalas
  const shiftsOfMonth = useMemo(() => {
    const monthPrefix = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
    return shifts.filter(s => s.date.startsWith(monthPrefix));
  }, [shifts, currentMonth]);

  const shiftsOfSelectedDay = useMemo(() => {
    return shifts.filter(s => s.date === selectedDateStr);
  }, [shifts, selectedDateStr]);

  // Estatísticas do mês
  const monthlyStats = useMemo(() => {
    let extraTotal = 0;
    let extraPaid = 0;
    let countOrdinary = 0;
    let countExtra = 0;

    shiftsOfMonth.forEach(s => {
      if (s.type === "ordinary") {
        countOrdinary++;
      } else {
        countExtra++;
        const val = s.value || 0;
        extraTotal += val;
        if (s.isPaid) extraPaid += val;
      }
    });

    return { extraTotal, extraPaid, countOrdinary, countExtra };
  }, [shiftsOfMonth]);

  // Salvar nova Escala / Regra
  const handleSaveShift = async () => {
    if (!formName.trim()) {
      Alert.alert("Erro", "Por favor, digite o nome do serviço.");
      return;
    }

    const valueNum = formType === "extra" ? parseFloat(formValue) || 0 : undefined;

    if (formMode === "single") {
      // Plantão avulso
      await addShift({
        name: formName,
        type: formType,
        value: valueNum,
        date: selectedDateStr,
        startTime: formStartTime,
        endTime: formEndTime,
        isPaid: false,
      });
      Alert.alert("Sucesso", "Plantão avulso adicionado.");
    } else {
      // Escala Recorrente
      const rule = await addShiftRule({
        name: formName,
        type: formType,
        value: valueNum,
        recurrenceType: formRecurrenceType,
        workHours: formRecurrenceType === "rotative" ? parseFloat(formWorkHours) || 12 : undefined,
        offHours: formRecurrenceType === "rotative" ? parseFloat(formOffHours) || 36 : undefined,
        startDate: selectedDateStr,
        weekDays: formRecurrenceType === "weekly" ? formWeekDays : undefined,
        startTime: formStartTime,
        endTime: formEndTime,
        color: formColor,
      });

      // Gera os plantões automaticamente para os próximos 3 meses
      await generateShiftsFromRule(rule.id, 3);
      Alert.alert("Sucesso", "Escala recorrente criada e plantões futuros gerados.");
    }

    // Reset formulário
    setFormName("");
    setFormValue("");
    setIsNewModalOpen(false);
  };

  // Toggle marcar como Pago/Recebido (para plantão extra)
  const handleTogglePaid = async (shift: Shift) => {
    if (shift.type !== "extra") return;

    if (shift.isPaid) {
      // Se estava pago, desmarca e remove a transação vinculada
      if (shift.transactionId) {
        await removeTransaction(shift.transactionId);
      }
      await updateShift(shift.id, { isPaid: false, transactionId: undefined });
    } else {
      // Se não estava pago, cria a transação de receita no extrato principal
      const value = shift.value || 0;
      const tx = await addTransaction({
        type: "income",
        amount: value,
        categoryId: "cat_salary", // Classifica como Salário/Remuneração
        description: `Escala Extra: ${shift.name}`,
        date: shift.date + "T12:00:00.000Z",
      });
      await updateShift(shift.id, { isPaid: true, transactionId: tx.id });
      Alert.alert("Recebimento Confirmado", "Uma transação de receita foi adicionada ao seu extrato principal.");
    }
  };

  const handleDeleteShift = (id: string) => {
    const performDelete = async () => {
      const target = shifts.find(s => s.id === id);
      if (target?.transactionId) {
        await removeTransaction(target.transactionId);
      }
      await removeShift(id);
    };

    if (Platform.OS === "web") {
      const confirm = window.confirm("Deseja realmente remover este plantão da sua agenda?");
      if (confirm) {
        void performDelete();
      }
    } else {
      Alert.alert("Excluir Plantão", "Deseja realmente remover este plantão da sua agenda?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: performDelete,
        }
      ]);
    }
  };

  const handleDeleteRule = (id: string) => {
    const performDelete = async () => {
      await removeShiftRule(id);
      if (Platform.OS === "web") {
        window.alert("Escala recorrente removida.");
      } else {
        Alert.alert("Sucesso", "Escala recorrente removida.");
      }
    };

    if (Platform.OS === "web") {
      const confirm = window.confirm("Ao excluir esta escala recorrente, todos os plantões futuros gerados por ela e não pagos também serão removidos. Confirmar?");
      if (confirm) {
        void performDelete();
      }
    } else {
      Alert.alert("Excluir Regra", "Ao excluir esta escala recorrente, todos os plantões futuros gerados por ela e não pagos também serão removidos. Confirmar?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: performDelete,
        }
      ]);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert("Erro", "Por favor, digite o nome do modelo.");
      return;
    }

    const valueNum = templateType === "extra" ? parseFloat(templateValue) || 0 : undefined;

    await addShiftTemplate({
      name: templateName.trim(),
      type: templateType,
      value: valueNum,
      startTime: templateStartTime,
      endTime: templateEndTime,
      color: templateColor,
    });

    setTemplateName("");
    setTemplateValue("");
    Alert.alert("Sucesso", "Modelo de plantão cadastrado.");
    setIsNewTemplateModalOpen(false);
  };

  const handleApplyTemplateToDate = async (template: ShiftTemplate, dateStr: string) => {
    await addShift({
      name: template.name,
      type: template.type,
      value: template.value,
      date: dateStr,
      startTime: template.startTime,
      endTime: template.endTime,
      isPaid: false,
    });
    const d = new Date(dateStr + "T12:00:00.000Z");
    Alert.alert("Sucesso", `Plantão "${template.name}" adicionado em ${d.getDate()} de ${MONTHS[d.getMonth()]}.`);
  };

  const handleDeleteTemplate = (id: string) => {
    const performDelete = async () => {
      await removeShiftTemplate(id);
    };

    if (Platform.OS === "web") {
      const confirm = window.confirm("Deseja realmente remover este modelo de plantão?");
      if (confirm) {
        void performDelete();
      }
    } else {
      Alert.alert("Excluir Modelo", "Deseja realmente remover este modelo de plantão?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: performDelete,
        }
      ]);
    }
  };

  const toggleWeekDay = (day: number) => {
    if (formWeekDays.includes(day)) {
      setFormWeekDays(formWeekDays.filter(d => d !== day));
    } else {
      setFormWeekDays([...formWeekDays, day]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Background */}
      <View style={[styles.headerBackground, { backgroundColor: colors.primary, height: topPad + 140 }]} />

      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={[styles.subtitle, { color: colors.primaryForeground + "cc" }]}>Minhas Escalas</Text>
          <Text style={[styles.title, { color: colors.primaryForeground }]}>Agenda de Serviços</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={[styles.badgeLabel, { color: colors.primaryForeground + "aa" }]}>Extras (Mês)</Text>
          <Text style={[styles.badgeValue, { color: colors.primaryForeground }]}>
            {formatCurrency(monthlyStats.extraTotal)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Bloco de Faturamento */}
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{monthlyStats.countOrdinary + monthlyStats.countExtra}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Plantões</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: colors.income }]}>{formatCurrency(monthlyStats.extraPaid)}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Recebidos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: colors.expense }]}>{formatCurrency(monthlyStats.extraTotal - monthlyStats.extraPaid)}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>A receber</Text>
          </View>
        </View>

        {/* Calendário */}
        <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.calendarHeader}>
            <Pressable onPress={prevMonth} hitSlop={12}>
              <Feather name="chevron-left" size={20} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.calendarMonthTitle, { color: colors.foreground }]}>
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <Pressable onPress={nextMonth} hitSlop={12}>
              <Feather name="chevron-right" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {/* Dias da semana */}
          <View style={styles.calendarWeekdays}>
            {WEEKDAYS_SHORT.map((w, idx) => (
              <Text key={idx} style={[styles.weekdayText, { color: colors.mutedForeground }]}>
                {w}
              </Text>
            ))}
          </View>

          {/* Grid de Dias */}
          <View style={styles.calendarGrid}>
            {daysInMonth.map((day, idx) => {
              if (day === null) {
                return <View key={`empty-${idx}`} style={styles.calendarCell} />;
              }

              const dateStr = day.toISOString().split("T")[0];
              const isSelected = selectedDateStr === dateStr;
              const isToday = new Date().toISOString().split("T")[0] === dateStr;

              // Buscar escalas deste dia
              const dayShifts = shifts.filter(s => s.date === dateStr);
              const hasOrdinary = dayShifts.some(s => s.type === "ordinary");
              const hasExtra = dayShifts.some(s => s.type === "extra");

              return (
                <Pressable
                  key={dateStr}
                  onPress={() => setSelectedDate(day)}
                  style={[
                    styles.calendarCell,
                    isSelected && { backgroundColor: colors.primary },
                    isToday && !isSelected && { borderWidth: 1.5, borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: colors.foreground },
                      isSelected && { color: colors.primaryForeground, fontFamily: "Inter_700Bold" },
                      isToday && !isSelected && { color: colors.primary, fontFamily: "Inter_700Bold" },
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                  
                  {/* Indicadores de Escala */}
                  <View style={styles.indicatorsRow}>
                    {hasOrdinary && (
                      <View style={[styles.dot, { backgroundColor: isSelected ? colors.primaryForeground : "#3b82f6" }]} />
                    )}
                    {hasExtra && (
                      <View style={[styles.dot, { backgroundColor: isSelected ? colors.primaryForeground : "#10b981" }]} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Escalas do dia selecionado */}
        <View style={styles.daySection}>
          <View style={styles.daySectionHeader}>
            <Text style={[styles.daySectionTitle, { color: colors.foreground }]}>
              {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => setIsTemplatesModalOpen(true)}
                style={({ pressed }) => [styles.rulesBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="list" size={14} color={colors.primary} />
                <Text style={[styles.rulesBtnText, { color: colors.primary }]}>Modelos</Text>
              </Pressable>
              <Pressable
                onPress={() => setIsRulesModalOpen(true)}
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
                  onPress={() => {
                    setFormMode("single");
                    setIsNewModalOpen(true);
                  }}
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
                        onPress={() => handleApplyTemplateToDate(temp, selectedDateStr)}
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
                        <Feather name="clock" size={12} /> {s.startTime} às {s.endTime}
                      </Text>
                      {isExtra && (
                        <Text style={[styles.shiftValue, { color: colors.income }]}>
                          {formatCurrency(s.value || 0)}
                        </Text>
                      )}
                    </View>

                    {isExtra && (
                      <Pressable
                        onPress={() => handleTogglePaid(s)}
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

                    <Pressable onPress={() => handleDeleteShift(s.id)} hitSlop={12} style={styles.deleteShiftBtn}>
                      <Feather name="trash-2" size={16} color={colors.destructive} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB de adicionar */}
      <Pressable
        onPress={() => setIsNewModalOpen(true)}
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 12 }]}
      >
        <Feather name="plus" size={24} color={colors.primaryForeground} />
      </Pressable>

      {/* MODAL: NOVA ESCALA OU PLANTÃO */}
      <Modal visible={isNewModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Adicionar Serviço</Text>
              <Pressable onPress={() => setIsNewModalOpen(false)} hitSlop={12}>
                <Feather name="x" size={24} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {/* Seletor de Modo: Avulso ou Recorrente */}
              <View style={[styles.toggleGroup, { backgroundColor: colors.muted }]}>
                <Pressable
                  onPress={() => setFormMode("single")}
                  style={[styles.toggleBtn, formMode === "single" && { backgroundColor: colors.card }]}
                >
                  <Text style={[styles.toggleText, { color: colors.foreground }]}>Avulso (Hoje)</Text>
                </Pressable>
                <Pressable
                  onPress={() => setFormMode("recurrent")}
                  style={[styles.toggleBtn, formMode === "recurrent" && { backgroundColor: colors.card }]}
                >
                  <Text style={[styles.toggleText, { color: colors.foreground }]}>Escala Recorrente</Text>
                </Pressable>
              </View>

              {/* Preencher com Modelo se disponível */}
              {shiftTemplates.length > 0 && (
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Preencher com Modelo</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {shiftTemplates.map((temp) => (
                      <Pressable
                        key={temp.id}
                        onPress={() => {
                          setFormName(temp.name);
                          setFormType(temp.type);
                          setFormValue(temp.value ? temp.value.toString() : "");
                          setFormStartTime(temp.startTime);
                          setFormEndTime(temp.endTime);
                          if (temp.color) setFormColor(temp.color);
                        }}
                        style={({ pressed }) => [
                          styles.templatePill,
                          {
                            backgroundColor: colors.card,
                            borderColor: temp.color || colors.primary,
                            borderWidth: 1,
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        <View style={[styles.templatePillDot, { backgroundColor: temp.color || colors.primary }]} />
                        <Text style={[styles.templatePillText, { color: colors.foreground }]}>{temp.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Nome */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Nome do Plantão/Serviço</Text>
                <TextInput
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="Ex: Plantão Hospital, Escala Hangar"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                />
              </View>

              {/* Tipo: Ordinário ou Extra */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Tipo do Serviço</Text>
                <View style={[styles.toggleGroup, { backgroundColor: colors.muted }]}>
                  <Pressable
                    onPress={() => setFormType("ordinary")}
                    style={[styles.toggleBtn, formType === "ordinary" && { backgroundColor: colors.card }]}
                  >
                    <Text style={[styles.toggleText, { color: colors.foreground }]}>Ordinário (Fixo)</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setFormType("extra")}
                    style={[styles.toggleBtn, formType === "extra" && { backgroundColor: colors.card }]}
                  >
                    <Text style={[styles.toggleText, { color: colors.foreground }]}>Extra (Remunerado)</Text>
                  </Pressable>
                </View>
              </View>

              {/* Valor (Se Extra) */}
              {formType === "extra" && (
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Valor por Plantão (R$)</Text>
                  <TextInput
                    value={formValue}
                    onChangeText={setFormValue}
                    placeholder="0,00"
                    keyboardType="numeric"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                  />
                </View>
              )}

              {/* Horário */}
              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Início</Text>
                  <TextInput
                    value={formStartTime}
                    onChangeText={setFormStartTime}
                    placeholder="07:00"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                  />
                </View>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Fim</Text>
                  <TextInput
                    value={formEndTime}
                    onChangeText={setFormEndTime}
                    placeholder="19:00"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                  />
                </View>
              </View>

              {/* Configurações de Recorrência (Se modo recurrent) */}
              {formMode === "recurrent" && (
                <View style={{ gap: 20 }}>
                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Tipo de Recorrência</Text>
                    <View style={[styles.toggleGroup, { backgroundColor: colors.muted }]}>
                      <Pressable
                        onPress={() => setFormRecurrenceType("rotative")}
                        style={[styles.toggleBtn, formRecurrenceType === "rotative" && { backgroundColor: colors.card }]}
                      >
                        <Text style={[styles.toggleText, { color: colors.foreground }]}>Ciclo (ex: 12x36)</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setFormRecurrenceType("weekly")}
                        style={[styles.toggleBtn, formRecurrenceType === "weekly" && { backgroundColor: colors.card }]}
                      >
                        <Text style={[styles.toggleText, { color: colors.foreground }]}>Semanal Fixa</Text>
                      </Pressable>
                    </View>
                  </View>

                  {formRecurrenceType === "rotative" ? (
                    <View style={styles.row}>
                      <View style={[styles.inputContainer, { flex: 1 }]}>
                        <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Horas Trabalhadas</Text>
                        <TextInput
                          value={formWorkHours}
                          onChangeText={setFormWorkHours}
                          keyboardType="numeric"
                          style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                        />
                      </View>
                      <View style={[styles.inputContainer, { flex: 1 }]}>
                        <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Horas de Folga</Text>
                        <TextInput
                          value={formOffHours}
                          onChangeText={setFormOffHours}
                          keyboardType="numeric"
                          style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.inputContainer}>
                      <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Dias da Semana</Text>
                      <View style={styles.weekDaysGrid}>
                        {WEEKDAYS_SHORT.map((day, idx) => {
                          const selected = formWeekDays.includes(idx);
                          return (
                            <Pressable
                              key={idx}
                              onPress={() => toggleWeekDay(idx)}
                              style={[
                                styles.weekDayBubble,
                                { borderColor: colors.border },
                                selected && { backgroundColor: colors.primary, borderColor: colors.primary }
                              ]}
                            >
                              <Text style={[styles.weekDayBubbleText, { color: colors.foreground }, selected && { color: colors.primaryForeground }]}>
                                {day}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Cores Preset */}
                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Cor de Destaque</Text>
                    <View style={styles.colorPalette}>
                      {PRESETS_COLORS.map((c) => (
                        <Pressable
                          key={c}
                          onPress={() => setFormColor(c)}
                          style={[
                            styles.colorBubble,
                            { backgroundColor: c },
                            formColor === c && { borderWidth: 2, borderColor: colors.foreground }
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              )}

              <Pressable
                onPress={handleSaveShift}
                style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={[styles.saveText, { color: colors.primaryForeground }]}>Salvar Escala</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: LISTAGEM DE REGRAS RECORRENTES */}
      <Modal visible={isRulesModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, maxHeight: "80%" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Minhas Escalas Recorrentes</Text>
              <Pressable onPress={() => setIsRulesModalOpen(false)} hitSlop={12}>
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
                      <Pressable onPress={() => handleDeleteRule(item.id)} hitSlop={12}>
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

      {/* MODAL: LISTAGEM DE MODELOS DE PLANTÃO (TIPOS DE SERVIÇO) */}
      <Modal visible={isTemplatesModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, maxHeight: "80%" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Modelos de Plantão</Text>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <Pressable
                  onPress={() => setIsNewTemplateModalOpen(true)}
                  style={[styles.addTemplateHeaderBtn, { backgroundColor: colors.primary + "15" }]}
                >
                  <Feather name="plus" size={14} color={colors.primary} />
                  <Text style={[styles.addTemplateHeaderBtnText, { color: colors.primary }]}>Novo</Text>
                </Pressable>
                <Pressable onPress={() => setIsTemplatesModalOpen(false)} hitSlop={12}>
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
                    <Pressable onPress={() => handleDeleteTemplate(item.id)} hitSlop={12}>
                      <Feather name="trash-2" size={18} color={colors.destructive} />
                    </Pressable>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL: CADASTRO DE NOVO MODELO (TEMPLATE) */}
      <Modal visible={isNewTemplateModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Criar Novo Modelo</Text>
              <Pressable onPress={() => setIsNewTemplateModalOpen(false)} hitSlop={12}>
                <Feather name="x" size={24} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {/* Nome do modelo */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Nome do Modelo</Text>
                <TextInput
                  value={templateName}
                  onChangeText={setTemplateName}
                  placeholder="Ex: GT EXTRA 11 AS 23H"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                />
              </View>

              {/* Tipo do Serviço */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Tipo do Serviço</Text>
                <View style={[styles.toggleGroup, { backgroundColor: colors.muted }]}>
                  <Pressable
                    onPress={() => setTemplateType("ordinary")}
                    style={[styles.toggleBtn, templateType === "ordinary" && { backgroundColor: colors.card }]}
                  >
                    <Text style={[styles.toggleText, { color: colors.foreground }]}>Ordinário (Fixo)</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setTemplateType("extra")}
                    style={[styles.toggleBtn, templateType === "extra" && { backgroundColor: colors.card }]}
                  >
                    <Text style={[styles.toggleText, { color: colors.foreground }]}>Extra (Remunerado)</Text>
                  </Pressable>
                </View>
              </View>

              {/* Valor (Se Extra) */}
              {templateType === "extra" && (
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Valor (R$)</Text>
                  <TextInput
                    value={templateValue}
                    onChangeText={setTemplateValue}
                    placeholder="0,00"
                    keyboardType="numeric"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                  />
                </View>
              )}

              {/* Horário */}
              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Início</Text>
                  <TextInput
                    value={templateStartTime}
                    onChangeText={setTemplateStartTime}
                    placeholder="07:00"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                  />
                </View>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Fim</Text>
                  <TextInput
                    value={templateEndTime}
                    onChangeText={setTemplateEndTime}
                    placeholder="19:00"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                  />
                </View>
              </View>

              {/* Cores Preset */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Cor de Destaque</Text>
                <View style={styles.colorPalette}>
                  {PRESETS_COLORS.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setTemplateColor(c)}
                      style={[
                        styles.colorBubble,
                        { backgroundColor: c },
                        templateColor === c && { borderWidth: 2, borderColor: colors.foreground }
                      ]}
                    />
                  ))}
                </View>
              </View>

              <Pressable
                onPress={handleSaveTemplate}
                style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={[styles.saveText, { color: colors.primaryForeground }]}>Salvar Modelo</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 2 },
  headerBadge: { alignItems: "flex-end" },
  badgeLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  badgeValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statsCard: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statBox: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  statDivider: { width: 1.5, height: 30, backgroundColor: "#e2e8f0" },
  calendarCard: {
    margin: 20,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  calendarMonthTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  calendarWeekdays: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 4,
  },
  weekdayText: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 40, textAlign: "center" },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 2,
  },
  dayText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  indicatorsRow: { flexDirection: "row", gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  daySection: { paddingHorizontal: 20, gap: 12 },
  daySectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  daySectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  rulesBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 4 },
  rulesBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyCard: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  emptyText: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center", lineHeight: 18 },
  addSingleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  addSingleBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  shiftsList: { gap: 10 },
  shiftRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  shiftTypeIndicator: { width: 6, height: "100%", borderRadius: 3 },
  shiftDetails: { flex: 1, gap: 3 },
  shiftName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  shiftTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  shiftValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  paidBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  paidBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  deleteShiftBtn: { padding: 6 },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  toggleGroup: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  inputContainer: { gap: 6 },
  inputLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  row: { flexDirection: "row", gap: 16 },
  weekDaysGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  weekDayBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  weekDayBubbleText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  colorPalette: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  colorBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  saveText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  ruleColorDot: { width: 12, height: 12, borderRadius: 6 },
  ruleName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  ruleMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  ruleValue: { fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 2 },
  templatePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  templatePillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  templatePillText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  quickTemplatesBox: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
  },
  quickTemplatesTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
  },
  quickTemplateItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    minWidth: 140,
  },
  quickTemplateDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  quickTemplateName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  quickTemplateTime: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  addTemplateHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  addTemplateHeaderBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
});
