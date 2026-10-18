/** Arredonda para centavos, evitando resíduos de ponto flutuante (ex.: 0.1 + 0.2). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Soma valores monetários já arredondando o resultado para centavos. */
export function sumMoney(values: number[]): number {
  return roundMoney(values.reduce((s, v) => s + v, 0));
}
