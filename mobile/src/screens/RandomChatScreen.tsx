import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from "react-native";
import { getSocket } from "../api/socket";
import { theme } from "../theme";

type Mode = "same" | "exchange";

// Free random 1:1 chat with LANGUAGE-AWARE matchmaking.
//  - "same": match someone who shares a language
//  - "exchange": language-exchange pairing (learn each other's language)
export function RandomChatScreen() {
  const [state, setState] = useState<"idle" | "searching" | "matched">("idle");
  const [mode, setMode] = useState<Mode>("same");
  const [partner, setPartner] = useState<string | null>(null);
  const [shared, setShared] = useState<string[]>([]);
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const socket = getSocket();
    socket?.on("match:waiting", () => setState("searching"));
    socket?.on("match:found", (p: any) => {
      setPartner(p.partnerId);
      setShared(p.sharedLanguages ?? []);
      setMessages([]);
      setState("matched");
    });
    socket?.on("match:message", (m: any) => setMessages((prev) => [...prev, m]));
    socket?.on("match:ended", () => {
      setState("idle");
      setPartner(null);
    });
    return () => {
      socket?.off("match:waiting");
      socket?.off("match:found");
      socket?.off("match:message");
      socket?.off("match:ended");
    };
  }, []);

  const start = () => {
    setState("searching");
    getSocket()?.emit("match:enqueue", { mode });
  };
  const skip = () => {
    getSocket()?.emit("match:skip");
    getSocket()?.emit("match:enqueue", { mode });
    setState("searching");
  };
  const send = () => {
    if (!text.trim()) return;
    getSocket()?.emit("match:message", { text });
    setMessages((prev) => [...prev, { from: "me", text }]);
    setText("");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Random Chat 🔀</Text>
      <Text style={styles.sub}>Free, unlimited. Meet someone new by voice or text.</Text>

      <View style={styles.modes}>
        <ModeBtn label="Same language" active={mode === "same"} onPress={() => setMode("same")} />
        <ModeBtn label="Language exchange" active={mode === "exchange"} onPress={() => setMode("exchange")} />
      </View>

      {state === "idle" && (
        <TouchableOpacity style={styles.big} onPress={start}>
          <Text style={styles.bigText}>Start matching</Text>
        </TouchableOpacity>
      )}

      {state === "searching" && (
        <View style={styles.center}>
          <Text style={styles.searching}>Finding someone{mode === "exchange" ? " to swap languages with" : ""}…</Text>
          <TouchableOpacity onPress={() => setState("idle")}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === "matched" && (
        <View style={{ flex: 1 }}>
          <Text style={styles.matched}>
            Matched with {partner?.slice(0, 6)} · {shared.length ? `shared: ${shared.join(", ")}` : "language exchange"}
          </Text>
          <ScrollView style={styles.chat}>
            {messages.map((m, i) => (
              <Text key={i} style={[styles.msg, m.from === "me" && styles.mine]}>
                {m.from === "me" ? "You" : "Them"}: {m.text}
              </Text>
            ))}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              placeholder="Say hi…"
              placeholderTextColor={theme.colors.textDim}
              style={styles.input}
              value={text}
              onChangeText={setText}
              onSubmitEditing={send}
            />
            <TouchableOpacity style={styles.skip} onPress={skip}>
              <Text style={styles.skipText}>Skip ⏭</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function ModeBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.mode, active && styles.modeActive]} onPress={onPress}>
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: 16 },
  header: { color: theme.colors.text, fontSize: 26, fontWeight: "800" },
  sub: { color: theme.colors.textDim, marginBottom: 16 },
  modes: { flexDirection: "row", gap: 10, marginBottom: 16 },
  mode: { flex: 1, padding: 12, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  modeActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surfaceAlt },
  modeText: { color: theme.colors.textDim, textAlign: "center", fontWeight: "600" },
  modeTextActive: { color: theme.colors.text },
  big: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.lg, padding: 22, alignItems: "center", marginTop: 20 },
  bigText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  center: { alignItems: "center", marginTop: 40 },
  searching: { color: theme.colors.text, fontSize: 16 },
  cancel: { color: theme.colors.textDim, marginTop: 14 },
  matched: { color: theme.colors.accent, marginBottom: 8 },
  chat: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 12 },
  msg: { color: theme.colors.text, marginBottom: 6 },
  mine: { color: theme.colors.primary, textAlign: "right" },
  inputRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  input: { flex: 1, backgroundColor: theme.colors.surface, color: theme.colors.text, borderRadius: theme.radius.md, padding: 12, borderWidth: 1, borderColor: theme.colors.border },
  skip: { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md, paddingHorizontal: 16, justifyContent: "center" },
  skipText: { color: theme.colors.text, fontWeight: "700" },
});
