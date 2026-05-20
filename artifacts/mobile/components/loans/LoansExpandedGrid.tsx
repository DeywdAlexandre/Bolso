import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/format";

interface LoansExpandedGridProps {
  stats: {
    monthlyProjection: number;
    interestToReceiveTotal: number;
    interestToReceivePending: number;
    interestToPayTotal: number;
    interestToPayPending: number;
    installmentsToReceiveTotal: number;
    installmentsToReceiveRemaining: number;
    installmentsToPayTotal: number;
    installmentsToPayRemaining: number;
    netBalance: number;
    netInterestProfit: number;
  };
}

export function LoansExpandedGrid({ stats }: LoansExpandedGridProps) {
  const colors = useColors();

  return (
    <View style={styles.expandedGrid}>
      <View style={styles.gridRow}>
        {/* Card 1: Previsão */}
        <View style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.miniHeader}>
            <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Projeção Mês</Text>
            <Pressable
              onPress={() =>
                Alert.alert(
                  "Projeção Mensal",
                  "Soma do juros mensal + valor das parcelas fixas previstas para o período atual.",
                )
              }
              hitSlop={8}
            >
              <Feather name="help-circle" size={12} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Text style={[styles.miniValue, { color: stats.monthlyProjection >= 0 ? colors.income : colors.expense }]}>
            {formatCurrency(Math.abs(stats.monthlyProjection))}
          </Text>
          <Text style={[styles.miniSub, { color: colors.mutedForeground }]}>Fluxo Estimado</Text>
        </View>

        {/* Card 2: Juros a Receber */}
        <View style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Juros a Receber</Text>
          <Text style={[styles.miniValue, { color: colors.foreground }]}>
            {formatCurrency(stats.interestToReceiveTotal)}
          </Text>
          <Text style={[styles.miniSub, { color: colors.income }]}>
            Pend: {formatCurrency(stats.interestToReceivePending)}
          </Text>
        </View>

        {/* Card 3: Juros a Pagar */}
        <View style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Juros a Pagar</Text>
          <Text style={[styles.miniValue, { color: colors.foreground }]}>
            {formatCurrency(stats.interestToPayTotal)}
          </Text>
          <Text style={[styles.miniSub, { color: colors.expense }]}>
            Pend: {formatCurrency(stats.interestToPayPending)}
          </Text>
        </View>
      </View>

      <View style={styles.gridRow}>
        {/* Card 4: Parcelados (Geral) */}
        <View style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Parcelados</Text>
          <Text style={[styles.miniValue, { color: colors.foreground }]}>
            {formatCurrency(stats.installmentsToReceiveTotal)}
          </Text>
          <Text style={[styles.miniSub, { color: colors.mutedForeground }]}>
            Resto: {formatCurrency(stats.installmentsToReceiveRemaining)}
          </Text>
        </View>

        {/* Card 5: Balanço Líquido */}
        <View style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Saldo Líquido</Text>
          <Text style={[styles.miniValue, { color: stats.netBalance >= 0 ? colors.income : colors.expense }]}>
            {formatCurrency(Math.abs(stats.netBalance))}
          </Text>
          <Text style={[styles.miniSub, { color: colors.mutedForeground }]}>
            Net: {formatCurrency(stats.netInterestProfit)} (Juros)
          </Text>
        </View>

        {/* Card 6: Parcelados Pagar */}
        <View style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Parcelas Pagar</Text>
          <Text style={[styles.miniValue, { color: colors.foreground }]}>
            {formatCurrency(stats.installmentsToPayTotal)}
          </Text>
          <Text style={[styles.miniSub, { color: colors.mutedForeground }]}>
            Resto: {formatCurrency(stats.installmentsToPayRemaining)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  expandedGrid: {
    marginTop: 16,
    gap: 10,
  },
  gridRow: {
    flexDirection: "row",
    gap: 10,
  },
  miniCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    justifyContent: "center",
  },
  miniHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  miniLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
  },
  miniValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  miniSub: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
  },
});
