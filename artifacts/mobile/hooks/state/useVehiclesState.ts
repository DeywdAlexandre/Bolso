import { useState, useEffect, useCallback } from "react";
import { genId } from "@/lib/format";
import { saveJson, STORAGE_KEYS, loadJson } from "@/lib/storage";
import type { Vehicle, Fueling, OilChange, VehicleExpense, Transaction } from "@/lib/types";

interface UseVehiclesStateProps {
  addTransaction: (input: Omit<Transaction, "id" | "createdAt">) => Promise<Transaction>;
  removeTransaction: (id: string) => Promise<void>;
}

export function useVehiclesState({ addTransaction, removeTransaction }: UseVehiclesStateProps) {
  const [ready, setReady] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelings, setFuelings] = useState<Fueling[]>([]);
  const [oilChanges, setOilChanges] = useState<OilChange[]>([]);
  const [vehicleExpenses, setVehicleExpenses] = useState<VehicleExpense[]>([]);

  // Carregamento inicial do armazenamento local
  useEffect(() => {
    (async () => {
      const [veh, fue, oil, vex] = await Promise.all([
        loadJson<Vehicle[]>(STORAGE_KEYS.vehicles, []),
        loadJson<Fueling[]>(STORAGE_KEYS.fuelings, []),
        loadJson<OilChange[]>(STORAGE_KEYS.oilChanges, []),
        loadJson<VehicleExpense[]>(STORAGE_KEYS.vehicleExpenses, []),
      ]);

      setVehicles(veh);
      setFuelings(fue);
      setOilChanges(oil);
      setVehicleExpenses(vex);
      setReady(true);
    })();
  }, []);

  const addVehicle = useCallback(async (input: Omit<Vehicle, "id" | "createdAt">) => {
    const now = new Date().toISOString();
    const v: Vehicle = { ...input, id: "veh_" + genId(), createdAt: now, updatedAt: now };
    setVehicles((prev) => {
      const next = [v, ...prev];
      void saveJson(STORAGE_KEYS.vehicles, next);
      return next;
    });
    return v;
  }, []);

  const updateVehicle = useCallback(async (id: string, patch: Partial<Vehicle>) => {
    const now = new Date().toISOString();
    setVehicles((prev) => {
      const next = prev.map((v) => (v.id === id ? { ...v, ...patch, updatedAt: now } : v));
      void saveJson(STORAGE_KEYS.vehicles, next);
      return next;
    });
  }, []);

  const removeVehicle = useCallback(async (id: string) => {
    setVehicles((prev) => {
      const next = prev.filter((v) => v.id !== id);
      void saveJson(STORAGE_KEYS.vehicles, next);
      return next;
    });
    setFuelings((prev) => {
      const next = prev.filter((f) => f.vehicleId !== id);
      void saveJson(STORAGE_KEYS.fuelings, next);
      return next;
    });
    setOilChanges((prev) => {
      const next = prev.filter((o) => o.vehicleId !== id);
      void saveJson(STORAGE_KEYS.oilChanges, next);
      return next;
    });
  }, []);

  const addFueling = useCallback(async (input: Omit<Fueling, "id" | "createdAt">) => {
    const now = new Date().toISOString();
    const f: Fueling = { ...input, id: "fue_" + genId(), createdAt: now, updatedAt: now };
    setFuelings((prev) => {
      const next = [f, ...prev];
      void saveJson(STORAGE_KEYS.fuelings, next);
      return next;
    });
    return f;
  }, []);

  const updateFueling = useCallback(async (id: string, patch: Partial<Fueling>) => {
    const now = new Date().toISOString();
    setFuelings((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, ...patch, updatedAt: now } : f));
      void saveJson(STORAGE_KEYS.fuelings, next);
      return next;
    });
  }, []);

  const removeFueling = useCallback(async (id: string) => {
    setFuelings((prev) => {
      const next = prev.filter((f) => f.id !== id);
      void saveJson(STORAGE_KEYS.fuelings, next);
      return next;
    });
  }, []);

  const addOilChange = useCallback(async (input: Omit<OilChange, "id" | "createdAt">) => {
    const now = new Date().toISOString();
    const o: OilChange = { ...input, id: "oil_" + genId(), createdAt: now, updatedAt: now };
    setOilChanges((prev) => {
      const next = [o, ...prev];
      void saveJson(STORAGE_KEYS.oilChanges, next);
      return next;
    });
    return o;
  }, []);

  const updateOilChange = useCallback(async (id: string, patch: Partial<OilChange>) => {
    const now = new Date().toISOString();
    setOilChanges((prev) => {
      const next = prev.map((o) => (o.id === id ? { ...o, ...patch, updatedAt: now } : o));
      void saveJson(STORAGE_KEYS.oilChanges, next);
      return next;
    });
  }, []);

  const removeOilChange = useCallback(async (id: string) => {
    setOilChanges((prev) => {
      const next = prev.filter((o) => o.id !== id);
      void saveJson(STORAGE_KEYS.oilChanges, next);
      return next;
    });
  }, []);

  const addVehicleExpense = useCallback(async (input: Omit<VehicleExpense, "id" | "createdAt">) => {
    const now = new Date().toISOString();
    const tx = await addTransaction({
      type: "expense",
      amount: input.amount,
      categoryId: "others",
      description: `Veículo: ${input.description}`,
      date: input.date,
    });

    const ve: VehicleExpense = { 
      ...input, 
      id: "vex_" + genId(), 
      transactionId: tx.id,
      createdAt: now,
      updatedAt: now,
    };

    setVehicleExpenses((prev) => {
      const next = [ve, ...prev];
      void saveJson(STORAGE_KEYS.vehicleExpenses, next);
      return next;
    });
    return ve;
  }, [addTransaction]);

  const removeVehicleExpense = useCallback(async (id: string) => {
    let txId: string | undefined;
    setVehicleExpenses((prev) => {
      const target = prev.find(v => v.id === id);
      txId = target?.transactionId;
      const next = prev.filter((v) => v.id !== id);
      void saveJson(STORAGE_KEYS.vehicleExpenses, next);
      return next;
    });
    if (txId) await removeTransaction(txId);
  }, [removeTransaction]);

  // Métodos de limpeza e importação de estado
  const clearState = useCallback(async () => {
    setVehicles([]);
    setFuelings([]);
    setOilChanges([]);
    setVehicleExpenses([]);
    await Promise.all([
      saveJson(STORAGE_KEYS.vehicles, []),
      saveJson(STORAGE_KEYS.fuelings, []),
      saveJson(STORAGE_KEYS.oilChanges, []),
      saveJson(STORAGE_KEYS.vehicleExpenses, []),
    ]);
  }, []);

  const importState = useCallback(async (data: {
    vehicles?: Vehicle[];
    fuelings?: Fueling[];
    oilChanges?: OilChange[];
    vehicleExpenses?: VehicleExpense[];
  }) => {
    if (data.vehicles) {
      setVehicles(data.vehicles);
      await saveJson(STORAGE_KEYS.vehicles, data.vehicles);
    }
    if (data.fuelings) {
      setFuelings(data.fuelings);
      await saveJson(STORAGE_KEYS.fuelings, data.fuelings);
    }
    if (data.oilChanges) {
      setOilChanges(data.oilChanges);
      await saveJson(STORAGE_KEYS.oilChanges, data.oilChanges);
    }
    if (data.vehicleExpenses) {
      setVehicleExpenses(data.vehicleExpenses);
      await saveJson(STORAGE_KEYS.vehicleExpenses, data.vehicleExpenses);
    }
  }, []);

  return {
    ready,
    vehicles,
    fuelings,
    oilChanges,
    vehicleExpenses,
    addVehicle,
    updateVehicle,
    removeVehicle,
    addFueling,
    updateFueling,
    removeFueling,
    addOilChange,
    updateOilChange,
    removeOilChange,
    addVehicleExpense,
    removeVehicleExpense,
    clearState,
    importState,
  };
}
