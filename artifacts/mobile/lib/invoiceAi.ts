import { completeWithFile } from "./openrouter";
import { parseInvoiceJson, type ExtractedInvoice } from "./invoiceImport";
import { buildInvoicePrompt } from "./invoicePrompt";
import type { Account, Category } from "./types";

/** Envia a fatura (PDF/imagem) para o modelo e devolve os lançamentos normalizados. */
export async function extractInvoice(opts: {
  apiKey: string;
  model: string;
  card: Account;
  categories: Category[];
  file: { dataUrl: string; mime: string; filename: string };
}): Promise<{ invoice: ExtractedInvoice; dropped: number }> {
  const text = await completeWithFile({
    apiKey: opts.apiKey,
    model: opts.model,
    prompt: buildInvoicePrompt(opts.card, opts.categories),
    file: opts.file,
  });
  return parseInvoiceJson(text);
}
