import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

/** Cartão que agrupa linhas de configuração, separadas por divisórias. */
export function SettingsGroup({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {rows.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
}

type RowProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  /** Cor do ícone e do título (ex.: vermelho para ações destrutivas). */
  tone?: string;
  /** Conteúdo à direita no lugar da seta (ex.: interruptor). */
  right?: React.ReactNode;
};

export function SettingsRow({ icon, title, subtitle, onPress, tone, right }: RowProps) {
  const colors = useColors();
  const accent = tone ?? colors.primary;
  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: accent + "18" }]}>
        <Feather name={icon} size={18} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: tone ?? colors.foreground }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sub, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Feather name="chevron-right" size={20} color={colors.mutedForeground} /> : null)}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 56 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
