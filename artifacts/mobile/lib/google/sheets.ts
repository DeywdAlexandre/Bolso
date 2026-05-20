import { googleFetch } from "./api";

// Definição das Abas e suas colunas (Headers)
const SHEETS_CONFIG = {
  transactions: ["id", "type", "amount", "categoryId", "description", "date", "recurringId", "createdAt", "updatedAt"],
  shifts: ["id", "ruleId", "name", "type", "value", "date", "startTime", "endTime", "isPaid", "transactionId", "createdAt", "updatedAt"],
  shiftRules: ["id", "name", "type", "value", "recurrenceType", "workHours", "offHours", "startDate", "weekDays", "startTime", "endTime", "color", "createdAt", "updatedAt"],
  shiftTemplates: ["id", "name", "type", "value", "startTime", "endTime", "color", "createdAt", "updatedAt"],
  recurring: ["id", "type", "amount", "categoryId", "description", "dayOfMonth", "active", "isSubscription", "lastApplied", "createdAt", "updatedAt"],
  categories: ["id", "name", "icon", "type", "color", "isDefault", "updatedAt"],
  vehicles: ["id", "brand", "model", "plate", "year", "color", "createdAt", "updatedAt"],
  fuelings: ["id", "vehicleId", "amount", "liters", "odometer", "tankStatus", "date", "createdAt", "updatedAt"],
  oilChanges: ["id", "vehicleId", "odometer", "nextChangeOdometer", "date", "createdAt", "updatedAt"],
  vehicleExpenses: ["id", "vehicleId", "description", "amount", "odometer", "date", "transactionId", "createdAt", "updatedAt"],
  loanContacts: ["id", "name", "phone", "email", "createdAt", "updatedAt"],
  loans: ["id", "contactId", "type", "principalAmount", "interestRate", "startDate", "installmentsCount", "description", "status", "initialTransactionId", "createdAt", "updatedAt"],
  loanPayments: ["id", "loanId", "amount", "principalPaid", "interestPaid", "date", "transactionId", "createdAt", "updatedAt"],
  goals: ["id", "name", "targetAmount", "monthlyAmount", "estimatedYield", "currentAmount", "isYielding", "color", "icon", "lastInterestAccrual", "createdAt", "updatedAt"],
  goalDeposits: ["id", "goalId", "amount", "type", "date", "transactionId", "createdAt", "updatedAt"],
} as const;

type SheetName = keyof typeof SHEETS_CONFIG;

interface SyncCredentials {
  clientId?: string;
  clientSecret?: string;
}

/**
 * Cria as abas que não existem na planilha do usuário
 */
export async function ensureSpreadsheetTabs(
  spreadsheetId: string,
  credentials?: SyncCredentials
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const response = await googleFetch(url, {}, credentials);

  if (!response.ok) {
    throw new Error(`Erro ao ler metadados da planilha: ${response.statusText}`);
  }

  const data = await response.json();
  const existingTitles = new Set<string>(
    (data.sheets || []).map((s: any) => s.properties?.title).filter(Boolean)
  );

  const sheetsToCreate = Object.keys(SHEETS_CONFIG).filter(
    (title) => !existingTitles.has(title)
  );

  if (sheetsToCreate.length === 0) return;

  // Criar abas via batchUpdate
  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const requests = sheetsToCreate.map((title) => ({
    addSheet: {
      properties: { title },
    },
  }));

  const createResp = await googleFetch(
    batchUrl,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    },
    credentials
  );

  if (!createResp.ok) {
    throw new Error(`Erro ao criar abas na planilha: ${createResp.statusText}`);
  }

  // Gravar os cabeçalhos nas novas abas
  for (const sheetName of sheetsToCreate as SheetName[]) {
    await writeHeaders(spreadsheetId, sheetName, credentials);
  }
}

/**
 * Grava o cabeçalho padrão de uma aba
 */
async function writeHeaders(
  spreadsheetId: string,
  sheetName: SheetName,
  credentials?: SyncCredentials
): Promise<void> {
  const headers = SHEETS_CONFIG[sheetName];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:Z1?valueInputOption=RAW`;
  
  await googleFetch(
    url,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        values: [headers],
      }),
    },
    credentials
  );
}

/**
 * Lê os dados de uma aba e mapeia para objetos JSON tipados
 */
export async function readSheetData<T extends { id: string; updatedAt?: string }>(
  spreadsheetId: string,
  sheetName: SheetName,
  credentials?: SyncCredentials
): Promise<T[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:Z`;
  const response = await googleFetch(url, {}, credentials);

  if (!response.ok) {
    // Se a aba não existe ou está vazia, retorna array vazio
    return [];
  }

  const data = await response.json();
  const rows = data.values as string[][] | undefined;
  if (!rows || rows.length <= 1) return []; // Apenas cabeçalho ou vazio

  const headers = rows[0];
  const items: T[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const item: any = {};
    
    headers.forEach((header, colIdx) => {
      const val = row[colIdx];
      if (val === undefined || val === null || val === "") {
        item[header] = undefined;
      } else if (val === "true" || val === "false") {
        item[header] = val === "true";
      } else if (!isNaN(Number(val)) && val.trim() !== "" && header !== "id" && header !== "plate" && !header.endsWith("Id") && !header.endsWith("Time") && !header.endsWith("Date") && header !== "date" && header !== "createdAt" && header !== "updatedAt") {
        item[header] = Number(val);
      } else if (header === "weekDays") {
        try {
          item[header] = JSON.parse(val);
        } catch {
          item[header] = [];
        }
      } else {
        item[header] = val;
      }
    });

    if (item.id) {
      items.push(item as T);
    }
  }

  return items;
}

/**
 * Grava toda a coleção local de dados na aba correspondente do Google Sheets
 */
export async function writeSheetData<T extends Record<string, any>>(
  spreadsheetId: string,
  sheetName: SheetName,
  data: T[],
  credentials?: SyncCredentials
): Promise<void> {
  const headers = SHEETS_CONFIG[sheetName] as readonly string[];
  const values: (readonly string[])[] = [headers];

  data.forEach((item) => {
    const row = headers.map((header) => {
      const val = item[header];
      if (val === undefined || val === null) return "";
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    });
    values.push(row);
  });

  // Limpa a aba antes de escrever para evitar restos de linhas antigas
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:Z:clear`;
  await googleFetch(clearUrl, { method: "POST" }, credentials);

  // Escreve os novos dados
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1?valueInputOption=RAW`;
  const response = await googleFetch(
    writeUrl,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    },
    credentials
  );

  if (!response.ok) {
    throw new Error(`Erro ao escrever dados na aba ${sheetName}: ${response.statusText}`);
  }
}

/**
 * Executa a reconciliação bidirecional incremental para uma entidade
 */
export function reconcileData<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  localList: T[],
  remoteList: T[]
): {
  merged: T[];
  hasChanges: boolean;
} {
  const localMap = new Map<string, T>(localList.map((item) => [item.id, item]));
  const remoteMap = new Map<string, T>(remoteList.map((item) => [item.id, item]));

  const allIds = new Set<string>([...localMap.keys(), ...remoteMap.keys()]);
  const mergedList: T[] = [];
  let hasChanges = false;

  allIds.forEach((id) => {
    const local = localMap.get(id);
    const remote = remoteMap.get(id);

    if (local && !remote) {
      // Existe apenas localmente -> mantemos e precisamos subir pro Sheets
      mergedList.push(local);
      hasChanges = true;
    } else if (!local && remote) {
      // Existe apenas remotamente -> mantemos localmente (baixado do Sheets)
      mergedList.push(remote);
      hasChanges = true;
    } else if (local && remote) {
      // Existe em ambos -> comparar updatedAt
      const localUpdate = local.updatedAt || local.createdAt || "";
      const remoteUpdate = remote.updatedAt || remote.createdAt || "";

      if (localUpdate > remoteUpdate) {
        mergedList.push(local);
        hasChanges = true;
      } else if (remoteUpdate > localUpdate) {
        mergedList.push(remote);
        hasChanges = true;
      } else {
        mergedList.push(local);
      }
    }
  });

  return {
    merged: mergedList,
    hasChanges,
  };
}
