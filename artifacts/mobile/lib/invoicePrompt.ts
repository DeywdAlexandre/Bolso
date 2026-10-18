import type { Account, Category } from "./types";

/** Instruções para o modelo ler a fatura e devolver só JSON. */
export function buildInvoicePrompt(card: Pick<Account, "name" | "closingDay" | "dueDay">, categories: Category[]): string {
  const names = categories.filter((c) => c.type === "expense").map((c) => c.name).join(", ");
  return `Você lê faturas de cartão de crédito brasileiras. Leia o arquivo anexo (fatura do cartão "${card.name}") e responda SOMENTE com um JSON, sem texto antes ou depois, neste formato:

{
  "closingDate": "YYYY-MM-DD" ou null,   // data de fechamento da fatura
  "dueDate": "YYYY-MM-DD" ou null,       // data de vencimento
  "total": número ou null,               // valor total a pagar da fatura
  "items": [
    {
      "date": "YYYY-MM-DD",              // data da compra como impressa na fatura (infira o ano pelo período da fatura)
      "description": "texto do estabelecimento, sem o número da parcela",
      "amount": número,                  // positivo para compras e cobranças; NEGATIVO para estornos, créditos e pagamentos
      "installment": { "index": 3, "total": 12 } ou null,   // só se a linha indicar parcela (ex.: "Parcela 03/12", "3/12")
      "category": uma das categorias abaixo, ou null
    }
  ]
}

Regras:
- Use ponto como separador decimal e números sem símbolo de moeda (ex.: 1234.56).
- Inclua TODAS as linhas de compras, parcelas, tarifas, anuidade, juros, multas e IOF como itens positivos.
- Inclua estornos/créditos como itens negativos. Inclua "pagamento recebido" da fatura anterior como item negativo.
- NÃO inclua linhas de resumo (subtotal, total da fatura, limite, pagamento mínimo, encargos projetados).
- Em compra parcelada, "amount" é o valor da parcela desta fatura (não o total da compra).
- Categorias disponíveis: ${names}.
- Se um campo não aparecer, use null. Não invente dados.
- O cartão fecha no dia ${card.closingDay ?? "?"} e vence no dia ${card.dueDay ?? "?"} (use só como dica).`;
}
