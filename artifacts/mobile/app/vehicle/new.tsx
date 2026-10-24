import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";

import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import type { FuelType } from "@/lib/types";
import { pickVehiclePhoto } from "@/lib/vehiclePhoto";
import { FUEL_TYPE_LABELS } from "@/lib/vehicleStats";

const VEHICLE_ICONS = [
  "truck",
  "navigation",
  "anchor",
  "package",
  "zap",
  "wind",
];
const VEHICLE_COLORS = [
  "#00d68f",
  "#60a5fa",
  "#a78bfa",
  "#fb7185",
  "#fbbf24",
  "#f472b6",
  "#22d3ee",
  "#ff8a4c",
];
const FUEL_OPTIONS: FuelType[] = ["gasolina", "etanol", "diesel", "gnv", "flex"];

export default function VehicleFormScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string }>();
  const { vehicles, addVehicle, updateVehicle } = useAppData();

  const editing = useMemo(
    () => (params.id ? vehicles.find((v) => v.id === params.id) : null),
    [vehicles, params.id],
  );
  const isEdit = !!editing;

  const [name, setName] = useState<string>(editing?.name ?? "");
  const [plate, setPlate] = useState<string>(editing?.plate ?? "");
  const [fuelType, setFuelType] = useState<FuelType>(editing?.fuelType ?? "flex");
  const [icon, setIcon] = useState<string>(editing?.icon ?? "truck");
  const [color, setColor] = useState<string>(editing?.color ?? VEHICLE_COLORS[0]!);
  const [photo, setPhoto] = useState<string | undefined>(editing?.photo);
  const [odoStr, setOdoStr] = useState<string>(
    editing?.initialOdometer != null ? String(editing.initialOdometer) : "",
  );

  const handlePhoto = () => {
    Alert.alert("Foto do veículo", "Escolha uma opção", [
      { text: "Galeria", onPress: async () => setPhoto((await pickVehiclePhoto("gallery")) ?? photo) },
      { text: "Câmera", onPress: async () => setPhoto((await pickVehiclePhoto("camera")) ?? photo) },
      ...(photo ? [{ text: "Remover foto", style: "destructive" as const, onPress: () => setPhoto(undefined) }] : []),
      { text: "Cancelar", style: "cancel" as const },
    ]);
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Nome", "Informe um nome para o veículo.");
      return;
    }
    const odoNum = parseInt(odoStr.replace(/\D/g, ""), 10);
    const initialOdometer = isFinite(odoNum) && odoNum > 0 ? odoNum : undefined;
    const payload = {
      name: trimmed,
      plate: plate.trim() || undefined,
      fuelType,
      icon,
      color,
      initialOdometer,
      photo,
    };
    if (isEdit && editing) {
      await updateVehicle(editing.id, payload);
    } else {
      await addVehicle(payload);
    }
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{ title: isEdit ? "Editar veículo" : "Novo veículo" }}
      />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Nome">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex: Honda Civic, Moto"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
          />
        </Field>

        <Field label="Placa (opcional)">
          <TextInput
            value={plate}
            onChangeText={(t) => setPlate(t.toUpperCase())}
            placeholder="ABC1D23"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
            maxLength={8}
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
          />
        </Field>

        <Field label="Foto">
          <Pressable
            onPress={handlePhoto}
            style={{
              height: 150,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            ) : (
              <>
                <Feather name="camera" size={24} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Adicionar foto (opcional)</Text>
              </>
            )}
          </Pressable>
        </Field>

        <Field label="Combustível">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {FUEL_OPTIONS.map((f) => {
              const active = fuelType === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => setFuelType(f)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? colors.primaryForeground : colors.foreground,
                      fontFamily: active ? "Inter_700Bold" : "Inter_500Medium",
                      fontSize: 13,
                    }}
                  >
                    {FUEL_TYPE_LABELS[f]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Field>

        <Field label="Quilometragem atual (opcional)">
          <TextInput
            value={odoStr}
            onChangeText={(t) => setOdoStr(t.replace(/\D/g, ""))}
            placeholder="0"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
          />
        </Field>

        <Field label="Ícone">
          <View style={styles.gridRow}>
            {VEHICLE_ICONS.map((ic) => {
              const active = icon === ic;
              return (
                <Pressable
                  key={ic}
                  onPress={() => setIcon(ic)}
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: active ? color + "26" : colors.card,
                      borderColor: active ? color : colors.border,
                    },
                  ]}
                >
                  <Feather
                    name={ic as keyof typeof Feather.glyphMap}
                    size={20}
                    color={active ? color : colors.mutedForeground}
                  />
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="Cor">
          <View style={styles.gridRow}>
            {VEHICLE_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorBox,
                  {
                    backgroundColor: c,
                    borderColor:
                      color === c ? colors.foreground : "transparent",
                  },
                ]}
              />
            ))}
          </View>
        </Field>

        <Pressable
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.submit,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
            {isEdit ? "Salvar" : "Adicionar"}
          </Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
    gap: 18,
  },
  field: { gap: 10 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  gridRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  colorBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
  },
  submit: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
