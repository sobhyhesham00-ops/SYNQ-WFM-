import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, Alert } from "react-native";
import { api } from "../api/client";
import { theme } from "../theme";

// Create an audio room, including the language include/exclude controls.
export function CreateRoomScreen({ navigation }: any) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Dating");
  const [primaryLanguage, setPrimaryLanguage] = useState("en");
  const [allowed, setAllowed] = useState("");
  const [excluded, setExcluded] = useState("");
  const [languageLocked, setLanguageLocked] = useState(false);

  const create = async () => {
    try {
      const room = await api.createRoom({
        title: title || "My Aura Room",
        category,
        primaryLanguage,
        allowedLanguages: split(allowed),
        excludedLanguages: split(excluded),
        languageLocked,
      });
      navigation.replace("Room", { room });
    } catch (e: any) {
      Alert.alert("Could not create room", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Start a Room 🎙️</Text>

      <Field label="Title">
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Late night talks" placeholderTextColor={theme.colors.textDim} />
      </Field>
      <Field label="Category">
        <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholderTextColor={theme.colors.textDim} />
      </Field>
      <Field label="Primary language">
        <TextInput style={styles.input} autoCapitalize="none" value={primaryLanguage} onChangeText={setPrimaryLanguage} placeholder="en" placeholderTextColor={theme.colors.textDim} />
      </Field>
      <Field label="Allowed languages (comma-sep, blank = any)">
        <TextInput style={styles.input} autoCapitalize="none" value={allowed} onChangeText={setAllowed} placeholder="en, es" placeholderTextColor={theme.colors.textDim} />
      </Field>
      <Field label="Excluded languages (comma-sep)">
        <TextInput style={styles.input} autoCapitalize="none" value={excluded} onChangeText={setExcluded} placeholder="" placeholderTextColor={theme.colors.textDim} />
      </Field>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Language-lock mic seats</Text>
        <Switch value={languageLocked} onValueChange={setLanguageLocked} trackColor={{ true: theme.colors.primary }} />
      </View>
      <Text style={styles.hint}>When on, only users who share the room's languages can take the mic (others can still listen).</Text>

      <TouchableOpacity style={styles.button} onPress={create}>
        <Text style={styles.buttonText}>Go live</Text>
      </TouchableOpacity>
    </View>
  );
}

const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: 16 },
  header: { color: theme.colors.text, fontSize: 24, fontWeight: "800", marginBottom: 16 },
  label: { color: theme.colors.textDim, marginBottom: 6 },
  input: { backgroundColor: theme.colors.surface, color: theme.colors.text, borderRadius: theme.radius.md, padding: 12, borderWidth: 1, borderColor: theme.colors.border },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  switchLabel: { color: theme.colors.text, fontWeight: "600" },
  hint: { color: theme.colors.textDim, fontSize: 12, marginTop: 4 },
  button: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, padding: 16, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
