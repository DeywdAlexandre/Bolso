import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

/** Lê um arquivo escolhido (web ou celular) como data URL em base64. */
export async function readFileAsDataUrl(uri: string, mime: string): Promise<string> {
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error("Não foi possível ler o arquivo."));
      reader.readAsDataURL(blob);
    });
  }
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return `data:${mime};base64,${base64}`;
}

/** Tipo MIME do arquivo escolhido (o seletor às vezes não informa). */
export function guessMime(name: string, mime?: string | null): string {
  if (mime && mime !== "application/octet-stream") return mime;
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}
