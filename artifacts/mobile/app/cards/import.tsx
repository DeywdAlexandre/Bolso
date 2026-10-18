import React, { useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";

import { useAppData } from "@/contexts/AppDataContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { guessMime, readFileAsDataUrl } from "@/lib/fileData";
import { formatCurrency, formatDate, getMonthName } from "@/lib/format";
import { extractInvoice } from "@/lib/invoiceAi";
import { InvoiceParseError, planInvoiceImport, type ImportPlan } from "@/lib/invoiceImport";
import { OpenRouterError } from "@/lib/openrouter";

type Phase = "idle" | "reading" | "review" | "done";

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return `${getMonthName(m! - 1)} ${y}`;
};

export default function ImportInvoiceScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accounts, transactions, categories, addTransaction } = useAppData();
  const { apiKey, settings } = useSettings();
  const card = accounts.find((a) => a.id === id && a.kind === "card");

  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [dropped, setDropped] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [imported, setImported] = useState(0);

  const chosen = useMemo(() => (plan ? plan.toCreate.filter((_, i) => selected.has(i)) : []), [plan, selected]);

  if (!card) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Cartão não encontrado.</Text>
      </View>
    );
  }

  const pickAndRead = async () => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0]!;
    const mime = guessMime(asset.name, asset.mimeType);
    setFileName(asset.name);
    setPhase("reading");
    try {
      const dataUrl = await readFileAsDataUrl(asset.uri, mime);
      const { invoice, dropped: bad } = await extractInvoice({
        apiKey: apiKey ?? "",
        model: settings.model,
        card,
        categories,
        file: { dataUrl, mime, filename: asset.name },
      });
      const next = planInvoiceImport({ card, existing: transactions, invoice, categories });
      setPlan(next);
      setDropped(bad);
      setSelected(new Set(next.toCreate.map((_, i) => i)));
      setPhase("review");
    } catch (err) {
      setError(
        err instanceof InvoiceParseError || err instanceof OpenRouterError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Não foi possível ler a fatura.",
      );
      setPhase("idle");
    }
  };

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const confirm = async () => {
    for (const p of chosen) await addTransaction(p.tx, { useDefaultAccount: false });
    setImported(chosen.length);
    setPhase("done");
  };

  return (
    <>
      <Stack.Screen options={{ title: "Importar fatura" }} />
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
        {phase === "idle" && (
          <>
            <Text style={[styles.intro, { color: colors.mutedForeground }]}>
              Envie a fatura do cartão {card.name} (PDF ou foto/captura de tela). A IA lê os lançamentos, as parcelas e as
              datas; você revisa antes de importar. Compras que você já lançou não são repetidas, e as parcelas que ainda
              faltam entram nas próximas faturas.
            </Text>
            {!apiKey && (
              <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                  Configure a chave do OpenRouter para usar a leitura por IA.
                </Text>
                <Pressable onPress={() => router.push("/settings")}>
                  <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Abrir Configurações</Text>
                </Pressable>
              </View>
            )}
            {error && (
              <View style={[styles.notice, { backgroundColor: colors.expense + "15", borderColor: colors.expense + "55" }]}>
                <Text style={{ color: colors.expense, fontFamily: "Inter_500Medium", fontSize: 13 }}>{error}</Text>
              </View>
            )}
            <Pressable
              onPress={pickAndRead}
              disabled={!apiKey}
              style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: !apiKey ? 0.4 : pressed ? 0.85 : 1 }]}
            >
              <Feather name="upload" size={18} color={colors.primaryForeground} />
              <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>Escolher fatura (PDF ou imagem)</Text>
            </Pressable>
            {Platform.OS !== "web" && (
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                O arquivo é enviado ao OpenRouter para leitura e não fica salvo no app.
              </Text>
            )}
          </>
        )}

        {phase === "reading" && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.reading, { color: colors.foreground }]}>Lendo a fatura…</Text>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>{fileName}</Text>
          </View>
        )}

        {phase === "review" && plan && (
          <>
            <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Fatura de {monthLabel(plan.invoiceKey)}</Text>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                {plan.statementTotal !== undefined ? `Total da fatura ${formatCurrency(plan.statementTotal)} · ` : ""}
                itens lidos {formatCurrency(plan.itemsTotal)}
              </Text>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                {plan.toCreate.length} para importar · {plan.duplicates.length} já lançados
                {dropped > 0 ? ` · ${dropped} linha(s) ilegíveis descartadas` : ""}
              </Text>
            </View>

            {plan.warnings.map((w) => (
              <View key={w} style={[styles.notice, { backgroundColor: "#f59e0b15", borderColor: "#f59e0b55" }]}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 12 }}>{w}</Text>
              </View>
            ))}

            {plan.toCreate.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={[styles.section, { color: colors.mutedForeground }]}>Para importar</Text>
                {plan.toCreate.map((p, i) => {
                  const on = selected.has(i);
                  return (
                    <Pressable
                      key={`${p.tx.description}-${i}`}
                      onPress={() => toggle(i)}
                      accessibilityRole="checkbox"
                      aria-checked={on}
                      style={[styles.row, { backgroundColor: colors.card, borderColor: on ? colors.primary : colors.border, opacity: on ? 1 : 0.55 }]}
                    >
                      <Feather name={on ? "check-square" : "square"} size={20} color={on ? colors.primary : colors.mutedForeground} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
                          {p.label}
                        </Text>
                        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                          {formatDate(p.tx.date)}
                          {p.origin === "future_installment" ? " · parcela futura" : ""}
                          {p.tx.type === "income" ? " · estorno/crédito" : ""}
                        </Text>
                      </View>
                      <Text style={[styles.rowAmount, { color: p.tx.type === "income" ? colors.income : colors.foreground }]}>
                        {p.tx.type === "income" ? "+ " : ""}
                        {formatCurrency(p.tx.amount)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.intro, { color: colors.mutedForeground }]}>
                Nada novo para importar: tudo o que está nesta fatura já foi lançado.
              </Text>
            )}

            {plan.duplicates.length > 0 && (
              <View style={{ gap: 6 }}>
                <Text style={[styles.section, { color: colors.mutedForeground }]}>Já lançados (não serão repetidos)</Text>
                {plan.duplicates.map((d, i) => (
                  <Text key={i} style={[styles.hint, { color: colors.mutedForeground }]}>
                    ✓ {d.item.description} · {formatCurrency(Math.abs(d.item.amount))}
                  </Text>
                ))}
              </View>
            )}

            <Pressable
              onPress={confirm}
              disabled={chosen.length === 0}
              style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: chosen.length === 0 ? 0.4 : pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>
                Importar {chosen.length} {chosen.length === 1 ? "lançamento" : "lançamentos"}
              </Text>
            </Pressable>
            <Pressable onPress={() => setPhase("idle")} style={styles.link}>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Escolher outro arquivo</Text>
            </Pressable>
          </>
        )}

        {phase === "done" && (
          <View style={styles.center}>
            <Feather name="check-circle" size={48} color={colors.primary} />
            <Text style={[styles.reading, { color: colors.foreground }]}>
              {imported} {imported === 1 ? "lançamento importado" : "lançamentos importados"}
            </Text>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace(`/cards/${card.id}` as any))}
              style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, alignSelf: "stretch" }]}
            >
              <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>Ver fatura</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14, paddingBottom: 60 },
  center: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 40, flex: 1 },
  intro: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  notice: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 },
  primary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 16 },
  primaryText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  reading: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  summary: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 4 },
  summaryTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  section: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  rowTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rowAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  link: { alignSelf: "center", paddingVertical: 6 },
});
