import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { InvoiceStatus } from "@/lib/cards";

const LABEL: Record<InvoiceStatus, string> = {
  open: "Aberta",
  future: "Futura",
  closed: "Fechada",
  overdue: "Vencida",
  paid: "Paga",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const colors = useColors();
  const tone =
    status === "paid" ? colors.income : status === "overdue" ? colors.expense : status === "closed" ? "#f59e0b" : colors.primary;
  return (
    <View style={[styles.badge, { backgroundColor: tone + "20" }]}>
      <Text style={[styles.text, { color: tone }]}>{LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  text: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.3 },
});
