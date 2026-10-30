import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, Stack } from "expo-router";

import { CategoryList } from "@/components/analysis/CategoryList";
import { DonutChart } from "@/components/analysis/DonutChart";
import { MonthlyBars } from "@/components/analysis/MonthlyBars";
import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatDate, getMonthName } from "@/lib/format";
import {
  categoryBreakdown,
  inPeriod,
  monthlySeries,
  periodInsights,
  periodLabel,
  previousPeriod,
  shiftPeriod,
  todayPeriod,
  topTransactions,
  totalsOf,
  type AnalysisPeriod,
} from "@/lib/spendingAnalysis";
import type { TransactionType } from "@/lib/types";

/** Tamanho da fonte do valor no centro da rosca: números longos encolhem para caber. */
const centerSize = (text: string) => (text.length > 13 ? 16 : text.length > 11 ? 19 : 23);

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function AnalysisScreen() {
  const colors = useColors();
  const { transactions, categories } = useAppData();
  const [period, setPeriod] = useState<AnalysisPeriod>(todayPeriod());
  const [type, setType] = useState<TransactionType>("expense");
  const [selected, setSelected] = useState<string | null>(null);

  const current = useMemo(() => inPeriod(transactions, period), [transactions, period]);
  const previous = useMemo(() => inPeriod(transactions, previousPeriod(period)), [transactions, period]);
  const totals = useMemo(() => totalsOf(current), [current]);
  const rows = useMemo(() => categoryBreakdown(current, previous, categories, type), [current, previous, categories, type]);
  const insights = useMemo(() => periodInsights(current, period), [current, period]);
  const bars = useMemo(
    () =>
      period.mode === "year"
        ? monthlySeries(transactions, { month: 11, year: period.year }, 12)
        : monthlySeries(transactions, period, 6),
    [transactions, period],
  );
  const activeKey = period.mode === "month" ? `${period.year}-${String(period.month + 1).padStart(2, "0")}` : null;

  const total = type === "expense" ? totals.expense : totals.income;
  const sel = rows.find((r) => r.id === selected) ?? null;
  const biggest = useMemo(
    () => topTransactions(current, type, selected, categories, 5),
    [current, type, selected, categories],
  );

  const changePeriod = (p: AnalysisPeriod) => {
    setPeriod(p);
    setSelected(null);
  };
  const centerText = formatCurrency(sel ? sel.amount : total);
  const isExpense = type === "expense";
  const accent = isExpense ? colors.destructive : colors.income;

  return (
    <>
      <Stack.Screen options={{ title: "Para onde vai o dinheiro" }} />
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
        {/* Período */}
        <View style={styles.periodRow}>
          <Pressable onPress={() => changePeriod(shiftPeriod(period, -1))} hitSlop={12} accessibilityLabel="Período anterior" style={[styles.arrow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="chevron-left" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.periodText, { color: colors.foreground }]}>{periodLabel(period, getMonthName)}</Text>
          <Pressable onPress={() => changePeriod(shiftPeriod(period, 1))} hitSlop={12} accessibilityLabel="Próximo período" style={[styles.arrow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="chevron-right" size={20} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.segment}>
          {(["month", "year"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => changePeriod({ ...period, mode: m })}
              style={[styles.segBtn, { backgroundColor: period.mode === m ? colors.primary : colors.card, borderColor: period.mode === m ? colors.primary : colors.border }]}
            >
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: period.mode === m ? colors.primaryForeground : colors.mutedForeground }}>
                {m === "month" ? "Mês" : "Ano"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Entrou x Saiu */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.flowRow}>
            <Flow label="Entrou" value={totals.income} color={colors.income} />
            <Flow label="Saiu" value={totals.expense} color={colors.destructive} />
            <Flow label={totals.balance >= 0 ? "Sobrou" : "Faltou"} value={Math.abs(totals.balance)} color={totals.balance >= 0 ? colors.foreground : colors.destructive} />
          </View>
          {totals.income > 0 && (
            <>
              <View style={[styles.track, { backgroundColor: colors.muted }]}>
                <View style={{ width: `${Math.min((totals.expense / totals.income) * 100, 100)}%`, height: "100%", backgroundColor: totals.expense > totals.income ? colors.destructive : colors.primary }} />
              </View>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                {totals.balance >= 0
                  ? `Você guardou ${pct(totals.savingsRate ?? 0)} do que entrou.`
                  : `Você gastou ${formatCurrency(-totals.balance)} a mais do que entrou.`}
              </Text>
            </>
          )}
        </View>

        {/* Saídas / Entradas */}
        <View style={styles.segment}>
          {(
            [
              ["expense", "Para onde vai"],
              ["income", "De onde vem"],
            ] as const
          ).map(([t, label]) => (
            <Pressable
              key={t}
              onPress={() => {
                setType(t);
                setSelected(null);
              }}
              style={[styles.segBtn, { flex: 1, backgroundColor: type === t ? (t === "expense" ? colors.destructive : colors.income) : colors.card, borderColor: type === t ? "transparent" : colors.border }]}
            >
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: type === t ? "#fff" : colors.mutedForeground }}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {rows.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "center", gap: 8, paddingVertical: 32 }]}>
            <Feather name="pie-chart" size={32} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, textAlign: "center", fontSize: 13 }}>
              {isExpense ? "Nenhum gasto neste período." : "Nenhuma entrada neste período."}
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 24 }]}>
              <DonutChart items={rows.map((r) => ({ id: r.id, value: r.amount, color: r.color }))} selectedId={selected} onSelect={setSelected}>
                <Text style={[styles.centerLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {sel ? sel.name : isExpense ? "Total gasto" : "Total recebido"}
                </Text>
                <Text style={[styles.centerValue, { color: sel ? sel.color : accent, fontSize: centerSize(centerText) }]} numberOfLines={1}>
                  {centerText}
                </Text>
                <Text style={[styles.centerLabel, { color: colors.mutedForeground }]}>
                  {sel ? `${pct(sel.share)} do total` : `${rows.length} ${rows.length === 1 ? "categoria" : "categorias"}`}
                </Text>
              </DonutChart>
              <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: "center", marginTop: 12 }]}>
                Toque numa fatia ou numa categoria para ver os maiores lançamentos.
              </Text>
            </View>

            {isExpense && (
              <View style={styles.chips}>
                <Chip icon="calendar" label="Média por dia" value={formatCurrency(insights.avgPerDay)} />
                {insights.topDay && <Chip icon="alert-circle" label="Dia mais caro" value={`${formatCurrency(insights.topDay.amount)} · ${formatDate(insights.topDay.date).slice(0, 5)}`} />}
                {rows[0] && <Chip icon="award" label="Maior categoria" value={`${rows[0].name} · ${pct(rows[0].share)}`} />}
              </View>
            )}

            <CategoryList rows={rows} type={type} selectedId={selected} onSelect={setSelected} />

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 10 }]}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {sel ? `Maiores lançamentos · ${sel.name}` : isExpense ? "Maiores gastos do período" : "Maiores entradas do período"}
              </Text>
              {biggest.map((t) => (
                <Pressable key={t.id} onPress={() => router.push(`/transaction/${t.id}` as never)} style={styles.txRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>
                      {t.description}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{formatDate(t.date)}</Text>
                  </View>
                  <Text style={{ color: accent, fontSize: 14, fontFamily: "Inter_700Bold" }}>{formatCurrency(t.amount)}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <MonthlyBars bars={bars} activeKey={activeKey} />
      </ScrollView>
    </>
  );
}

function Flow({ label, value, color }: { label: string; value: number; color: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={[styles.centerLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={{ color, fontSize: 15, fontFamily: "Inter_700Bold" }} adjustsFontSizeToFit numberOfLines={1}>
        {formatCurrency(value)}
      </Text>
    </View>
  );
}

function Chip({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon} size={16} color={colors.primary} />
      <View>
        <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" }}>{label}</Text>
        <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_700Bold" }}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16, paddingBottom: 60 },
  periodRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  arrow: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  periodText: { fontSize: 20, fontFamily: "Inter_700Bold", textTransform: "capitalize" },
  segment: { flexDirection: "row", gap: 8 },
  segBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 10 },
  flowRow: { flexDirection: "row", gap: 8 },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  hint: { fontSize: 12, fontFamily: "Inter_500Medium" },
  centerLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.3 },
  centerValue: { fontSize: 24, fontFamily: "Inter_700Bold", marginVertical: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  title: { fontSize: 14, fontFamily: "Inter_700Bold" },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12 },
});
