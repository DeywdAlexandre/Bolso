export const DEFAULT_MODEL = "anthropic/claude-haiku-5.5";

/** Padrão anterior do app. Quem nunca trocou de modelo é migrado para o novo padrão. */
const LEGACY_DEFAULT_MODEL = "openai/gpt-4o-mini";

export const SUGGESTED_MODELS: { value: string; label: string; hint: string }[] = [
  { value: DEFAULT_MODEL, label: "Claude Haiku 5.5", hint: "Padrão · Rápido e preciso com ferramentas" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o mini", hint: "Econômico" },
  { value: "deepseek/deepseek-chat", label: "DeepSeek V3", hint: "Ultra eficiente" },
];

/** Troca o padrão antigo pelo novo; qualquer escolha do usuário é preservada. */
export function migrateModel(model: string | undefined): string {
  if (!model || model === LEGACY_DEFAULT_MODEL) return DEFAULT_MODEL;
  return model;
}

/** Mensagem em português para erros comuns do OpenRouter. */
export function describeOpenRouterError(status: number, model: string, detail: string): string {
  switch (status) {
    case 401:
      return "Chave do OpenRouter inválida. Confira a chave em Configurações.";
    case 402:
      return "Créditos insuficientes no OpenRouter. Adicione créditos ou escolha um modelo mais barato.";
    case 404:
      return `O modelo "${model}" não foi encontrado no OpenRouter. Escolha outro em Configurações → Modelo de IA.`;
    case 429:
      return "Muitas requisições ao OpenRouter. Aguarde alguns segundos e tente de novo.";
    default:
      return `OpenRouter retornou ${status}. ${detail}`.trim();
  }
}
