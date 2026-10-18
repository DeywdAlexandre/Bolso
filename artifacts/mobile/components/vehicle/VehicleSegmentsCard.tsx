import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import type { FuelSegment, OpenSegment } from "@/lib/fuelSegments";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatKm, formatKmPerLiter, formatLiters } from "@/lib/vehicleStats";

const VISIBLE_BY_DEFAULT = 4;

const METHOD_LABEL = { full: "Cheio → Cheio", reserve: "Reserva → Reserva" } as const;
const METHOD_NEXT = { full: "próximo Cheio", reserve: "próxima Reserva" } as const;

interface VehicleSegmentsCardProps {
  segments: FuelSegment[];
  openSegment: OpenSegment | null;
}

/** Trechos medidos de consumo (do mais recente ao mais antigo) e o trecho em andamento. */
export function VehicleSegmentsCard({ segments, openSegment }: VehicleSegmentsCardProps) {
  const colors = useColors();
  const [showAll, setShowAll] = useState(false);

  const ordered = [...segments].reverse();
  const visible = showAll ? ordered : ordered.slice(0, VISIBLE_BY_DEFAULT);
  const hidden = ordered.length - visible.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Trechos de consumo</Text>
        {segments.length > 0 && (
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {segments.length} {segments.length === 1 ? "medido" : "medidos"}
          </Text>
        )}
      </View>

      {openSegment && (
        <View style={[styles.card, styles.openCard, { backgroundColor: colors.card, borderColor: colors.primary + "55" }]}>
          <View style={styles.rowTop}>
            <View style={[styles.badge, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="loader" size={11} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>Em andamento</Text>
            </View>
            <Text style={[styles.dates, { color: colors.mutedForeground }]}>
              desde {formatDate(openSegment.startDate)}
            </Text>
          </View>
          <Text style={[styles.detail, { color: colors.foreground }]}>
            {formatKm(openSegment.kmSoFar)} km · {formatLiters(openSegment.litersSoFar)} L até agora
          </Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Fecha no {METHOD_NEXT[openSegment.method]}. Abastecimentos parciais já entram na conta.
          </Text>
        </View>
      )}

      {segments.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Ainda não há trechos medidos. Registre dois abastecimentos Cheio ou dois em Reserva para calcular o km/L.
          </Text>
        </View>
      ) : (
        visible.map((seg) => (
          <View
            key={`${seg.startId}-${seg.endId}`}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.rowTop}>
              <View style={[styles.badge, { backgroundColor: colors.muted }]}>
                <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{METHOD_LABEL[seg.method]}</Text>
              </View>
              <Text style={[styles.kmL, { color: colors.primary }]}>{formatKmPerLiter(seg.kmPerLiter)} km/L</Text>
            </View>
            <Text style={[styles.detail, { color: colors.foreground }]}>
              {formatKm(seg.km)} km · {formatLiters(seg.liters)} L · {formatCurrency(seg.cost / seg.km)}/km
            </Text>
            <Text style={[styles.dates, { color: colors.mutedForeground }]}>
              {formatDate(seg.startDate)} → {formatDate(seg.endDate)} · odômetro {formatKm(seg.startOdometer)} →{" "}
              {formatKm(seg.endOdometer)}
            </Text>
          </View>
        ))
      )}

      {(hidden > 0 || (showAll && ordered.length > VISIBLE_BY_DEFAULT)) && (
        <Pressable onPress={() => setShowAll((v) => !v)} hitSlop={8} style={styles.toggle}>
          <Text style={[styles.toggleText, { color: colors.primary }]}>
            {showAll ? "Mostrar menos" : `Ver mais ${hidden} ${hidden === 1 ? "trecho" : "trechos"}`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  header: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  count: { fontSize: 12, fontFamily: "Inter_500Medium" },
  card: { padding: 14, borderRadius: 16, borderWidth: 1, gap: 6 },
  openCard: { borderStyle: "dashed" },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  kmL: { fontSize: 18, fontFamily: "Inter_700Bold" },
  detail: { fontSize: 13, fontFamily: "Inter_500Medium" },
  dates: { fontSize: 11, fontFamily: "Inter_400Regular" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  toggle: { alignSelf: "center", paddingVertical: 4 },
  toggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
