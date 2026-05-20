import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/format";
import type { Recurring } from "@/lib/types";

interface UpcomingCommitmentsProps {
  upcoming: Recurring[];
  onApply: (id: string) => Promise<void>;
}

export function UpcomingCommitments({ upcoming, onApply }: UpcomingCommitmentsProps) {
  const colors = useColors();

  if (upcoming.length === 0) return null;

  return (
    <View style={styles.upcomingContainer}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Próximos Compromissos
      </Text>
      <View
        style={[
          styles.upcomingCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {upcoming.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.upcomingItem,
              index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.upcomingDesc, { color: colors.foreground }]} numberOfLines={1}>
                {item.description}
              </Text>
              <Text style={[styles.upcomingSub, { color: colors.mutedForeground }]}>
                Dia {item.dayOfMonth} · {formatCurrency(item.amount)}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                Alert.alert(
                  "Confirmar lançamento",
                  `Deseja registrar o pagamento de ${item.description} no valor de ${formatCurrency(item.amount)} no extrato de hoje?`,
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Registrar",
                      onPress: async () => {
                        try {
                          await onApply(item.id);
                        } catch (e) {
                          Alert.alert("Erro", "Não foi possível registrar.");
                        }
                      },
                    },
                  ],
                );
              }}
              style={({ pressed }) => [
                styles.applyBtn,
                {
                  backgroundColor: colors.primary + "12",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="check" size={16} color={colors.primary} />
              <Text style={[styles.applyBtnText, { color: colors.primary }]}>
                Pagar
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  upcomingContainer: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  upcomingCard: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
  },
  upcomingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  upcomingDesc: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  upcomingSub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  applyBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
});
