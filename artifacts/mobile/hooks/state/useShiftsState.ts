import { useState, useEffect, useCallback } from "react";
import { genId } from "@/lib/format";
import { saveJson, STORAGE_KEYS, loadJson } from "@/lib/storage";
import type { Shift, ShiftRule, ShiftTemplate } from "@/lib/types";

export function useShiftsState() {
  const [ready, setReady] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftRules, setShiftRules] = useState<ShiftRule[]>([]);
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([]);

  // Carregamento inicial do armazenamento local
  useEffect(() => {
    (async () => {
      const [shs, shRules, shTemps] = await Promise.all([
        loadJson<Shift[]>(STORAGE_KEYS.shifts, []),
        loadJson<ShiftRule[]>(STORAGE_KEYS.shiftRules, []),
        loadJson<ShiftTemplate[]>(STORAGE_KEYS.shiftTemplates, []),
      ]);

      setShifts(shs);
      setShiftRules(shRules);
      setShiftTemplates(shTemps || []);
      setReady(true);
    })();
  }, []);

  const addShiftRule = useCallback(async (input: Omit<ShiftRule, "id" | "createdAt">) => {
    const now = new Date().toISOString();
    const rule: ShiftRule = {
      ...input,
      id: "shrule_" + genId(),
      createdAt: now,
      updatedAt: now,
    };
    setShiftRules((prev) => {
      const next = [rule, ...prev];
      void saveJson(STORAGE_KEYS.shiftRules, next);
      return next;
    });
    return rule;
  }, []);

  const updateShiftRule = useCallback(async (id: string, patch: Partial<ShiftRule>) => {
    const now = new Date().toISOString();
    setShiftRules((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now } : r));
      void saveJson(STORAGE_KEYS.shiftRules, next);
      return next;
    });
  }, []);

  const removeShiftRule = useCallback(async (id: string) => {
    setShiftRules((prev) => {
      const next = prev.filter((r) => r.id !== id);
      void saveJson(STORAGE_KEYS.shiftRules, next);
      return next;
    });
    setShifts((prev) => {
      const next = prev.filter((s) => s.ruleId !== id || s.isPaid || s.transactionId);
      void saveJson(STORAGE_KEYS.shifts, next);
      return next;
    });
  }, []);

  const addShiftRaw = useCallback(async (shift: Shift) => {
    const shWithUpdate = shift.updatedAt ? shift : { ...shift, updatedAt: shift.createdAt };
    setShifts((prev) => {
      const next = [shWithUpdate, ...prev];
      void saveJson(STORAGE_KEYS.shifts, next);
      return next;
    });
  }, []);

  const addShift = useCallback(async (input: Omit<Shift, "id" | "createdAt">) => {
    const now = new Date().toISOString();
    const s: Shift = {
      ...input,
      id: "sh_" + genId(),
      createdAt: now,
      updatedAt: now,
    };
    await addShiftRaw(s);
    return s;
  }, [addShiftRaw]);

  const updateShift = useCallback(async (id: string, patch: Partial<Shift>) => {
    const now = new Date().toISOString();
    setShifts((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: now } : s));
      void saveJson(STORAGE_KEYS.shifts, next);
      return next;
    });
  }, []);

  const removeShift = useCallback(async (id: string) => {
    setShifts((prev) => {
      const next = prev.filter((s) => s.id !== id);
      void saveJson(STORAGE_KEYS.shifts, next);
      return next;
    });
  }, []);

  const generateShiftsFromRule = useCallback(async (ruleId: string, limitMonths = 3) => {
    const rule = shiftRules.find(r => r.id === ruleId);
    if (!rule) return;

    const newShifts: Shift[] = [];
    const limitDate = new Date();
    limitDate.setMonth(limitDate.getMonth() + limitMonths);

    const startTime = rule.startTime;
    const endTime = rule.endTime;
    const name = rule.name;
    const type = rule.type;
    const value = rule.value;
    const color = rule.color;

    if (rule.recurrenceType === "weekly") {
      const weekDays = rule.weekDays || [];
      let current = new Date(rule.startDate);
      while (current <= limitDate) {
        if (weekDays.includes(current.getDay())) {
          const dateStr = current.toISOString().split("T")[0];
          newShifts.push({
            id: "sh_" + genId(),
            ruleId: rule.id,
            name,
            type,
            value,
            date: dateStr,
            startTime,
            endTime,
            color,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        current.setDate(current.getDate() + 1);
      }
    } else if (rule.recurrenceType === "rotative") {
      const workHours = rule.workHours || 12;
      const offHours = rule.offHours || 36;
      const cycleHours = workHours + offHours;

      let current = new Date(rule.startDate);
      while (current <= limitDate) {
        const dateStr = current.toISOString().split("T")[0];
        newShifts.push({
          id: "sh_" + genId(),
          ruleId: rule.id,
          name,
          type,
          value,
          date: dateStr,
          startTime,
          endTime,
          color,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        current.setTime(current.getTime() + cycleHours * 60 * 60 * 1000);
      }
    }

    setShifts((prev) => {
      const ruleShifts = prev.filter(s => s.ruleId === rule.id);
      const otherShifts = prev.filter(s => s.ruleId !== rule.id);

      const mergedRuleShifts = [...ruleShifts];
      newShifts.forEach(ns => {
        const exists = mergedRuleShifts.find(s => s.date === ns.date);
        if (!exists) {
          mergedRuleShifts.push(ns);
        }
      });

      const next = [...otherShifts, ...mergedRuleShifts];
      void saveJson(STORAGE_KEYS.shifts, next);
      return next;
    });
  }, [shiftRules]);

  const addShiftTemplate = useCallback(async (input: Omit<ShiftTemplate, "id" | "createdAt" | "updatedAt">) => {
    const newTemplate: ShiftTemplate = {
      ...input,
      id: "sh_temp_" + genId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setShiftTemplates((prev) => {
      const next = [...prev, newTemplate];
      void saveJson(STORAGE_KEYS.shiftTemplates, next);
      return next;
    });
    return newTemplate;
  }, []);

  const updateShiftTemplate = useCallback(async (id: string, patch: Partial<ShiftTemplate>) => {
    setShiftTemplates((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
      );
      void saveJson(STORAGE_KEYS.shiftTemplates, next);
      return next;
    });
  }, []);

  const removeShiftTemplate = useCallback(async (id: string) => {
    setShiftTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      void saveJson(STORAGE_KEYS.shiftTemplates, next);
      return next;
    });
  }, []);

  // Métodos de limpeza e importação de estado
  const clearState = useCallback(async () => {
    setShifts([]);
    setShiftRules([]);
    setShiftTemplates([]);
    await Promise.all([
      saveJson(STORAGE_KEYS.shifts, []),
      saveJson(STORAGE_KEYS.shiftRules, []),
      saveJson(STORAGE_KEYS.shiftTemplates, []),
    ]);
  }, []);

  const importState = useCallback(async (data: {
    shifts?: Shift[];
    shiftRules?: ShiftRule[];
    shiftTemplates?: ShiftTemplate[];
  }) => {
    if (data.shifts) {
      setShifts(data.shifts);
      await saveJson(STORAGE_KEYS.shifts, data.shifts);
    }
    if (data.shiftRules) {
      setShiftRules(data.shiftRules);
      await saveJson(STORAGE_KEYS.shiftRules, data.shiftRules);
    }
    if (data.shiftTemplates) {
      setShiftTemplates(data.shiftTemplates);
      await saveJson(STORAGE_KEYS.shiftTemplates, data.shiftTemplates);
    }
  }, []);

  return {
    ready,
    shifts,
    shiftRules,
    shiftTemplates,
    addShiftRule,
    updateShiftRule,
    removeShiftRule,
    addShiftRaw,
    addShift,
    updateShift,
    removeShift,
    generateShiftsFromRule,
    addShiftTemplate,
    updateShiftTemplate,
    removeShiftTemplate,
    clearState,
    importState,
  };
}
