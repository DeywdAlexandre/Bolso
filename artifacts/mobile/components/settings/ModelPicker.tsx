import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { SUGGESTED_MODELS } from "@/lib/openrouter";
import { SettingsField } from "./SettingsField";

interface ModelPickerProps {
  modelDraft: string;
  setModelDraft: (model: string) => void;
  isModelPickerOpen: boolean;
  setIsModelPickerOpen: (open: boolean) => void;
}

export function ModelPicker({
  modelDraft,
  setModelDraft,
  isModelPickerOpen,
  setIsModelPickerOpen,
}: ModelPickerProps) {
  const colors = useColors();

  const selectedModel = SUGGESTED_MODELS.find((m) => m.value === modelDraft);

  return (
    <SettingsField label="Modelo de IA">
      <Pressable
        onPress={() => setIsModelPickerOpen(!isModelPickerOpen)}
        style={[
          styles.modelSelector,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.modelValue, { color: colors.foreground }]}>
            {selectedModel ? selectedModel.label : modelDraft}
          </Text>
          <Text style={[styles.modelSub, { color: colors.mutedForeground }]}>
            {modelDraft}
          </Text>
        </View>
        <Feather 
          name={isModelPickerOpen ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={colors.mutedForeground} 
        />
      </Pressable>

      {isModelPickerOpen && (
        <View style={[styles.modelPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {SUGGESTED_MODELS.map((m) => {
            const active = modelDraft === m.value;
            return (
              <Pressable
                key={m.value}
                onPress={() => {
                  setModelDraft(m.value);
                  setIsModelPickerOpen(false);
                }}
                style={[
                  styles.modelItem,
                  active && { backgroundColor: colors.primary + "15" }
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.modelItemLabel,
                      { color: active ? colors.primary : colors.foreground }
                    ]}
                  >
                    {m.label}
                  </Text>
                  <Text style={[styles.modelItemHint, { color: colors.mutedForeground }]}>
                    {m.hint}
                  </Text>
                </View>
                {active && <Feather name="check" size={18} color={colors.primary} />}
              </Pressable>
            );
          })}
          <View style={styles.customModelBox}>
            <Text style={[styles.customLabel, { color: colors.mutedForeground }]}>Outro modelo (ID):</Text>
            <TextInput
              value={modelDraft}
              onChangeText={setModelDraft}
              placeholder="provider/model-id"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              style={[
                styles.customInput,
                { color: colors.foreground, borderBottomColor: colors.border }
              ]}
            />
          </View>
        </View>
      )}
    </SettingsField>
  );
}

const styles = StyleSheet.create({
  modelSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  modelValue: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  modelSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  modelPicker: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  modelItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  modelItemLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  modelItemHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  customModelBox: {
    padding: 16,
    gap: 8,
  },
  customLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
  },
  customInput: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
});
