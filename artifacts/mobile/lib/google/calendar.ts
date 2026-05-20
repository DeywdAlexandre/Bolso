import { googleFetch } from "./api";
import type { Shift } from "../types";

interface SyncCredentials {
  clientId?: string;
  clientSecret?: string;
}

/**
 * Cria ou recupera o calendário "Bolso - Escalas" no Google Calendar
 */
export async function ensureGoogleCalendar(
  credentials?: SyncCredentials
): Promise<string> {
  // 1. Listar os calendários do usuário
  const listUrl = "https://www.googleapis.com/calendar/v3/users/me/calendarList";
  const listResp = await googleFetch(listUrl, {}, credentials);

  if (!listResp.ok) {
    throw new Error(`Erro ao listar calendários: ${listResp.statusText}`);
  }

  const data = await listResp.json();
  const calendarName = "Bolso - Escalas";
  const existing = (data.items || []).find((c: any) => c.summary === calendarName);

  if (existing) {
    return existing.id;
  }

  // 2. Criar novo calendário se não existir
  const createUrl = "https://www.googleapis.com/calendar/v3/calendars";
  const createResp = await googleFetch(
    createUrl,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: calendarName,
        description: "Agenda de plantões e serviços integrada ao app Bolso.",
        timeZone: "America/Sao_Paulo",
      }),
    },
    credentials
  );

  if (!createResp.ok) {
    throw new Error(`Erro ao criar calendário no Google: ${createResp.statusText}`);
  }

  const newCalendar = await createResp.json();
  return newCalendar.id;
}

/**
 * Sanitiza o ID da escala para o formato exigido pelo Google Calendar (caracteres a-v, 0-9)
 */
function sanitizeEventId(shiftId: string): string {
  // O Google Calendar exige IDs contendo apenas letras minúsculas base32 e números
  // Nossos IDs são como "sh_xxxx" ou hexadecimais, vamos remover caracteres inválidos
  return shiftId.toLowerCase().replace(/[^a-v0-9]/g, "") + "bolsosync";
}

/**
 * Sincroniza uma lista de plantões com o Google Calendar (Upsert)
 */
export async function syncShiftsToCalendar(
  calendarId: string,
  shifts: Shift[],
  credentials?: SyncCredentials
): Promise<void> {
  for (const shift of shifts) {
    const eventId = sanitizeEventId(shift.id);

    // Formatar data e hora
    const startIso = `${shift.date}T${shift.startTime}:00`;
    const endIso = `${shift.date}T${shift.endTime}:00`;

    const isExtra = shift.type === "extra";
    const summary = `${isExtra ? "⚡ Extra" : "📅 Ordinário"}: ${shift.name}`;
    const description = isExtra
      ? `Plantão Extra remunerado.\nValor estimado: R$ ${shift.value || 0}\nStatus: ${shift.isPaid ? "Recebido" : "Pendente"}`
      : `Plantão Ordinário fixo de escala.`;

    const eventPayload = {
      id: eventId,
      summary,
      description,
      start: {
        dateTime: startIso,
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: endIso,
        timeZone: "America/Sao_Paulo",
      },
      colorId: isExtra ? "10" : "1", // 10 é verde, 1 é azul no Google Calendar
    };

    // Tenta atualizar (PUT), se não existir cria (POST)
    const updateUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`;
    const updateResp = await googleFetch(
      updateUrl,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventPayload),
      },
      credentials
    );

    if (!updateResp.ok) {
      // Se deu 404 (não existe), cria usando POST
      if (updateResp.status === 404) {
        const createUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
        const createResp = await googleFetch(
          createUrl,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(eventPayload),
          },
          credentials
        );

        if (!createResp.ok) {
          console.warn(`Erro ao criar evento ${shift.id} no Google Calendar:`, createResp.statusText);
        }
      } else {
        console.warn(`Erro ao atualizar evento ${shift.id} no Google Calendar:`, updateResp.statusText);
      }
    }
  }
}
