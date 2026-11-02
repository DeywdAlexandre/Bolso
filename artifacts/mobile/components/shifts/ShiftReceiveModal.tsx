import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { AccountMethodFields } from "@/components/accounts/AccountMethodFields";
import { useAppData } from "@/contexts/AppDataContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useAccountChoice } from "@/hooks/useAccountChoice";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatDate, fromIsoDay, toIsoDay } from "@/lib/format";
import type { PaymentMethod, Shift } from "@/lib/types";

import { styles } from "./styles";

export type ReceiveDetails = { accountId?: string; paymentMethod?: PaymentMethod; day: string };

type Props = {
  shift: Shift | null;
  onClose: () => void;
  onConfirm: (shift: Shift, details: ReceiveDetails) => Promise<void>;
};

const addDays = (day: string, n: number) => {
  const d = fromIsoDay(day);
  d.setDate(d.getDate() + n);
  return toIsoDay(d);
};

/** Ao marcar um plantão extra como recebido: em que conta caiu e em que dia. */
export function ShiftReceiveModal({ shift, onClose, onConfirm }: Props) {
  const colors = useColors();
  const { accounts } = useAppData();
  const { updateSettings } = useSettings();
  const { accountId, setAccountId, paymentMethod, setPaymentMethod } = useAccountChoice(true);
  const [day, setDay] = useState(() => toIsoDay(new Date()));
  const [saving, setSaving] = useState(false);

  // Cada plantão abre com "hoje" (o dia em que você está marcando), não com o dia do plantão.
  useEffect(() => {
    if (shift) setDay(toIsoDay(new Date()));
  }, [shift?.id]);

  if (!shift) return null;

  const today = toIsoDay(new Date());
  const chips = [
    { label: "Hoje", value: today },
    { label: "Ontem", value: addDays(today, -1) },
    ...(shift.date !== today && shift.date !== addDays(today, -1) ? [{ label: "Dia do plantão", value: shift.date }] : []),
  ];

  const confirm = async () => {
    setSaving(true);
    try {
      if (accountId) await updateSettings({ lastAccountId: accountId });
      await onConfirm(shift, { accountId, paymentMethod, day });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Receber plantão</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar">
              <Feather name="x" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 2 }}>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{shift.name}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Plantão de {formatDate(shift.date)}</Text>
              <Text style={{ color: colors.income, fontFamily: "Inter_700Bold", fontSize: 22, marginTop: 4 }}>
                {formatCurrency(shift.value || 0)}
              </Text>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Dia em que recebeu</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                }}
              >
                <Pressable onPress={() => setDay(addDays(day, -1))} hitSlop={8} accessibilityLabel="Dia anterior">
                  <Feather name="chevron-left" size={20} color={colors.foreground} />
                </Pressable>
                <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>{formatDate(day)}</Text>
                <Pressable onPress={() => setDay(addDays(day, 1))} hitSlop={8} accessibilityLabel="Próximo dia">
                  <Feather name="chevron-right" size={20} color={colors.foreground} />
                </Pressable>
              </View>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {chips.map((c) => {
                  const active = c.value === day;
                  return (
                    <Pressable
                      key={c.label}
                      onPress={() => setDay(c.value)}
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
                        {c.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <AccountMethodFields
              accountId={accountId}
              onAccountChange={setAccountId}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              hideCards
              accountLabel="Em qual conta você recebeu?"
            />
            {accounts.length === 0 && (
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                Você ainda não cadastrou contas. O valor entra no extrato sem conta.
              </Text>
            )}

            <Pressable
              onPress={confirm}
              disabled={saving}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                borderRadius: 28,
                paddingVertical: 14,
                alignItems: "center",
                opacity: pressed || saving ? 0.8 : 1,
              })}
            >
              {saving ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 16 }}>Confirmar recebimento</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
