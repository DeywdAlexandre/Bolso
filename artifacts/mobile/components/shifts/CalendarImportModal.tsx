import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { planCalendarImport, type CalendarEvent, type ImportPlan, type ImportedShift } from "@/lib/calendarImport";
import { formatDate } from "@/lib/format";
import type { Shift } from "@/lib/types";

import { styles } from "./styles";

/** Quantos dias à frente da data de hoje a importação lê. */
const WINDOW_DAYS = 90;

type DeviceCalendar = { id: string; title: string; color?: string; source?: { name?: string } };

type Props = {
  visible: boolean;
  shifts: Shift[];
  onClose: () => void;
  onImport: (items: ImportedShift[]) => Promise<void>;
};

// Carrega o módulo só quando a tela abre: ele não existe na versão web (PWA).
const loadCalendar = () => require("expo-calendar") as typeof import("expo-calendar");

/** Importa plantões a partir de um calendário do celular (ex.: onde o agente do Gemini lança as escalas). */
export function CalendarImportModal({ visible, shifts, onClose, onImport }: Props) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [calendars, setCalendars] = useState<DeviceCalendar[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);

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

  const pick = async (id: string) => {
    setSelectedId(id);
    setLoading(true);
    try {
      const Calendar = loadCalendar();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);
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
      await onImport(plan.toAdd);
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
                Escolha o calendário com as suas escalas. Leio os eventos dos próximos {WINDOW_DAYS} dias; os que já existem
                aqui (mesmo dia, nome e horário) não são repetidos.
              </Text>

              {calendars.map((c) => {
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
                      {c.source?.name ? (
                        <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{c.source.name}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}

              {!loading && calendars.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nenhum calendário encontrado.</Text>
              )}

              {loading && <ActivityIndicator color={colors.primary} />}

              {plan && !loading && (
                <View style={{ gap: 6 }}>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 14 }}>
                    {plan.toAdd.length} novo(s) · {plan.duplicates} já existente(s)
                    {plan.skipped ? ` · ${plan.skipped} ignorado(s)` : ""}
                  </Text>
                  {plan.toAdd.slice(0, 8).map((s, i) => (
                    <Text key={i} style={{ color: colors.mutedForeground, fontSize: 12 }}>
                      {formatDate(s.date)} · {s.name} · {s.startTime}–{s.endTime}
                    </Text>
                  ))}
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

