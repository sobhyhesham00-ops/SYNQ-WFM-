import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "../store/auth";
import { theme } from "../theme";

export function AuthScreen() {
  const { login, register, loading, error } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [language, setLanguage] = useState("en");

  const submit = () => {
    if (mode === "login") login(email, password);
    else register(email, password, displayName || "New Aura", language);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Aura 🌙</Text>
      <Text style={styles.tagline}>Fall for a voice, not a filter.</Text>

      {mode === "register" && (
        <TextInput
          placeholder="Display name"
          placeholderTextColor={theme.colors.textDim}
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
        />
      )}
      <TextInput
        placeholder="Email"
        placeholderTextColor={theme.colors.textDim}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Password (min 8 chars)"
        placeholderTextColor={theme.colors.textDim}
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />
      {mode === "register" && (
        <TextInput
          placeholder="Primary language (e.g. en, ar, es)"
          placeholderTextColor={theme.colors.textDim}
          autoCapitalize="none"
          style={styles.input}
          value={language}
          onChangeText={setLanguage}
        />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{mode === "login" ? "Log in" : "Create account"}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMode(mode === "login" ? "register" : "login")}>
        <Text style={styles.switch}>
          {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: 24, justifyContent: "center" },
  logo: { color: theme.colors.text, fontSize: 44, fontWeight: "800", textAlign: "center" },
  tagline: { color: theme.colors.textDim, textAlign: "center", marginBottom: 32 },
  input: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  switch: { color: theme.colors.textDim, textAlign: "center", marginTop: 18 },
  error: { color: theme.colors.busy, textAlign: "center", marginBottom: 8 },
});
