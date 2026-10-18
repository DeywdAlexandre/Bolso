import { findAccount } from "../../accounts";
import { computeCardSummary } from "../../cards";
import { formatDate, toIsoDay } from "../../format";
import type { Account, Category, Transaction, Transfer } from "../../types";
import type { CardInvoiceArgs } from "../toolTypes";

const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildCardHandlers(deps: {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  transfers: Transfer[];
}) {
  const cards = () => deps.accounts.filter((a) => a.kind === "card" && !a.archived);
  const today = () => toIsoDay(new Date());

  return {
    /** Resumo de todos os cartões ativos (usado também por list_accounts). */
    summarizeCards() {
      return cards().map((card) => {
        const s = computeCardSummary(card, deps.transactions, deps.transfers, today());
        return {
          name: card.name,
          debt: Math.max(0, s.debt),
          currentInvoice: s.current
            ? { month: s.current.key, total: s.current.total, closes: formatDate(s.current.closingDate), due: formatDate(s.current.dueDate) }
            : null,
          closedToPay: s.overdueOrClosed,
          futureInvoicesTotal: s.futureTotal,
          creditLimit: card.creditLimit ?? null,
          limitAvailable: s.limitAvailable,
          pendingInstallments: s.groups.map((g) => ({
            description: g.description,
            remaining: g.remaining,
            of: g.total,
            installmentAmount: g.installmentAmount,
            remainingAmount: g.remainingAmount,
          })),
        };
      });
    },

    async getCardInvoice(args: CardInvoiceArgs) {
      const card = findAccount(cards(), args?.card);
      if (!card) {
        const names = cards().map((c) => c.name).join(", ") || "nenhum cartão cadastrado";
        return { ok: false, error: `Cartão "${args?.card}" não encontrado. Cartões: ${names}.` };
      }
      const s = computeCardSummary(card, deps.transactions, deps.transfers, today());
      const invoice = args.month ? s.invoices.find((i) => i.key === args.month) : s.current ?? s.invoices[s.invoices.length - 1];
      if (!invoice) {
        return {
          ok: true,
          card: card.name,
          invoice: null,
          note: args.month ? `Não há fatura de ${args.month} neste cartão.` : "Este cartão ainda não tem compras.",
        };
      }
      return {
        ok: true,
        card: card.name,
        invoice: {
          month: invoice.key,
          status: invoice.status,
          total: invoice.total,
          paid: invoice.paid,
          remaining: invoice.remaining,
          closes: formatDate(invoice.closingDate),
          due: formatDate(invoice.dueDate),
          items: invoice.items.map((t) => ({
            date: formatDate(t.date),
            description: t.description,
            amount: round2(t.signed),
            category: deps.categories.find((c) => c.id === t.categoryId)?.name ?? "?",
            installment: t.installmentIndex ? `${t.installmentIndex}/${t.installmentTotal}` : undefined,
          })),
        },
        availableMonths: s.invoices.map((i) => i.key),
        pendingInstallments: s.groups.map((g) => ({ description: g.description, remaining: g.remaining, of: g.total, remainingAmount: g.remainingAmount })),
        limitAvailable: s.limitAvailable,
      };
    },
  };
}
