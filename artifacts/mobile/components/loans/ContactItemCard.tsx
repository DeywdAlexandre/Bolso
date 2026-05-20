import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { ContactAvatar } from "@/components/ContactAvatar";
import { useColors } from "@/hooks/useColors";
import type { LoanContact } from "@/lib/types";

interface ContactItemCardProps {
  item: LoanContact;
}

export function ContactItemCard({ item }: ContactItemCardProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/loans/[id]", params: { id: item.id } })}
      style={({ pressed }) => [
        styles.contactCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <ContactAvatar name={item.name} photo={item.photo} size={50} />
      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: colors.foreground }]}>
          {item.name}
        </Text>
        <Text style={[styles.contactSub, { color: colors.mutedForeground }]}>
          Clique para ver empréstimos
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  contactInfo: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  contactSub: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
