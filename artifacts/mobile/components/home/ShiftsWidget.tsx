import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatDate, fromIsoDay, toIsoDay } from "@/lib/format";
import { nextShift as nextShiftFrom } from "@/lib/shifts";
import type { Shift, ShiftRule } from "@/lib/types";

interface ShiftsWidgetProps {
  shifts: Shift[];
  shiftRules: ShiftRule[];
  showValue: boolean;
}

const WEEKDAYS_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS_LABEL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function ShiftsWidget({ shifts, shiftRules, showValue }: ShiftsWidgetProps) {
  const colors = useColors();

  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();
  const todayStr = toIsoDay(now); // YYYY-MM-DD

  // 1. Gerar dias do mês atual para o mini calendário
  const daysInMonth = React.useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonthIdx, 1).getDay();
    const totalDays = new Date(currentYear, currentMonthIdx + 1, 0).getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(currentYear, currentMonthIdx, d));
    }
    return days;
  }, [currentYear, currentMonthIdx]);

  // 2. Achar o próximo plantão
  // Hoje só vale se o plantão ainda não terminou (um de 07h às 19h some do "próximo" às 20h).
  const nextShift = nextShiftFrom(shifts, now);

  // 3. Calcular ganhos extras do mês atual
  const [currYearNum, currMonthNum] = todayStr.split("-").map(Number);

  const extraShiftsThisMonth = shifts.filter((s) => {
    if (s.type !== "extra") return false;
    const [y, m] = s.date.split("-").map(Number);
    return y === currYearNum && m === currMonthNum;
  });

  const totalReceived = extraShiftsThisMonth
    .filter((s) => s.isPaid)
    .reduce((sum, s) => sum + (s.value || 0), 0);

  const totalToReceive = extraShiftsThisMonth
    .filter((s) => !s.isPaid)
    .reduce((sum, s) => sum + (s.value || 0), 0);

  // Função para formatar o dia do plantão em formato legível (Ex: "Hoje", "Amanhã", ou "20 Mai")
  const formatShiftDate = (dateStr: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sDate = fromIsoDay(dateStr);
      sDate.setHours(0, 0, 0, 0);

      const diffTime = sDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Hoje";
      if (diffDays === 1) return "Amanhã";

      const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      return `${sDate.getDate()} ${months[sDate.getMonth()]}`;
    } catch {
      return formatDate(dateStr);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={[styles.iconBox, { backgroundColor: colors.primary + "12" }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Escalas & Plantões</Text>
        </View>
        <Pressable
          onPress={() => router.push("/shifts")}
          style={({ pressed }) => [
            styles.linkBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.linkText, { color: colors.primary }]}>Ver mais</Text>
          <Feather name="chevron-right" size={14} color={colors.primary} />
        </Pressable>
      </View>

      {/* Mini Calendário */}
      <View style={styles.calendarSection}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Agenda • {MONTHS_LABEL[currentMonthIdx]}
        </Text>
        
        {/* Dias da semana */}
        <View style={styles.calendarWeekdays}>
          {WEEKDAYS_SHORT.map((w, idx) => (
            <Text key={idx} style={[styles.weekdayText, { color: colors.mutedForeground }]}>
              {w}
            </Text>
          ))}
        </View>

        {/* Grade de Dias */}
        <View style={styles.calendarGrid}>
          {daysInMonth.map((day, idx) => {
            if (day === null) {
              return <View key={`empty-${idx}`} style={styles.calendarCell} />;
            }

            const dateStr = toIsoDay(day);
            const isToday = todayStr === dateStr;

            // Filtrar plantões deste dia específico
            const dayShifts = shifts.filter((s) => s.date === dateStr);
            const hasShifts = dayShifts.length > 0;

            // Coletar cores exclusivas
            const uniqueColors = Array.from(
              new Set(
                dayShifts.map((s) => s.color || (s.type === "ordinary" ? "#3b82f6" : "#10b981"))
              )
            );

            const renderCircle = () => {
              const todayStyle = isToday && !hasShifts
                ? { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primary + "15" }
                : {};
              const borderStyle = isToday && hasShifts
                ? { borderWidth: 1.5, borderColor: colors.primary }
                : {};

              if (hasShifts) {
                if (uniqueColors.length === 1) {
                  return (
                    <View style={[styles.dayCircle, { backgroundColor: uniqueColors[0] }, borderStyle]}>
                      <Text style={[styles.dayText, { color: "#ffffff", fontFamily: isToday ? "Inter_700Bold" : "Inter_500Medium" }]}>
                        {day.getDate()}
                      </Text>
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
                      style={[styles.dayCircle, borderStyle]}
                    >
                      <Text style={[styles.dayText, { color: "#ffffff", fontFamily: isToday ? "Inter_700Bold" : "Inter_500Medium" }]}>
                        {day.getDate()}
                      </Text>
                    </LinearGradient>
                  );
                }
              }

              return (
                <View style={[styles.dayCircle, todayStyle]}>
                  <Text
                    style={[
                      styles.dayText,
                      { color: isToday ? colors.primary : colors.foreground },
                      isToday && { fontFamily: "Inter_700Bold" },
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </View>
              );
            };

            return (
              <View key={dateStr} style={styles.calendarCell}>
                {renderCircle()}
              </View>
            );
          })}
        </View>
      </View>

      {/* Próximo Plantão */}
      <View style={[styles.nextShiftSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }]}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Próximo Plantão
        </Text>
        {nextShift ? (
          <View style={[styles.nextShiftRow, { backgroundColor: colors.muted + "20", borderColor: colors.border }]}>
            <View style={styles.shiftDateBox}>
              <Text style={[styles.shiftDateText, { color: colors.primary }]}>
                {formatShiftDate(nextShift.date)}
              </Text>
            </View>
            <View style={styles.shiftInfo}>
              <Text style={[styles.shiftName, { color: colors.foreground }]} numberOfLines={1}>
                {nextShift.name}
              </Text>
              <Text style={[styles.shiftTime, { color: colors.mutedForeground }]}>
                {nextShift.startTime} – {nextShift.endTime}
              </Text>
            </View>
            {nextShift.type === "extra" && (
              <View style={[styles.badge, { backgroundColor: colors.income + "15" }]}>
                <Text style={[styles.badgeText, { color: colors.income }]}>Extra</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Nenhum plantão agendado na escala.
          </Text>
        )}
      </View>

      {/* Ganhos acumulados com extras no mês */}
      <View style={[styles.earnedSection, { borderTopColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Plantões Extras no Mês
        </Text>
        <View style={styles.earnedRow}>
          <View style={styles.earnedBox}>
            <Text style={[styles.earnedLabel, { color: colors.mutedForeground }]}>Recebido</Text>
            <Text style={[styles.earnedValue, { color: colors.income }]}>
              {showValue ? formatCurrency(totalReceived) : "••••••"}
            </Text>
          </View>
          <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
          <View style={styles.earnedBox}>
            <Text style={[styles.earnedLabel, { color: colors.mutedForeground }]}>A Receber</Text>
            <Text style={[styles.earnedValue, { color: colors.foreground }]}>
              {showValue ? formatCurrency(totalToReceive) : "••••••"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  linkText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  calendarSection: {
    gap: 8,
  },
  calendarWeekdays: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 2,
  },
  weekdayText: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 4,
  },
  calendarCell: {
    width: "14.28%",
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 2,
    height: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  miniDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  nextShiftSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nextShiftRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  shiftDateBox: {
    width: 60,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.08)", // verde suave
    alignItems: "center",
    justifyContent: "center",
  },
  shiftDateText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  shiftInfo: {
    flex: 1,
    gap: 2,
  },
  shiftName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  shiftTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 8,
  },
  earnedSection: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  earnedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  earnedBox: {
    flex: 1,
    gap: 2,
  },
  earnedLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  earnedValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  verticalDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 12,
  },
});
