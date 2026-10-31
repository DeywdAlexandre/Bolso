import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { planCalendarImport, SKIP_LABELS, type CalendarEvent, type ImportPlan, type ImportedShift, type SkipReason } from "@/lib/calendarImport";
import { formatCurrency, formatDate, parseDecimalPtBr } from "@/lib/format";
import type { Shift, ShiftTemplate } from "@/lib/types";

import { styles } from "./styles";

/** Quantos dias à frente da data de hoje a importação lê. */
const WINDOW_DAYS = 90;

type WindowKey = "month" | "recent";

const WINDOWS: { key: WindowKey; label: string }[] = [
  { key: "month", label: "Do início do mês" },
  { key: "recent", label: "Últimos 60 dias" },
];

/** Início da leitura: primeiro dia do mês atual ou 60 dias atrás. */
function windowStart(key: WindowKey): Date {
  const now = new Date();
  return key === "month"
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60);
}

type DeviceCalendar = { id: string; title: string; color?: string; source?: { name?: string } };

/** Plantão pronto para salvar: tipo e valor já resolvidos. */
export type ImportItem = ImportedShift & Pick<Shift, "type" | "value">;

type Props = {
  visible: boolean;
  shifts: Shift[];
  templates: ShiftTemplate[];
  onClose: () => void;
  onImport: (items: ImportItem[]) => Promise<void>;
};

const norm = (t: string) => t.trim().toLowerCase();

// Carrega o módulo só quando a tela abre: ele não existe na versão web (PWA).
const loadCalendar = () => require("expo-calendar") as typeof import("expo-calendar");

/** Importa plantões a partir de um calendário do celular (ex.: onde o agente do Gemini lança as escalas). */
export function CalendarImportModal({ visible, shifts, templates, onClose, onImport }: Props) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [calendars, setCalendars] = useState<DeviceCalendar[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Eventos de cada calendário no período escolhido: ajuda a achar onde estão as escalas.
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [showEmpty, setShowEmpty] = useState(false);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [windowKey, setWindowKey] = useState<WindowKey>("month");
  const [asExtra, setAsExtra] = useState(false);
  const [valueText, setValueText] = useState("");

  // Mesmo nome de um modelo de escala: usa o tipo e o valor dele. Os demais seguem o valor informado abaixo.
  const resolve = (s: ImportedShift): ImportItem => {
    const tpl = templates.find((t) => norm(t.name) === norm(s.name));
    if (tpl) return { ...s, type: tpl.type, value: tpl.type === "extra" ? tpl.value : undefined };
    if (asExtra) return { ...s, type: "extra", value: parseDecimalPtBr(valueText) };
    return { ...s, type: "ordinary" };
  };
  const resolved = plan ? plan.toAdd.map(resolve) : [];
  const totalValue = resolved.reduce((sum, s) => sum + (s.type === "extra" ? s.value ?? 0 : 0), 0);

  const loadCalendars = useCallback(async () => {
    setLoading(true);
    setPlan(null);
    try {
      const Calendar = loadCalendar();
      const perm = await Calendar.requestCalendarPermissionsAsync();
      if (perm.status !== "granted") {
        setDenied(true);
        return;
      }
      setDenied(false);
      const list = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      setCalendars(list.map((c) => ({ id: c.id, title: c.title, color: c.color, source: c.source })));
    } catch {
      Alert.alert("Agenda", "Não consegui acessar a agenda deste aparelho.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setSelectedId(null);
      void loadCalendars();
    }
  }, [visible, loadCalendars]);

  useEffect(() => {
    if (!visible || calendars.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const Calendar = loadCalendar();
        const end = new Date();
        end.setHours(0, 0, 0, 0);
        end.setTime(end.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);
        const events = await Calendar.getEventsAsync(calendars.map((c) => c.id), windowStart(windowKey), end);
        const next: Record<string, number> = {};
        for (const c of calendars) next[c.id] = 0;
        for (const e of events) if (e.calendarId in next) next[e.calendarId] += 1;
        if (!cancelled) setCounts(next);
      } catch {
        if (!cancelled) setCounts(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, calendars, windowKey]);

  // Com eventos primeiro (mais cheios no topo); sem eventos ficam recolhidos.
  const withEvents = counts ? calendars.filter((c) => (counts[c.id] ?? 0) > 0).sort((a, b) => counts[b.id] - counts[a.id]) : calendars;
  const empty = counts ? calendars.filter((c) => (counts[c.id] ?? 0) === 0) : [];

  const pick = async (id: string, key: WindowKey = windowKey) => {
    setSelectedId(id);
    setLoading(true);
    try {
      const Calendar = loadCalendar();
      const start = windowStart(key);
      const end = new Date();
      end.setHours(0, 0, 0, 0);
      end.setTime(end.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);
      const events = await Calendar.getEventsAsync([id], start, end);
      setPlan(planCalendarImport(events as CalendarEvent[], shifts));
    } catch {
      Alert.alert("Agenda", "Não consegui ler os eventos deste calendário.");
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!plan || plan.toAdd.length === 0) return;
    setLoading(true);
    try {
      await onImport(resolved);
      Alert.alert("Agenda", `${plan.toAdd.length} plantão(ões) importado(s).`);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, maxHeight: "85%" }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Importar da agenda</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar">
              <Feather name="x" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          {denied ? (
            <View style={{ padding: 24, alignItems: "center", gap: 12 }}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Sem permissão para ler a agenda. Libere em Configurações do Android → Apps → Prisma → Permissões → Agenda.
              </Text>
              <Pressable onPress={loadCalendars} style={[styles.addSingleBtn, { backgroundColor: colors.primary + "15" }]}>
                <Text style={[styles.addSingleBtnText, { color: colors.primary }]}>Tentar de novo</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground, textAlign: "left" }]}>
                Escolha o calendário com as suas escalas (o do Google costuma ter o seu e-mail; veja qual tem mais eventos). Leio os eventos do período abaixo até {WINDOW_DAYS} dias à frente; os que já
                existem aqui (mesmo dia, nome e horário) não são repetidos.
              </Text>

              <View style={{ flexDirection: "row", gap: 8 }}>
                {WINDOWS.map((w) => {
                  const active = w.key === windowKey;
                  return (
                    <Pressable
                      key={w.key}
                      onPress={() => {
                        setWindowKey(w.key);
                        if (selectedId) void pick(selectedId, w.key);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primary + "22" : colors.card,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: active ? colors.primary : colors.mutedForeground }}>
                        {w.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {(showEmpty ? [...withEvents, ...empty] : withEvents).map((c) => {
                const active = c.id === selectedId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => pick(c.id)}
                    style={[
                      styles.addSingleBtn,
                      {
                        backgroundColor: active ? colors.primary + "22" : colors.card,
                        borderWidth: 1,
                        borderColor: active ? colors.primary : colors.border,
                        marginTop: 0,
                      },
                    ]}
                  >
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.color ?? colors.primary }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{c.title}</Text>
                      <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                        {[c.source?.name, counts ? `${counts[c.id] ?? 0} ${(counts[c.id] ?? 0) === 1 ? "evento" : "eventos"}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}

              {empty.length > 0 && (
                <Pressable onPress={() => setShowEmpty((v) => !v)} hitSlop={8}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" }}>
                    {showEmpty ? "Esconder agendas sem eventos" : `Mostrar ${empty.length} agendas sem eventos neste período`}
                  </Text>
                </Pressable>
              )}

              {!loading && calendars.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nenhum calendário encontrado.</Text>
              )}

              {loading && <ActivityIndicator color={colors.primary} />}

              {plan && !loading && (
                <View style={{ gap: 6 }}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                    {plan.read === 0
                      ? "Este calendário não tem eventos no período. Confira se o calendário certo está selecionado e sincronizado."
                      : `A agenda devolveu ${plan.read} ${plan.read === 1 ? "evento" : "eventos"} neste período.`}
                  </Text>
                  {plan.skipped > 0 && (
                    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                      Ignorados:{" "}
                      {(Object.entries(plan.skippedBy) as [SkipReason, number][])
                        .map(([reason, n]) => `${n} ${SKIP_LABELS[reason]}`)
                        .join(", ")}
                      {plan.skippedSamples.length > 0 ? ` (ex.: ${plan.skippedSamples.join(", ")})` : ""}
                    </Text>
                  )}
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 14 }}>
                    {plan.toAdd.length} novo(s) · {plan.duplicates} já existente(s)
                    {plan.skipped ? ` · ${plan.skipped} ignorado(s)` : ""}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ color: colors.foreground, fontSize: 13, flex: 1 }}>
                      Plantões extras (com valor a receber)
                    </Text>
                    <Switch value={asExtra} onValueChange={setAsExtra} />
                  </View>
                  {asExtra && (
                    <TextInput
                      value={valueText}
                      onChangeText={setValueText}
                      keyboardType="numeric"
                      placeholder="Valor por plantão (R$)"
                      placeholderTextColor={colors.mutedForeground}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 10,
                        padding: 10,
                        color: colors.foreground,
                        backgroundColor: colors.card,
                      }}
                    />
                  )}
                  <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                    Eventos com o mesmo nome de um modelo de escala usam o valor do modelo. Dá para ajustar cada plantão depois, no lápis.
                  </Text>
                  {resolved.slice(0, 8).map((s, i) => (
                    <Text key={i} style={{ color: colors.mutedForeground, fontSize: 12 }}>
                      {formatDate(s.date)} · {s.name} · {s.startTime}–{s.endTime}
                      {s.type === "extra" ? ` · ${formatCurrency(s.value ?? 0)}` : ""}
                    </Text>
                  ))}
                  {totalValue > 0 && (
                    <Text style={{ color: colors.income, fontSize: 13, fontFamily: "Inter_700Bold" }}>
                      Total a receber: {formatCurrency(totalValue)}
                    </Text>
                  )}
                  {plan.toAdd.length > 8 && (
                    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>e mais {plan.toAdd.length - 8}…</Text>
                  )}
                  <Pressable
                    onPress={confirm}
                    disabled={plan.toAdd.length === 0}
                    style={[
                      styles.addSingleBtn,
                      { backgroundColor: colors.primary, justifyContent: "center", opacity: plan.toAdd.length === 0 ? 0.4 : 1 },
                    ]}
                  >
                    <Text style={[styles.addSingleBtnText, { color: colors.primaryForeground }]}>Importar</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

