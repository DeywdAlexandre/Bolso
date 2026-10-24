import { Alert, Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

const OPTIONS = { allowsEditing: true, aspect: [4, 3] as [number, number], quality: 0.5 };

/** O seletor devolve um arquivo de cache; copia para a pasta do app para a foto não sumir. */
async function keep(uri: string): Promise<string> {
  const dir = FileSystem.documentDirectory;
  if (!dir) return uri;
  const ext = uri.split(".").pop()?.split("?")[0] || "jpg";
  const dest = `${dir}vehicle_${Date.now()}.${ext}`;
  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

/** Escolhe a foto na galeria ou na câmera; devolve o caminho salvo, ou undefined se cancelar. */
export async function pickVehiclePhoto(source: "gallery" | "camera"): Promise<string | undefined> {
  // Na web (PWA) o arquivo não persiste: guarda a imagem embutida (base64).
  const web = Platform.OS === "web";
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permissão negada", "Precisamos de acesso à câmera para tirar fotos.");
      return undefined;
    }
  }
  const opts = { ...OPTIONS, base64: web };
  const result =
    source === "gallery"
      ? await ImagePicker.launchImageLibraryAsync({ ...opts, mediaTypes: ["images"] })
      : await ImagePicker.launchCameraAsync(opts);
  if (result.canceled) return undefined;
  const asset = result.assets[0]!;
  if (web && asset.base64) return `data:image/jpeg;base64,${asset.base64}`;
  return keep(asset.uri);
}
