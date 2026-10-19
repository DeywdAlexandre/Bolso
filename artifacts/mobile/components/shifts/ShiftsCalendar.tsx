import React from "react";
import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import { toIsoDay } from "@/lib/format";
import type { Shift } from "@/lib/types";

import { MONTHS, WEEKDAYS_SHORT } from "./constants";
import { styles } from "./styles";

type Props = {
  currentMonth: Date;
  daysInMonth: (Date | null)[];
  selectedDateStr: string;
  shifts: Shift[];
  onSelectDay: (day: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  /** Volta para o mês e o dia de hoje; o botão só aparece quando há algo diferente de hoje na tela. */
  onToday?: () => void;
  showToday?: boolean;
};

export function ShiftsCalendar({ currentMonth, daysInMonth, selectedDateStr, shifts, onSelectDay, onPrevMonth, onNextMonth, onToday, showToday }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.calendarHeader}>
        <Pressable onPress={onPrevMonth} hitSlop={12} accessibilityLabel="Mês anterior">
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.calendarMonthTitle, { color: colors.foreground }]}>
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        <Pressable onPress={onNextMonth} hitSlop={12} accessibilityLabel="Próximo mês">
          <Feather name="chevron-right" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Dias da semana */}
      {showToday && onToday ? (
        <Pressable
          onPress={onToday}
          hitSlop={8}
          style={{ alignSelf: "center", paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.primary + "18" }}
        >
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Ir para hoje</Text>
        </Pressable>
      ) : null}

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

          const dateStr = toIsoDay(day);
          const isSelected = selectedDateStr === dateStr;
          const isToday = toIsoDay(new Date()) === dateStr;

          // Buscar escalas deste dia
          const dayShifts = shifts.filter(s => s.date === dateStr);
          const hasShifts = dayShifts.length > 0;

          // Coletar cores exclusivas (se não houver cor no shift, usar os fallbacks clássicos azul/verde)
          const uniqueColors = Array.from(
            new Set(
              dayShifts.map(s => s.color || (s.type === "ordinary" ? "#3b82f6" : "#10b981"))
            )
          );

          // Renderizar o círculo com preenchimento ou gradiente
          const renderDayBackground = () => {
            const borderStyle = isSelected
              ? { borderWidth: 2, borderColor: colors.primary }
              : {};

            if (hasShifts) {
              if (uniqueColors.length === 1) {
                return (
                  <View
                    style={[
                      styles.dayCircle,
                      { backgroundColor: uniqueColors[0] },
                      borderStyle,
                      isToday && !isSelected && { borderWidth: 1.5, borderColor: colors.primary },
                    ]}
                  >
                    {renderDayText(true)}
                  </View>
                );
              } else {
                const c1 = uniqueColors[0];
                const c2 = uniqueColors[1];
                const hardColors: [string, string, string, string] = [c1, c1, c2, c2];
                return (
                  <LinearGradient
                    colors={hardColors}
                    locations={[0, 0.5, 0.5, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.dayCircle,
                      borderStyle,
                      isToday && !isSelected && { borderWidth: 1.5, borderColor: colors.primary },
                    ]}
                  >
                    {renderDayText(true)}
                  </LinearGradient>
                );
              }
            }

            // Sem escalas
            return (
              <View
                style={[
                  styles.dayCircle,
                  isSelected && { backgroundColor: colors.primary },
                  isToday && !isSelected && { borderWidth: 1.5, borderColor: colors.primary },
                ]}
              >
                {renderDayText(isSelected)}
              </View>
            );
          };

          const renderDayText = (hasBg: boolean) => {
            return (
              <Text
                style={[
                  styles.dayText,
                  { color: hasBg ? "#ffffff" : colors.foreground },
                  isSelected && { color: hasBg ? "#ffffff" : colors.primaryForeground, fontFamily: "Inter_700Bold" },
                  isToday && !isSelected && { color: colors.primary, fontFamily: "Inter_700Bold" },
                ]}
              >
                {day.getDate()}
              </Text>
            );
          };

          return (
            <Pressable
              key={dateStr}
              onPress={() => onSelectDay(day)}
              accessibilityLabel={`${day.getDate()} de ${MONTHS[day.getMonth()]}${hasShifts ? `, ${dayShifts.length} ${dayShifts.length === 1 ? "plantão" : "plantões"}` : ""}`}
              accessibilityState={{ selected: isSelected }}
              style={styles.calendarCell}
            >
              {renderDayBackground()}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
