import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useAppData } from "@/contexts/AppDataContext";
import { useSettings } from "@/contexts/SettingsContext";
import { AI_TOOLS, buildToolHandlers, SYSTEM_PROMPT, type ToolDeps } from "@/lib/aiTools";
import { genId } from "@/lib/format";
import { chatCompletion, OpenRouterError } from "@/lib/openrouter";
import { loadJson, saveJson, STORAGE_KEYS } from "@/lib/storage";
import type { ChatMessage, ToolCall } from "@/lib/types";

type ChatContextValue = {
  messages: ChatMessage[];
  sending: boolean;
  isOpen: boolean;
  unread: number;
  open: () => void;
  close: () => void;
  send: (text: string) => Promise<void>;
  clear: () => Promise<void>;
};

const ChatContext = createContext<ChatContextValue | null>(null);

const MAX_HISTORY = 50;
const MAX_TOOL_ROUNDS = 4;

type AppData = ReturnType<typeof useAppData>;

function toToolDeps(data: AppData, defaultAccountId?: string): ToolDeps {
  return {
    accounts: data.accounts,
    balances: data.balances,
    addTransfer: data.addTransfer,
    transfers: data.transfers,
    defaultAccountId,
    transactions: data.transactions,
    categories: data.categories,
    recurring: data.recurring,
    addTransactionRaw: data.addTransactionRaw,
    addTransaction: data.addTransaction,
    removeTransaction: data.removeTransaction,
    addRecurring: data.addRecurringRaw,
    loanContacts: data.loanContacts,
    loans: data.loans,
    loanPayments: data.loanPayments,
    addLoanContact: data.addLoanContact,
    addLoan: data.addLoan,
    addLoanPayment: data.addLoanPayment,
    vehicles: data.vehicles,
    fuelings: data.fuelings,
    oilChanges: data.oilChanges,
    addFueling: data.addFueling,
    addOilChange: data.addOilChange,
    goals: data.goals,
    goalDeposits: data.goalDeposits,
    addGoalDeposit: data.addGoalDeposit,
    vehicleExpenses: data.vehicleExpenses,
    addVehicleExpense: data.addVehicleExpense,
    shifts: data.shifts,
    shiftRules: data.shiftRules,
    addShift: data.addShift,
    updateShift: data.updateShift,
    addShiftRule: data.addShiftRule,
    generateShiftsFromRule: data.generateShiftsFromRule,
  };
}

// O corte do histórico pode deixar uma resposta de ferramenta (ou a chamada
// que a originou) no início, sem o par correspondente, e a API rejeita isso.
// Começar sempre numa mensagem do usuário evita o problema.
function trimToFirstUserMessage(list: ChatMessage[]): ChatMessage[] {
  const first = list.findIndex((m) => m.role === "user");
  return first === -1 ? [] : list.slice(first);
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { settings, apiKey } = useSettings();
  const data = useAppData();
  // Sempre o estado mais recente, para que cada rodada de ferramentas enxergue
  // o que a rodada anterior acabou de gravar.
  const dataRef = useRef(data);
  dataRef.current = data;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadJson<ChatMessage[]>(STORAGE_KEYS.chat, []);
      if (cancelled) return;
      setMessages(trimToFirstUserMessage(stored));
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveJson(STORAGE_KEYS.chat, trimToFirstUserMessage(messages.slice(-MAX_HISTORY)));
  }, [messages, hydrated]);

  const open = useCallback(() => {
    setIsOpen(true);
    setUnread(0);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  const clear = useCallback(async () => {
    setMessages([]);
    await saveJson(STORAGE_KEYS.chat, []);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      const userMsg: ChatMessage = {
        id: genId(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);

      if (!apiKey) {
        const errMsg: ChatMessage = {
          id: genId(),
          role: "assistant",
          content:
            "Você precisa configurar a chave do OpenRouter nas Configurações antes de conversar comigo.",
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
        if (!isOpen) setUnread((u) => u + 1);
        return;
      }

      setSending(true);

      const systemMsg: ChatMessage = {
        id: "system",
        role: "system",
        content: SYSTEM_PROMPT,
        createdAt: 0,
      };

      let conversation: ChatMessage[] = [systemMsg, ...trimToFirstUserMessage(messages.slice(-MAX_HISTORY)), userMsg];

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const result = await chatCompletion({
            apiKey,
            model: settings.model,
            messages: conversation,
            tools: AI_TOOLS,
          });

          const toolCalls = result.toolCalls ?? [];

          if (toolCalls.length === 0) {
            const assistantMsg: ChatMessage = {
              id: genId(),
              role: "assistant",
              content: result.content || "...",
              createdAt: Date.now(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
            if (!isOpen) setUnread((u) => u + 1);
            break;
          }

          const assistantToolMsg: ChatMessage = {
            id: genId(),
            role: "assistant",
            content: result.content || "",
            toolCalls,
            createdAt: Date.now(),
          };
          setMessages((prev) => [...prev, assistantToolMsg]);
          conversation = [...conversation, assistantToolMsg];

          const handlers = buildToolHandlers(toToolDeps(dataRef.current, settingsRef.current.defaultAccountId));
          const toolResults: ChatMessage[] = [];
          for (const call of toolCalls) {
            const out = await runTool(call, handlers);
            const toolMsg: ChatMessage = {
              id: genId(),
              role: "tool",
              content: JSON.stringify(out),
              toolCallId: call.id,
              name: call.function.name,
              createdAt: Date.now(),
            };
            toolResults.push(toolMsg);
          }
          setMessages((prev) => [...prev, ...toolResults]);
          conversation = [...conversation, ...toolResults];

          if (round === MAX_TOOL_ROUNDS - 1) {
            const final: ChatMessage = {
              id: genId(),
              role: "assistant",
              content: "Operações concluídas.",
              createdAt: Date.now(),
            };
            setMessages((prev) => [...prev, final]);
            if (!isOpen) setUnread((u) => u + 1);
          }
        }
      } catch (err) {
        const errorText =
          err instanceof OpenRouterError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Erro desconhecido.";
        const errMsg: ChatMessage = {
          id: genId(),
          role: "assistant",
          content: `Não consegui responder: ${errorText}`,
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
        if (!isOpen) setUnread((u) => u + 1);
      } finally {
        setSending(false);
      }
    },
    [apiKey, isOpen, messages, sending, settings.model],
  );

  const value = useMemo<ChatContextValue>(
    () => ({ messages, sending, isOpen, unread, open, close, send, clear }),
    [messages, sending, isOpen, unread, open, close, send, clear],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

async function runTool(
  call: ToolCall,
  handlers: ReturnType<typeof buildToolHandlers>,
): Promise<unknown> {
  let args: Record<string, unknown> = {};
  try {
    args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
  } catch {
    return { ok: false, error: "Argumentos JSON inválidos" };
  }
  try {
    switch (call.function.name) {
      case "add_transaction":
        return await handlers.addTransaction(args as Parameters<typeof handlers.addTransaction>[0]);
      case "get_card_invoice":
        return await handlers.getCardInvoice(args as Parameters<typeof handlers.getCardInvoice>[0]);
      case "transfer_between_accounts":
        return await handlers.transferBetweenAccounts(args as Parameters<typeof handlers.transferBetweenAccounts>[0]);
      case "list_accounts":
        return await handlers.listAccounts();
      case "list_transactions":
        return await handlers.listTransactions(args as Parameters<typeof handlers.listTransactions>[0]);
      case "get_summary":
        return await handlers.getSummary(args as Parameters<typeof handlers.getSummary>[0]);
      case "get_categories":
        return await handlers.getCategories();
      case "add_recurring":
        return await handlers.addRecurring(args as Parameters<typeof handlers.addRecurring>[0]);
      case "delete_transaction":
        return await handlers.deleteTransaction(args as Parameters<typeof handlers.deleteTransaction>[0]);
      case "add_loan_contact":
        return await handlers.addLoanContact(args as Parameters<typeof handlers.addLoanContact>[0]);
      case "list_loan_contacts":
        return await handlers.listLoanContacts();
      case "add_loan":
        return await handlers.addLoan(args as Parameters<typeof handlers.addLoan>[0]);
      case "list_loans":
        return await handlers.listLoans(args as Parameters<typeof handlers.listLoans>[0]);
      case "add_loan_payment":
        return await handlers.addLoanPayment(args as Parameters<typeof handlers.addLoanPayment>[0]);
      case "list_vehicles":
        return await handlers.listVehicles();
      case "add_fueling":
        return await handlers.addFueling(args as Parameters<typeof handlers.addFueling>[0]);
      case "add_oil_change":
        return await handlers.addOilChange(args as Parameters<typeof handlers.addOilChange>[0]);
      case "get_vehicle_stats":
        return await handlers.getVehicleStats(args as Parameters<typeof handlers.getVehicleStats>[0]);
      case "add_vehicle_expense":
        return await handlers.addVehicleExpense(args as Parameters<typeof handlers.addVehicleExpense>[0]);
      case "list_goals":
        return await handlers.listGoals();
      case "add_goal_deposit":
        return await handlers.addGoalDeposit(args as Parameters<typeof handlers.addGoalDeposit>[0]);
      case "generate_loan_report":
        return await handlers.generateLoanReport(args as Parameters<typeof handlers.generateLoanReport>[0]);
      case "list_shifts":
        return await handlers.list_shifts(args as any);
      case "add_shift_rule":
        return await handlers.add_shift_rule(args as any);
      case "add_shift_single":
        return await handlers.add_shift_single(args as any);
      case "toggle_shift_paid":
        return await handlers.toggle_shift_paid(args as any);
      case "get_morning_briefing":
        return await handlers.get_morning_briefing();
      default:
        return { ok: false, error: `Ferramenta desconhecida: ${call.function.name}` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro" };
  }
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
