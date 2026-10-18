import type { Fueling } from "./types";

/**
 * Regras do cálculo de consumo (km/L). O status do abastecimento diz como o tanque
 * estava no momento do abastecimento:
 *
 * - "full" (Cheio): o tanque foi enchido. O consumo é medido de um Cheio até o próximo
 *   Cheio. Os litros do Cheio inicial NÃO entram (já estavam no tanque); entram os
 *   parciais do meio e os litros do Cheio final, que repõem exatamente o que foi gasto.
 * - "reserve" (Reserva): chegou ao posto na reserva, o mesmo nível de referência de
 *   cada vez. O consumo é medido de uma Reserva até a próxima Reserva. Entram os litros
 *   da Reserva inicial e dos parciais do meio; os litros da Reserva final NÃO entram
 *   (são abastecidos depois do ponto medido).
 * - "partial" (Parcial): nem cheio nem reserva. Não fecha uma medição; seus litros são
 *   somados ao trecho em andamento e só viram km/L quando o próximo Cheio/Reserva chega.
 *
 * Cheio→Cheio e Reserva→Reserva podem coexistir. Para não contar o mesmo trecho
 * duas vezes, escolhemos o conjunto de trechos sem sobreposição que cobre mais km.
 */

export type FuelSegment = {
  method: "full" | "reserve";
  startId: string;
  endId: string;
  startOdometer: number;
  endOdometer: number;
  startDate: string;
  endDate: string;
  km: number;
  liters: number;
  cost: number;
  kmPerLiter: number;
  /** Intervalo (índices na lista ordenada) dos abastecimentos cujos litros entram no trecho. */
  litersFrom: number;
  litersTo: number;
};

/** Ordem física: o odômetro só cresce; empates (mesmo km) seguem a data/hora. */
export function sortFuelings(list: Fueling[]): Fueling[] {
  return [...list].sort((a, b) => {
    if (a.odometer !== b.odometer) return a.odometer - b.odometer;
    return a.date.localeCompare(b.date);
  });
}

function buildCandidates(fuelings: Fueling[], status: "full" | "reserve"): FuelSegment[] {
  const anchors: number[] = [];
  fuelings.forEach((f, i) => {
    if (f.tankStatus === status) anchors.push(i);
  });

  const out: FuelSegment[] = [];
  for (let a = 0; a < anchors.length - 1; a++) {
    const s = anchors[a]!;
    const e = anchors[a + 1]!;
    const start = fuelings[s]!;
    const end = fuelings[e]!;
    const km = end.odometer - start.odometer;
    if (km <= 0) continue;

    const litersFrom = status === "full" ? s + 1 : s;
    const litersTo = status === "full" ? e : e - 1;

    let liters = 0;
    let cost = 0;
    for (let j = litersFrom; j <= litersTo; j++) {
      liters += fuelings[j]!.liters;
      cost += fuelings[j]!.totalCost;
    }
    if (liters <= 0) continue;

    out.push({
      method: status,
      startId: start.id,
      endId: end.id,
      startOdometer: start.odometer,
      endOdometer: end.odometer,
      startDate: start.date,
      endDate: end.date,
      km,
      liters,
      cost,
      kmPerLiter: km / liters,
      litersFrom,
      litersTo,
    });
  }
  return out;
}

type Pick = { km: number; count: number; picks: FuelSegment[] };
const EMPTY: Pick = { km: 0, count: 0, picks: [] };

/** Trechos de consumo medidos, em ordem cronológica e sem sobreposição. */
export function computeFuelSegments(allFuelings: Fueling[]): FuelSegment[] {
  const fuelings = sortFuelings(allFuelings);
  // Ordenados pelo fim do intervalo de litros, como pede a programação dinâmica clássica
  // de "escalonamento de intervalos com peso": cada trecho ocupa [litersFrom, litersTo].
  const candidates = [...buildCandidates(fuelings, "full"), ...buildCandidates(fuelings, "reserve")].sort(
    (a, b) => a.litersTo - b.litersTo || a.litersFrom - b.litersFrom,
  );

  // Melhor conjunto sem sobreposição: mais km medidos; desempate: mais trechos.
  const best: Pick[] = [];
  candidates.forEach((cand, i) => {
    let p = -1;
    for (let j = 0; j < i; j++) {
      if (candidates[j]!.litersTo < cand.litersFrom) p = j;
    }
    const base = p >= 0 ? best[p]! : EMPTY;
    const withCand: Pick = { km: base.km + cand.km, count: base.count + 1, picks: [...base.picks, cand] };
    const without = i > 0 ? best[i - 1]! : EMPTY;
    best.push(better(withCand, without) ? withCand : without);
  });

  const result = best.length ? best[best.length - 1]!.picks : [];
  return [...result].sort((a, b) => a.startOdometer - b.startOdometer);
}

function better(a: { km: number; count: number }, b: { km: number; count: number }): boolean {
  return a.km > b.km || (a.km === b.km && a.count > b.count);
}

/** Trecho ainda sem ponto final: o que já rodou/abasteceu desde o último Cheio ou Reserva. */
export type OpenSegment = {
  method: "full" | "reserve";
  startDate: string;
  startOdometer: number;
  /** km rodados desde o ponto inicial (até o maior odômetro registrado). */
  kmSoFar: number;
  /** Litros que já entrariam no trecho se ele fechasse agora. */
  litersSoFar: number;
};

/**
 * Trecho em andamento a partir do último abastecimento Cheio/Reserva. Fecha quando
 * chegar o próximo abastecimento do mesmo tipo. Null se ainda não há nenhum ponto de medição.
 */
export function computeOpenSegment(allFuelings: Fueling[]): OpenSegment | null {
  const fuelings = sortFuelings(allFuelings);
  let anchor = -1;
  fuelings.forEach((f, i) => {
    if (f.tankStatus === "full" || f.tankStatus === "reserve") anchor = i;
  });
  if (anchor === -1) return null;

  const start = fuelings[anchor]!;
  const method = start.tankStatus as "full" | "reserve";
  // Cheio: os litros do próprio Cheio inicial não contam. Reserva: contam.
  const from = method === "full" ? anchor + 1 : anchor;
  let litersSoFar = 0;
  for (let j = from; j < fuelings.length; j++) litersSoFar += fuelings[j]!.liters;
  const lastOdometer = fuelings[fuelings.length - 1]!.odometer;

  return {
    method,
    startDate: start.date,
    startOdometer: start.odometer,
    kmSoFar: Math.max(0, lastOdometer - start.odometer),
    litersSoFar,
  };
}
