import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { AccountChip } from "@/components/accounts/AccountChip";
import { useColors } from "@/hooks/useColors";
import { planInstallments } from "@/lib/cards";
import { formatCurrency, toIsoDay } from "@/lib/format";

export type InstallmentMode = "total" | "installment";

type Props = {
  count: number;
  onCountChange: (n: number) => void;
  mode: InstallmentMode;
  onModeChange: (m: InstallmentMode) => void;
  /** Valor digitado no campo de valor (total ou da parcela, conforme `mode`). */
  amount: number;
};

export const MAX_INSTALLMENTS = 48;

/** Valor total da compra a partir do valor digitado e do modo escolhido. */
export function totalFromInput(amount: number, count: number, mode: InstallmentMode): number {
  return Math.round((mode === "installment" ? amount * count : amount) * 100) / 100;
}

/** Parcelas da compra no cartão: quantidade, "valor total" ou "valor da parcela", e prévia. */
export function InstallmentsField({ count, onCountChange, mode, onModeChange, amount }: Props) {
  const colors = useColors();
  const total = totalFromInput(amount, count, mode);
  const plan = planInstallments(total, count, toIsoDay(new Date()));

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>Parcelas</Text>
      <View style={styles.row}>
        <View style={[styles.stepper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable onPress={() => onCountChange(Math.max(1, count - 1))} hitSlop={8} style={styles.stepBtn} accessibilityLabel="Menos parcelas">
            <Feather name="minus" size={18} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.count, { color: colors.foreground }]}>{count}x</Text>
          <Pressable
            onPress={() => onCountChange(Math.min(MAX_INSTALLMENTS, count + 1))}
            hitSlop={8}
            style={styles.stepBtn}
            accessibilityLabel="Mais parcelas"
          >
            <Feather name="plus" size={18} color={colors.foreground} />
          </Pressable>
        </View>
        {count > 1 && (
          <View style={styles.row}>
            <AccountChip label="Valor total" active={mode === "total"} onPress={() => onModeChange("total")} />
            <AccountChip label="Valor da parcela" active={mode === "installment"} onPress={() => onModeChange("installment")} />
          </View>
        )}
      </View>
      {count > 1 && amount > 0 && (
        <Text style={[styles.preview, { color: colors.mutedForeground }]}>
          {count}x de {formatCurrency(plan[0]!.amount)}
          {plan[0]!.amount !== plan[count - 1]!.amount ? ` (última ${formatCurrency(plan[count - 1]!.amount)})` : ""} · total{" "}
          {formatCurrency(total)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12 },
  stepBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  count: { minWidth: 44, textAlign: "center", fontSize: 15, fontFamily: "Inter_700Bold" },
  preview: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
