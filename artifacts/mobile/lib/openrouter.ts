import { fetch } from "expo/fetch";

import { describeOpenRouterError } from "./models";
import type { ChatMessage, ToolCall } from "./types";

export { DEFAULT_MODEL, SUGGESTED_MODELS } from "./models";

type OpenRouterMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
};

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ChatCompletionResult = {
  content: string;
  toolCalls: ToolCall[];
  raw: unknown;
};

export class OpenRouterError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

function toApiMessages(messages: ChatMessage[]): OpenRouterMessage[] {
  return messages.map((m) => {
    const base: OpenRouterMessage = {
      role: m.role,
      content: m.content || (m.toolCalls && m.toolCalls.length > 0 ? null : ""),
    };
    if (m.toolCalls && m.toolCalls.length > 0) base.tool_calls = m.toolCalls;
    if (m.toolCallId) base.tool_call_id = m.toolCallId;
    if (m.name) base.name = m.name;
    return base;
  });
}

/** POST em /chat/completions com cabeçalhos e tratamento de erros em português. */
async function postChat(apiKey: string, body: Record<string, unknown>, model: string): Promise<Response> {
  let response: Response;
  try {
    response = (await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Title": "Prisma",
      },
      body: JSON.stringify(body),
    })) as unknown as Response;
  } catch (err) {
    throw new OpenRouterError(
      err instanceof Error ? err.message : "Erro de rede ao contactar OpenRouter.",
    );
  }

  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      // ignore
    }
    throw new OpenRouterError(describeOpenRouterError(response.status, model, detail), response.status);
  }
  return response;
}

export async function chatCompletion(params: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
}): Promise<ChatCompletionResult> {
  const { apiKey, model, messages, tools } = params;

  if (!apiKey) {
    throw new OpenRouterError("Chave da API do OpenRouter não configurada.");
  }

  const body: Record<string, unknown> = {
    model,
    messages: toApiMessages(messages),
    temperature: 0.7,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await postChat(apiKey, body, model);

  const data = (await response.json()) as {
    choices?: {
      message?: {
        content?: string | null;
        tool_calls?: ToolCall[] | null;
      };
    }[];
  };

  const message = data.choices?.[0]?.message;
  return {
    content: (message?.content ?? "").toString(),
    toolCalls: message?.tool_calls ?? [],
    raw: data,
  };
}

export async function listModels(apiKey: string): Promise<{ id: string; name?: string }[]> {
  if (!apiKey) return [];
  try {
    const res = (await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    })) as unknown as Response;
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { id: string; name?: string }[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Pede ao modelo uma resposta em texto para uma mensagem com um arquivo anexo (PDF ou imagem).
 * `dataUrl` é o arquivo em base64 (data:<mime>;base64,...).
 */
export async function completeWithFile(params: {
  apiKey: string;
  model: string;
  prompt: string;
  file: { dataUrl: string; mime: string; filename: string };
  maxTokens?: number;
}): Promise<string> {
  const { apiKey, model, prompt, file, maxTokens = 8000 } = params;
  if (!apiKey) throw new OpenRouterError("Chave da API do OpenRouter não configurada.");

  const attachment =
    file.mime === "application/pdf"
      ? { type: "file", file: { filename: file.filename, file_data: file.dataUrl } }
      : { type: "image_url", image_url: { url: file.dataUrl } };

  const response = await postChat(
    apiKey,
    {
      model,
      temperature: 0,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: [{ type: "text", text: prompt }, attachment] }],
    },
    model,
  );
  const data = (await response.json()) as { choices?: { message?: { content?: string | null } }[] };
  return (data.choices?.[0]?.message?.content ?? "").toString();
}
