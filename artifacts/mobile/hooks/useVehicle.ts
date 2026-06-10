import { useMemo, useState } from "react";
import { Alert, Platform } from "react-native";
import { router } from "expo-router";
import { useAppData } from "@/contexts/AppDataContext";
import { computeVehicleStats } from "@/lib/vehicleStats";
import type { Fueling, OilChange, VehicleExpense } from "@/lib/types";

export type Entry =
  | { kind: "fueling"; data: Fueling }
  | { kind: "oilchange"; data: OilChange }
  | { kind: "vehicleexpense"; data: VehicleExpense };

export function useVehicle(id: string) {
  const [extraModalVisible, setExtraModalVisible] = useState(false);
  
  const {
    vehicles,
    fuelings,
    oilChanges,
    vehicleExpenses,
    removeVehicle,
    removeFueling,
    removeOilChange,
    removeVehicleExpense,
    transactions,
    removeTransaction,
  } = useAppData();

  const vehicle = useMemo(
    () => vehicles.find((v) => v.id === id),
    [vehicles, id],
  );

  const stats = useMemo(
    () =>
      vehicle ? computeVehicleStats(vehicle, fuelings, oilChanges, vehicleExpenses) : null,
    [vehicle, fuelings, oilChanges, vehicleExpenses],
  );

  const entries: Entry[] = useMemo(() => {
    if (!vehicle) return [];
    const fs: Entry[] = fuelings
      .filter((f) => f.vehicleId === vehicle.id)
      .map((f) => ({ kind: "fueling" as const, data: f }));
    const os: Entry[] = oilChanges
      .filter((o) => o.vehicleId === vehicle.id)
      .map((o) => ({ kind: "oilchange" as const, data: o }));
    const vexs: Entry[] = vehicleExpenses
      .filter((v) => v.vehicleId === vehicle.id)
      .map((v) => ({ kind: "vehicleexpense" as const, data: v }));
    return [...fs, ...os, ...vexs].sort(
      (a, b) =>
        new Date(b.data.date).getTime() - new Date(a.data.date).getTime(),
    );
  }, [vehicle, fuelings, oilChanges, vehicleExpenses]);

  const handleDeleteVehicle = () => {
    if (!vehicle) return;

    const performDelete = async () => {
      await removeVehicle(vehicle.id);
      router.back();
    };

    if (Platform.OS === "web") {
      const confirm = window.confirm("Excluir veículo\nIsso vai apagar o veículo e todo o histórico de abastecimentos e trocas. Tem certeza?");
      if (confirm) {
        performDelete();
      }
    } else {
      Alert.alert(
        "Excluir veículo",
        "Isso vai apagar o veículo e todo o histórico de abastecimentos e trocas. Tem certeza?",
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

  const handleDeleteEntry = (entry: Entry) => {
    const isFuel = entry.kind === "fueling";
    const isOil = entry.kind === "oilchange";
    const title = isFuel ? "Excluir abastecimento" : isOil ? "Excluir troca de óleo" : "Excluir gasto extra";

    const performDelete = async () => {
      let linkedId: string | undefined;
      if (entry.kind === "fueling") {
        linkedId = entry.data.expenseTransactionId;
      } else if (entry.kind === "oilchange") {
        linkedId = entry.data.expenseTransactionId;
      } else if (entry.kind === "vehicleexpense") {
        linkedId = entry.data.transactionId;
      }
      if (linkedId && transactions.some((t) => t.id === linkedId)) {
        await removeTransaction(linkedId);
      }
      if (isFuel) await removeFueling(entry.data.id);
      else if (isOil) await removeOilChange(entry.data.id);
      else await removeVehicleExpense(entry.data.id);
    };

    if (Platform.OS === "web") {
      const confirm = window.confirm(`${title}\nTem certeza? Se houver gasto vinculado no extrato, ele também será excluído.`);
      if (confirm) {
        performDelete();
      }
    } else {
      Alert.alert(
        title,
        "Tem certeza? Se houver gasto vinculado no extrato, ele também será excluído.",
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

  return {
    vehicle,
    stats,
    entries,
    extraModalVisible,
    setExtraModalVisible,
    handleDeleteVehicle,
    handleDeleteEntry,
  };
}
