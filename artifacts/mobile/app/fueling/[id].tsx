import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";

import { useAppData } from "@/contexts/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { formatDate, todayIso } from "@/lib/format";
import type { TankStatus } from "@/lib/types";

const FUEL_EXPENSE_CATEGORY = "cat_transport";

function parseDecimal(s: string): number {
  if (!s) return 0;
  const cleaned = s
    .replace(/\s/g, "")
    .replace(/[^\d,.\-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : 0;
}

function formatDecimal(n: number, decimals = 2): string {
  if (!isFinite(n) || n === 0) return "";
  return n
    .toFixed(decimals)
    .replace(/\.?0+$/, "")
    .replace(".", ",");
}

export default function FuelingFormScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ id: string; vehicleId?: string }>();
  const isNew = params.id === "new";

  const {
    vehicles,
    fuelings,
    addFueling,
    updateFueling,
    removeFueling,
    addTransaction,
    updateTransaction,
    removeTransaction,
    transactions,
    categories,
  } = useAppData();

  const editing = useMemo(
    () => (!isNew ? fuelings.find((f) => f.id === params.id) : null),
    [fuelings, params.id, isNew],
  );

  const initialVehicleId =
    editing?.vehicleId ?? params.vehicleId ?? vehicles[0]?.id ?? "";

  const [vehicleId, setVehicleId] = useState<string>(initialVehicleId);
  const [date, setDate] = useState<string>(editing?.date ?? todayIso());
  const [odoStr, setOdoStr] = useState<string>(
    editing ? String(editing.odometer) : "",
  );
  const [tankStatus, setTankStatus] = useState<TankStatus>(
    editing?.tankStatus ?? "full",
  );
  const [totalStr, setTotalStr] = useState<string>(
    editing ? formatDecimal(editing.totalCost, 2) : "",
  );
  const [litersStr, setLitersStr] = useState<string>(
    editing ? formatDecimal(editing.liters, 3) : "",
  );
  const [priceStr, setPriceStr] = useState<string>(
    editing ? formatDecimal(editing.pricePerLiter, 3) : "",
  );
  const [notes, setNotes] = useState<string>(editing?.notes ?? "");
  const [createExpense, setCreateExpense] = useState<boolean>(
    editing ? !!editing.expenseTransactionId : true,
  );

  // Track edit recency so we know which two fields are anchors
  const ts = useRef<{ total: number; liters: number; price: number }>({
    total: editing ? 1 : 0,
    liters: editing ? 2 : 0,
    price: editing ? 3 : 0,
  });

  const recompute = (just: "total" | "liters" | "price") => {
    const otherKeys: ("total" | "liters" | "price")[] = (
      ["total", "liters", "price"] as const
    ).filter((k) => k !== just);
    // The "third" field is the OLDEST of the other two
    otherKeys.sort((a, b) => ts.current[a] - ts.current[b]);
    const oldest = otherKeys[0]!;
    const newest = otherKeys[1]!;
    if (ts.current[newest] === 0) return; // need at least 2 anchors
    const total = parseDecimal(totalStr);
    const liters = parseDecimal(litersStr);
    const price = parseDecimal(priceStr);
    if (oldest === "price" && total > 0 && liters > 0) {
      setPriceStr(formatDecimal(total / liters, 3));
    } else if (oldest === "liters" && total > 0 && price > 0) {
      setLitersStr(formatDecimal(total / price, 3));
    } else if (oldest === "total" && liters > 0 && price > 0) {
      setTotalStr(formatDecimal(liters * price, 2));
    }
  };

  const onChangeTotal = (v: string) => {
    setTotalStr(v);
    ts.current.total = Date.now();
  };
  const onChangeLiters = (v: string) => {
    setLitersStr(v);
    ts.current.liters = Date.now();
  };
  const onChangePrice = (v: string) => {
    setPriceStr(v);
    ts.current.price = Date.now();
  };

  // Recompute on input change
  useEffect(() => {
    recompute("total");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalStr]);
  useEffect(() => {
    recompute("liters");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [litersStr]);
  useEffect(() => {
    recompute("price");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceStr]);

  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString());
  };

  const handleSubmit = async () => {
    if (!vehicleId) {
      Alert.alert("Veículo", "Selecione um veículo.");
      return;
    }
    const odo = parseInt(odoStr.replace(/\D/g, ""), 10);
    if (!isFinite(odo) || odo <= 0) {
      Alert.alert("Quilometragem", "Informe a quilometragem atual (km).");
      return;
    }
    const totalCost = parseDecimal(totalStr);
    const liters = parseDecimal(litersStr);
    const pricePerLiter = parseDecimal(priceStr);
    if (totalCost <= 0 || liters <= 0 || pricePerLiter <= 0) {
      Alert.alert(
        "Valores",
        "Informe pelo menos dois entre: valor total, litros e preço/L. O terceiro é calculado.",
      );
      return;
    }

    const vehicle = vehicles.find((v) => v.id === vehicleId);
    const vehicleName = vehicle?.name ?? "Veículo";
    const description = `Abastecimento · ${vehicleName}`;
    const fuelCat =
      categories.find((c) => c.id === FUEL_EXPENSE_CATEGORY)?.id ??
      categories.find((c) => c.type === "expense")?.id ??
      FUEL_EXPENSE_CATEGORY;

    let expenseTransactionId: string | undefined =
      editing?.expenseTransactionId;

    if (createExpense) {
      if (expenseTransactionId && transactions.some((t) => t.id === expenseTransactionId)) {
        await updateTransaction(expenseTransactionId, {
          amount: totalCost,
          description,
          date,
          categoryId: fuelCat,
          type: "expense",
        });
      } else {
        const tx = await addTransaction({
          type: "expense",
          amount: totalCost,
          categoryId: fuelCat,
          description,
          date,
        });
        expenseTransactionId = tx.id;
      }
    } else {
      if (expenseTransactionId && transactions.some((t) => t.id === expenseTransactionId)) {
        await removeTransaction(expenseTransactionId);
      }
      expenseTransactionId = undefined;
    }

    const payload = {
      vehicleId,
      date,
      odometer: odo,
      liters,
      pricePerLiter,
      totalCost,
      tankStatus,
      notes: notes.trim() || undefined,
      expenseTransactionId,
    };

    if (editing) {
      await updateFueling(editing.id, payload);
    } else {
      await addFueling(payload);
    }
    router.back();
  };

  const handleDelete = () => {
    if (!editing) return;

    const performDelete = async () => {
      if (
        editing.expenseTransactionId &&
        transactions.some((t) => t.id === editing.expenseTransactionId)
      ) {
        await removeTransaction(editing.expenseTransactionId);
      }
      await removeFueling(editing.id);
      router.back();
    };

    if (Platform.OS === "web") {
      const confirm = window.confirm("Excluir abastecimento\nTem certeza? O gasto vinculado também será excluído.");
      if (confirm) {
        performDelete();
      }
    } else {
      Alert.alert(
        "Excluir abastecimento",
        "Tem certeza? O gasto vinculado também será excluído.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Excluir",
            style: "destructive",
            onPress: performDelete,
          },
        ],
      );
    }
  };

  return (
    <>
      <Stack.Screen
        options={{ title: isNew ? "Novo abastecimento" : "Editar abastecimento" }}
      />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Veículo">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {vehicles.map((v) => {
              const active = vehicleId === v.id;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => setVehicleId(v.id)}
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
                      color: active
                        ? colors.primaryForeground
                        : colors.foreground,
                      fontFamily: active
                        ? "Inter_700Bold"
                        : "Inter_500Medium",
                      fontSize: 13,
                    }}
                  >
                    {v.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Field>

        <Field label="Estado do tanque">
          <View style={[styles.toggle, { backgroundColor: colors.muted }]}>
            {(["full", "partial", "reserve"] as TankStatus[]).map((s) => {
              const active = tankStatus === s;
              let icon: keyof typeof Feather.glyphMap = "droplet";
              let color = colors.primary;
              if (s === "full") icon = "battery-charging";
              if (s === "reserve") {
                icon = "battery";
                color = colors.accent;
              }

              return (
                <Pressable
                  key={s}
                  onPress={() => setTankStatus(s)}
                  style={[
                    styles.toggleBtn,
                    {
                      backgroundColor: active ? colors.background : "transparent",
                    },
                  ]}
                >
                  <Feather
                    name={icon}
                    size={14}
                    color={active ? color : colors.mutedForeground}
                  />
                  <Text
                    style={{
                      color: active ? color : colors.mutedForeground,
                      fontFamily: active ? "Inter_700Bold" : "Inter_500Medium",
                      fontSize: 13,
                    }}
                  >
                    {s === "full" ? "Cheio" : s === "partial" ? "Parcial" : "Reserva"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_500Medium" }}>
            Marque como chegou no posto. O consumo é medido entre dois pontos iguais (Cheio→Cheio ou Reserva→Reserva). Abastecimentos parciais são somados no meio do caminho.
          </Text>
        </Field>

        <Field label="Quilometragem (km)">
          <TextInput
            value={odoStr}
            onChangeText={(t) => setOdoStr(t.replace(/\D/g, ""))}
            placeholder="Ex: 45230"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
            ]}
          />
        </Field>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1, gap: 10 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Valor total (R$)
            </Text>
            <TextInput
              value={totalStr}
              onChangeText={onChangeTotal}
              placeholder="0,00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
              ]}
            />
          </View>
          <View style={{ flex: 1, gap: 10 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Litros
            </Text>
            <TextInput
              value={litersStr}
              onChangeText={onChangeLiters}
              placeholder="0,000"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
              ]}
            />
          </View>
        </View>

        <Field label="Preço por litro (R$/L)">
          <TextInput
            value={priceStr}
            onChangeText={onChangePrice}
            placeholder="0,000"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
            ]}
          />
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_500Medium" }}>
            Preencha 2 dos 3 campos acima — o terceiro é calculado.
          </Text>
        </Field>

        <Field label="Data">
          <View style={[styles.dateRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={() => shiftDate(-1)} hitSlop={8} style={styles.dateBtn}>
              <Feather name="chevron-left" size={20} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.dateLabel, { color: colors.foreground }]}>
              {formatDate(date)}
            </Text>
            <Pressable onPress={() => shiftDate(1)} hitSlop={8} style={styles.dateBtn}>
              <Feather name="chevron-right" size={20} color={colors.foreground} />
            </Pressable>
          </View>
        </Field>

        <Field label="Observações (opcional)">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Posto, marca, etc"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
            ]}
          />
        </Field>

        <View
          style={[
            styles.toggleRow,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
              Gerar gasto vinculado
            </Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 }}>
              Cria um gasto em Transporte com o valor total
            </Text>
          </View>
          <Switch
            value={createExpense}
            onValueChange={setCreateExpense}
            trackColor={{ false: colors.muted, true: colors.primary + "55" }}
            thumbColor={createExpense ? colors.primary : "#777"}
          />
        </View>

        <Pressable
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.submit,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
            {editing ? "Salvar" : "Adicionar"}
          </Text>
        </Pressable>

        {editing ? (
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.delete, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Feather name="trash-2" size={16} color={colors.destructive} />
            <Text style={[styles.deleteText, { color: colors.destructive }]}>Excluir</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60, gap: 18 },
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
  toggle: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  dateBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  dateLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  submit: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  delete: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  deleteText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
