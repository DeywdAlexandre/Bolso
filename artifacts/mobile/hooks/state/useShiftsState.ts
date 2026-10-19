import { useState, useEffect, useCallback, useRef } from "react";
import { genId, toIsoDay } from "@/lib/format";
import { generateRuleShifts, horizonDay, planRuleExtension, shiftsAfterRuleRemoval } from "@/lib/shifts";
import { saveJson, STORAGE_KEYS, loadJson } from "@/lib/storage";
import type { Shift, ShiftRule, ShiftTemplate } from "@/lib/types";

export function useShiftsState() {
  const [ready, setReady] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftRules, setShiftRules] = useState<ShiftRule[]>([]);
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([]);
  // Sempre a lista de escalas mais recente: quem cria uma escala e gera os plantões na sequência
  // (antes, com o estado do render, a escala recém-criada "não existia" e nada era gerado).
  const rulesRef = useRef<ShiftRule[]>([]);
  const setRules = useCallback((updater: (prev: ShiftRule[]) => ShiftRule[]) => {
    const next = updater(rulesRef.current);
    rulesRef.current = next;
    setShiftRules(next);
    void saveJson(STORAGE_KEYS.shiftRules, next);
  }, []);

  // Carregamento inicial do armazenamento local
  useEffect(() => {
    (async () => {
      const [shs, shRules, shTemps] = await Promise.all([
        loadJson<Shift[]>(STORAGE_KEYS.shifts, []),
        loadJson<ShiftRule[]>(STORAGE_KEYS.shiftRules, []),
        loadJson<ShiftTemplate[]>(STORAGE_KEYS.shiftTemplates, []),
      ]);

      setShifts(shs);
      rulesRef.current = shRules;
      setShiftRules(shRules);
      setShiftTemplates(shTemps || []);

      // Mantém as escalas recorrentes geradas à frente (e conserta as que nunca geraram nada).
      const today = toIsoDay(new Date());
      let nextShifts = shs;
      const nextRules = shRules.map((rule) => {
        const plan = planRuleExtension(rule, nextShifts, today);
        if (!plan) return rule;
        nextShifts = [...nextShifts, ...plan.shifts];
        return { ...rule, generatedUntil: plan.generatedUntil };
      });
      if (nextShifts !== shs) {
        setShifts(nextShifts);
        void saveJson(STORAGE_KEYS.shifts, nextShifts);
      }
      if (nextRules.some((r, i) => r !== shRules[i])) {
        rulesRef.current = nextRules;
        setShiftRules(nextRules);
        void saveJson(STORAGE_KEYS.shiftRules, nextRules);
      }
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
    setRules((prev) => [rule, ...prev]);
    return rule;
  }, [setRules]);

  const updateShiftRule = useCallback(async (id: string, patch: Partial<ShiftRule>) => {
    const now = new Date().toISOString();
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now } : r)));
  }, [setRules]);

  const removeShiftRule = useCallback(async (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    // Só os plantões futuros e ainda não recebidos saem; o histórico fica.
    setShifts((prev) => {
      const next = shiftsAfterRuleRemoval(prev, id, toIsoDay(new Date()));
      void saveJson(STORAGE_KEYS.shifts, next);
      return next;
    });
  }, [setRules]);

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

  /** Gera os plantões da escala até `limitMonths` à frente e devolve quantos foram criados. */
  const generateShiftsFromRule = useCallback(async (ruleId: string, limitMonths = 3) => {
    const rule = rulesRef.current.find((r) => r.id === ruleId);
    if (!rule) return 0;

    const until = horizonDay(toIsoDay(new Date()), limitMonths);
    const generated = generateRuleShifts(rule, { until });
    let created = 0;

    setShifts((prev) => {
      const have = new Set(prev.filter((s) => s.ruleId === rule.id).map((s) => s.date));
      const fresh = generated.filter((s) => !have.has(s.date));
      created = fresh.length;
      const next = [...prev, ...fresh];
      void saveJson(STORAGE_KEYS.shifts, next);
      return next;
    });
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, generatedUntil: until } : r)));
    return created;
  }, [setRules]);

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
    rulesRef.current = [];
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
      rulesRef.current = data.shiftRules;
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
