import React, { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";

interface ExtraExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  vehicleId: string;
}

export function ExtraExpenseModal({
  visible,
  onClose,
  vehicleId,
}: ExtraExpenseModalProps) {
  const colors = useColors();
  const { addVehicleExpense } = useAppData();
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [odo, setOdo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!desc || !amount) {
      Alert.alert("Erro", "Preencha a descrição e o valor.");
      return;
    }
    setLoading(true);
    try {
      await addVehicleExpense({
        vehicleId,
        description: desc,
        amount: parseFloat(amount.replace(",", ".")),
        date: new Date().toISOString(),
        odometer: odo ? parseInt(odo) : undefined,
      });
      setDesc("");
      setAmount("");
      setOdo("");
      onClose();
    } catch (e) {
      Alert.alert("Erro ao salvar", "Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Novo Gasto Extra</Text>
          
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Descrição (ex: Lava-jato)</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            value={desc}
            onChangeText={setDesc}
            placeholder="O que você pagou?"
            placeholderTextColor={colors.mutedForeground}
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Valor (R$)</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>KM (Opcional)</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                value={odo}
                onChangeText={setOdo}
                keyboardType="numeric"
                placeholder="Km atual"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          <View style={styles.modalButtons}>
            <Pressable onPress={onClose} style={[styles.btn, { backgroundColor: colors.muted + "40" }]}>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={handleSave} disabled={loading} style={[styles.btn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: "white", fontFamily: "Inter_700Bold" }}>{loading ? "Salvando..." : "Salvar"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
