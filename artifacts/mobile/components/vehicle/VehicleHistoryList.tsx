import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { EmptyState } from "@/components/EmptyState";
import { IconCircle } from "@/components/IconCircle";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatKm, formatLiters } from "@/lib/vehicleStats";
import type { Entry } from "@/hooks/useVehicle";

interface VehicleHistoryListProps {
  entries: Entry[];
  onDeleteEntry: (entry: Entry) => void;
}

export function VehicleHistoryList({ entries, onDeleteEntry }: VehicleHistoryListProps) {
  const colors = useColors();

  return (
    <View style={styles.historyContainer}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Histórico
      </Text>
      {entries.length === 0 ? (
        <EmptyState
          icon="clock"
          title="Sem registros ainda"
          description="Adicione um abastecimento ou troca de óleo acima."
        />
      ) : (
        entries.map((entry) => (
          <Pressable
            key={`${entry.kind}-${entry.data.id}`}
            onPress={() =>
              router.push(
                entry.kind === "fueling"
                  ? `/fueling/${entry.data.id}`
                  : `/oilchange/${entry.data.id}`,
              )
            }
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
        ))
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
