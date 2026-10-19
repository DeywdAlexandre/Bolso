import type { Shift, ShiftRule, Transaction } from "../../types";

export function buildShiftHandlers(deps: {
  shifts: Shift[];
  shiftRules: ShiftRule[];
  addShift: (s: Omit<Shift, "id" | "createdAt">) => Promise<Shift>;
  updateShift: (id: string, patch: Partial<Shift>) => Promise<void>;
  addShiftRule: (r: Omit<ShiftRule, "id" | "createdAt">) => Promise<ShiftRule>;
  generateShiftsFromRule: (ruleId: string, limitMonths?: number) => Promise<number>;
  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => Promise<Transaction>;
  removeTransaction: (id: string) => Promise<void>;
}) {
  return {
    list_shifts: async (args: { type?: "ordinary" | "extra" | "all"; month?: number; year?: number }) => {
      const type = args.type || "all";
      const now = new Date();
      const month = args.month || (now.getMonth() + 1);
      const year = args.year || now.getFullYear();

      const monthStr = String(month).padStart(2, "0");
      const prefix = `${year}-${monthStr}`;

      const filtered = deps.shifts.filter(s => {
        const matchesDate = s.date.startsWith(prefix);
        const matchesType = type === "all" || s.type === type;
        return matchesDate && matchesType;
      });

      // Ordenar por data
      filtered.sort((a, b) => a.date.localeCompare(b.date));

      const stats = {
        totalShifts: filtered.length,
        ordinaryCount: filtered.filter(s => s.type === "ordinary").length,
        extraCount: filtered.filter(s => s.type === "extra").length,
        estimatedRevenue: filtered.reduce((acc, s) => acc + (s.type === "extra" ? s.value || 0 : 0), 0),
        receivedRevenue: filtered.reduce((acc, s) => acc + (s.type === "extra" && s.isPaid ? s.value || 0 : 0), 0),
      };

      return {
        success: true,
        stats,
        shifts: filtered.map(s => ({
          id: s.id,
          name: s.name,
          type: s.type === "ordinary" ? "Ordinário" : "Extra",
          date: s.date,
          time: `${s.startTime} - ${s.endTime}`,
          value: s.value,
          isPaid: !!s.isPaid,
        })),
      };
    },

    add_shift_rule: async (args: {
      name: string;
      type: "ordinary" | "extra";
      value?: number;
      recurrenceType: "rotative" | "weekly";
      startDate: string;
      workHours?: number;
      offHours?: number;
      weekDays?: number[];
      startTime: string;
      endTime: string;
    }) => {
      const rule = await deps.addShiftRule({
        name: args.name,
        type: args.type,
        value: args.value,
        recurrenceType: args.recurrenceType,
        startDate: args.startDate,
        workHours: args.workHours,
        offHours: args.offHours,
        weekDays: args.weekDays,
        startTime: args.startTime,
        endTime: args.endTime,
        color: "#3b82f6",
      });

      const created = await deps.generateShiftsFromRule(rule.id, 3);

      return {
        success: true,
        message: `Escala recorrente '${rule.name}' criada com sucesso! ${created} plantões foram agendados até os próximos 3 meses (a escala é estendida sozinha ao longo do tempo).`,
        generated: created,
        rule,
      };
    },

    add_shift_single: async (args: {
      name: string;
      type: "ordinary" | "extra";
      value?: number;
      date: string;
      startTime: string;
      endTime: string;
    }) => {
      const shift = await deps.addShift({
        name: args.name,
        type: args.type,
        value: args.value,
        date: args.date,
        startTime: args.startTime,
        endTime: args.endTime,
        isPaid: false,
      });

      return {
        success: true,
        message: `Plantão avulso '${shift.name}' agendado para o dia ${shift.date}.`,
        shift,
      };
    },

    toggle_shift_paid: async (args: { shiftDate: string; shiftName: string }) => {
      const shift = deps.shifts.find(s => s.date === args.shiftDate && s.name.toLowerCase().includes(args.shiftName.toLowerCase()));
      if (!shift) {
        return {
          success: false,
          error: `Plantão '${args.shiftName}' não encontrado no dia ${args.shiftDate}.`,
        };
      }

      if (shift.type !== "extra") {
        return {
          success: false,
          error: "Apenas plantões do tipo 'Extra' (remunerados) podem ser marcados como recebidos.",
        };
      }

      const nextPaidState = !shift.isPaid;

      if (nextPaidState) {
        const tx = await deps.addTransaction({
          type: "income",
          amount: shift.value || 0,
          categoryId: "cat_salary",
          description: `Escala Extra: ${shift.name}`,
          date: shift.date + "T12:00:00.000Z",
        });
        await deps.updateShift(shift.id, { isPaid: true, transactionId: tx.id });
      } else {
        if (shift.transactionId) {
          await deps.removeTransaction(shift.transactionId);
        }
        await deps.updateShift(shift.id, { isPaid: false, transactionId: undefined });
      }

      return {
        success: true,
        message: `Plantão '${shift.name}' do dia ${shift.date} marcado como ${nextPaidState ? "recebido (lançado no extrato)" : "pendente de recebimento"}.`,
        shift: { ...shift, isPaid: nextPaidState },
      };
    },
  };
}
