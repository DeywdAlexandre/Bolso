import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AccountChip } from "@/components/accounts/AccountChip";
import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { PAYMENT_METHODS } from "@/lib/accounts";
import type { PaymentMethod } from "@/lib/types";

type Props = {
  accountId: string | undefined;
  onAccountChange: (id: string | undefined) => void;
  paymentMethod: PaymentMethod | undefined;
  onPaymentMethodChange: (method: PaymentMethod | undefined) => void;
};

/**
 * "Conta" e "Forma de pagamento" do lançamento. Os dois são opcionais: tocar de novo
 * no chip escolhido desmarca. Some quando ainda não há nenhuma conta cadastrada.
 */
export function AccountMethodFields({ accountId, onAccountChange, paymentMethod, onPaymentMethodChange }: Props) {
  const colors = useColors();
  const { accounts } = useAppData();
  const active = accounts.filter((a) => !a.archived);

  if (active.length === 0) return null;

  return (
    <>
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Conta</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {active.map((a) => (
            <AccountChip
              key={a.id}
              label={a.name}
              color={a.color}
              active={accountId === a.id}
              onPress={() => onAccountChange(accountId === a.id ? undefined : a.id)}
            />
          ))}
          <AccountChip label="Sem conta" active={accountId === undefined} onPress={() => onAccountChange(undefined)} />
        </ScrollView>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Forma de pagamento</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {PAYMENT_METHODS.map((m) => (
            <AccountChip
              key={m.value}
              label={m.label}
              active={paymentMethod === m.value}
              onPress={() => onPaymentMethodChange(paymentMethod === m.value ? undefined : m.value)}
            />
          ))}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4 },
  row: { gap: 8, paddingRight: 8 },
});
