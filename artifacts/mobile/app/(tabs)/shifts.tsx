import React, { useState, useMemo } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, toIsoDay } from "@/lib/format";
import type { Shift, ShiftRecurrenceType, ShiftTemplate } from "@/lib/types";
import { MONTHS, PRESETS_COLORS, WEEKDAYS_SHORT } from "@/components/shifts/constants";
import { ShiftRulesModal } from "@/components/shifts/ShiftRulesModal";
import { ShiftTemplatesModal } from "@/components/shifts/ShiftTemplatesModal";
import { ShiftsCalendar } from "@/components/shifts/ShiftsCalendar";
import { ShiftsDaySection } from "@/components/shifts/ShiftsDaySection";
import { styles } from "@/components/shifts/styles";

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
    return toIsoDay(selectedDate);
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
        color: formColor,
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
      color: template.color,
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

        <ShiftsCalendar
          currentMonth={currentMonth}
          daysInMonth={daysInMonth}
          selectedDateStr={selectedDateStr}
          shifts={shifts}
          onSelectDay={setSelectedDate}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
        />

        <ShiftsDaySection
          selectedDate={selectedDate}
          selectedDateStr={selectedDateStr}
          shiftsOfSelectedDay={shiftsOfSelectedDay}
          shiftTemplates={shiftTemplates}
          onOpenTemplates={() => setIsTemplatesModalOpen(true)}
          onOpenRules={() => setIsRulesModalOpen(true)}
          onAddSingle={() => {
            setFormMode("single");
            setIsNewModalOpen(true);
          }}
          onApplyTemplate={handleApplyTemplateToDate}
          onTogglePaid={handleTogglePaid}
          onDeleteShift={handleDeleteShift}
        />
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

      <ShiftRulesModal
        visible={isRulesModalOpen}
        shiftRules={shiftRules}
        onClose={() => setIsRulesModalOpen(false)}
        onDeleteRule={handleDeleteRule}
      />

      <ShiftTemplatesModal
        visible={isTemplatesModalOpen}
        shiftTemplates={shiftTemplates}
        onClose={() => setIsTemplatesModalOpen(false)}
        onNewTemplate={() => setIsNewTemplateModalOpen(true)}
        onDeleteTemplate={handleDeleteTemplate}
      />

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
