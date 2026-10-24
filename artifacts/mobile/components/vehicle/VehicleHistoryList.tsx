import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { EmptyState } from "@/components/EmptyState";
import { IconCircle } from "@/components/IconCircle";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatKm, formatLiters } from "@/lib/vehicleStats";
import { monthTotals } from "@/lib/vehicleCharts";
import type { Entry } from "@/hooks/useVehicle";

type Filter = "all" | Entry["kind"];

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tudo" },
  { key: "fueling", label: "Abastecimentos" },
  { key: "oilchange", label: "Óleo" },
  { key: "vehicleexpense", label: "Gastos" },
];

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function entryAmount(e: Entry): number {
  return e.kind === "fueling" ? e.data.totalCost : e.kind === "oilchange" ? e.data.cost || 0 : e.data.amount;
}

interface VehicleHistoryListProps {
  entries: Entry[];
  onDeleteEntry: (entry: Entry) => void;
}

export function VehicleHistoryList({ entries, onDeleteEntry }: VehicleHistoryListProps) {
  const colors = useColors();
  const [filter, setFilter] = useState<Filter>("all");

  const shown = useMemo(() => (filter === "all" ? entries : entries.filter((e) => e.kind === filter)), [entries, filter]);
  const totals = useMemo(
    () => new Map(monthTotals(shown.map((e) => ({ date: e.data.date, amount: entryAmount(e) }))).map((m) => [m.key, m.total])),
    [shown],
  );

  return (
    <View style={styles.historyContainer}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Histórico
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primary + "22" : colors.card,
              }}
            >
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: active ? colors.primary : colors.mutedForeground }}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {entries.length === 0 ? (
        <EmptyState
          icon="clock"
          title="Sem registros ainda"
          description="Adicione um abastecimento ou troca de óleo acima."
        />
      ) : (
        shown.map((entry, idx) => {
          const month = entry.data.date.slice(0, 7);
          const newMonth = idx === 0 || shown[idx - 1]!.data.date.slice(0, 7) !== month;
          return (
          <React.Fragment key={`${entry.kind}-${entry.data.id}`}>
          {newMonth && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: idx === 0 ? 0 : 8 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase" }}>
                {MONTHS[Number(month.slice(5, 7)) - 1]} {month.slice(0, 4)}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                {formatCurrency(totals.get(month) ?? 0)}
              </Text>
            </View>
          )}
          <Pressable
            onPress={() => {
              if (entry.kind === "fueling") {
                router.push(`/fueling/${entry.data.id}`);
              } else if (entry.kind === "oilchange") {
                router.push(`/oilchange/${entry.data.id}`);
              } else if (entry.kind === "vehicleexpense" && entry.data.transactionId) {
                router.push(`/transaction/${entry.data.transactionId}`);
              }
            }}
            onLongPress={() => onDeleteEntry(entry)}
            style={({ pressed }) => [
              styles.entryRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <IconCircle
              name={
                entry.kind === "fueling"
                  ? "droplet"
                  : entry.kind === "oilchange"
                    ? "settings"
                    : "tool"
              }
              color={
                entry.kind === "fueling"
                  ? colors.primary
                  : entry.kind === "oilchange"
                    ? colors.accent
                    : colors.mutedForeground
              }
              size={40}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.entryTitle, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {entry.kind === "fueling"
                  ? `${formatLiters(entry.data.liters)} L · ${formatKm(entry.data.odometer)} km`
                  : entry.kind === "oilchange"
                    ? `Troca de óleo · ${formatKm(entry.data.odometer)} km`
                    : `${entry.data.description}`}
              </Text>
              <Text
                style={[styles.entrySub, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {formatDate(entry.data.date) +
                  (entry.kind === "fueling"
                    ? ` · ${entry.data.tankStatus === "full" ? "tanque cheio" : entry.data.tankStatus === "partial" ? "parcial" : "reserva"}`
                    : entry.kind === "oilchange"
                      ? ` · próx. em ${formatKm(entry.data.nextChangeKm)} km`
                      : entry.data.odometer != null
                        ? ` · ${formatKm(entry.data.odometer)} km`
                        : "")}
              </Text>
            </View>
            <Text
              style={{
                color: colors.foreground,
                fontFamily: "Inter_700Bold",
                fontSize: 14,
              }}
            >
              {entry.kind === "fueling"
                ? formatCurrency(entry.data.totalCost)
                : entry.kind === "oilchange"
                  ? entry.data.cost
                    ? formatCurrency(entry.data.cost)
                    : ""
                  : formatCurrency(entry.data.amount)}
            </Text>
          </Pressable>
          </React.Fragment>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  historyContainer: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  entryTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  entrySub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
});
