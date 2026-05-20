import * as SecureStore from "expo-secure-store";

const SECURE_KEYS = {
  accessToken: "bolso.google.access_token",
  refreshToken: "bolso.google.refresh_token",
};

export async function saveGoogleTokens(accessToken: string, refreshToken?: string) {
  await SecureStore.setItemAsync(SECURE_KEYS.accessToken, accessToken);
  if (refreshToken) {
    await SecureStore.setItemAsync(SECURE_KEYS.refreshToken, refreshToken);
  }
}

export async function getGoogleAccessToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(SECURE_KEYS.accessToken);
}

export async function getGoogleRefreshToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(SECURE_KEYS.refreshToken);
}

export async function clearGoogleTokens() {
  await SecureStore.deleteItemAsync(SECURE_KEYS.accessToken);
  await SecureStore.deleteItemAsync(SECURE_KEYS.refreshToken);
}

/**
 * Renova o access token usando o refresh token salvo
 */
export async function refreshGoogleToken(clientId: string, clientSecret: string): Promise<string | null> {
  const refreshToken = await getGoogleRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });

    if (!response.ok) {
      throw new Error("Erro ao renovar token do Google");
    }

    const data = await response.json();
    if (data.access_token) {
      await saveGoogleTokens(data.access_token);
      return data.access_token;
    }
  } catch (error) {
    console.error("Erro no refreshGoogleToken:", error);
  }
  return null;
}

/**
 * Wrapper para chamadas fetch autenticadas com renovação automática de token
 */
export async function googleFetch(
  url: string,
  options: RequestInit = {},
  credentials?: { clientId?: string; clientSecret?: string }
): Promise<Response> {
  let token = await getGoogleAccessToken();
  if (!token) {
    throw new Error("Usuário não autenticado no Google");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  
  let response = await fetch(url, { ...options, headers });

  // Se o token estiver expirado (401) e tivermos credenciais para atualizar
  if (response.status === 401 && credentials?.clientId && credentials?.clientSecret) {
    console.log("Token expirado, tentando renovar com o Refresh Token...");
    const newToken = await refreshGoogleToken(credentials.clientId, credentials.clientSecret);
    
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      response = await fetch(url, { ...options, headers });
    }
  }

  return response;
}
