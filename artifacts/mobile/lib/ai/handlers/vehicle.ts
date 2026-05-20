import { computeVehicleStats, formatKmPerLiter, formatKm } from "../../vehicleStats";
import type { AddVehicleExpenseArgs } from "../toolTypes";
import type { TankStatus } from "../../types";

export function buildVehicleHandlers(deps: {
  vehicles: any[];
  fuelings: any[];
  oilChanges: any[];
  vehicleExpenses: any[];
  addFueling: (f: any) => Promise<any>;
  addOilChange: (o: any) => Promise<any>;
  addVehicleExpense: (e: any) => Promise<any>;
}) {
  return {
    async listVehicles() {
      const list = deps.vehicles.map((v) => ({
        id: v.id,
        name: v.name,
        plate: v.plate,
        fuelType: v.fuelType,
      }));
      return { vehicles: list };
    },

    async addFueling(args: {
      vehicleName: string;
      amount: number;
      liters: number;
      odometer: number;
      date?: string;
      tankStatus?: TankStatus;
    }) {
      const vehicle = deps.vehicles.find(
        (v) =>
          v.name.toLowerCase().includes(args.vehicleName.toLowerCase()) ||
          v.plate?.toLowerCase().includes(args.vehicleName.toLowerCase())
      );
      if (!vehicle) return { ok: false, error: "Veículo não encontrado." };

      const fueling = await deps.addFueling({
        vehicleId: vehicle.id,
        amount: args.amount,
        liters: args.liters,
        odometer: args.odometer,
        date: args.date || new Date().toISOString(),
        totalCost: args.amount,
        tankStatus: args.tankStatus || "partial",
      });

      return { ok: true, fueling };
    },

    async addOilChange(args: {
      vehicleName: string;
      odometer: number;
      nextChangeOdometer: number;
      date?: string;
    }) {
      const vehicle = deps.vehicles.find(
        (v) =>
          v.name.toLowerCase().includes(args.vehicleName.toLowerCase()) ||
          v.plate?.toLowerCase().includes(args.vehicleName.toLowerCase())
      );
      if (!vehicle) return { ok: false, error: "Veículo não encontrado." };

      const oilChange = await deps.addOilChange({
        vehicleId: vehicle.id,
        odometer: args.odometer,
        nextChangeKm: args.nextChangeOdometer,
        date: args.date || new Date().toISOString(),
        description: "Troca via IA",
      });

      return { ok: true, oilChange };
    },

    async getVehicleStats(args: { vehicleName: string }) {
      const vehicle = deps.vehicles.find(
        (v) =>
          v.name.toLowerCase().includes(args.vehicleName.toLowerCase()) ||
          v.plate?.toLowerCase().includes(args.vehicleName.toLowerCase())
      );
      if (!vehicle) return { stats: null, error: "Veículo não encontrado." };

      const stats = computeVehicleStats(vehicle, deps.fuelings, deps.oilChanges, deps.vehicleExpenses);
      return {
        stats: {
          vehicleName: vehicle.name,
          avgKmL: stats.avgKmPerLiter ? formatKmPerLiter(stats.avgKmPerLiter) + " km/L" : "N/A",
          lastOdometer: stats.lastOdometer ? formatKm(stats.lastOdometer) + " km" : "N/A",
          oilStatus: stats.oilStatus,
          kmRemainingOil: stats.kmRemainingOil ? formatKm(stats.kmRemainingOil) + " km" : "N/A",
          avgCostPerKm: stats.avgCostPerKm ? "R$ " + stats.avgCostPerKm.toFixed(2) + " / km" : "N/A",
        },
      };
    },

    async addVehicleExpense(args: AddVehicleExpenseArgs) {
      const vehicle = deps.vehicles.find(
        (v) =>
          v.name.toLowerCase().includes(args.vehicleName.toLowerCase()) ||
          v.plate?.toLowerCase().includes(args.vehicleName.toLowerCase())
      );
      if (!vehicle) return { ok: false, error: "Veículo não encontrado." };

      const expense = await deps.addVehicleExpense({
        vehicleId: vehicle.id,
        description: args.description,
        amount: args.amount,
        odometer: args.odometer,
        date: args.date || new Date().toISOString(),
      });

      return { ok: true, expense };
    },
  };
}
