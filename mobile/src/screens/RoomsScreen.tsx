import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, TextInput } from "react-native";
import { api, RoomSummary } from "../api/client";
import { theme } from "../theme";

// Discovery of live audio rooms, filterable by LANGUAGE (include/exclude handled server-side).
export function RoomsScreen({ navigation }: any) {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [language, setLanguage] = useState("");

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setRooms(await api.listRooms(language ? { language } : undefined));
    } catch {
      setRooms([]);
    } finally {
      setRefreshing(false);
    }
  }, [language]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Live Rooms 🎙️</Text>
      <TextInput
        placeholder="Filter by language (e.g. en, ar, es) — leave blank for all"
        placeholderTextColor={theme.colors.textDim}
        autoCapitalize="none"
        style={styles.filter}
        value={language}
        onChangeText={setLanguage}
        onSubmitEditing={load}
      />
      <FlatList
        data={rooms}
        keyExtractor={(r) => r.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={theme.colors.primary} />}
        ListEmptyComponent={<Text style={styles.empty}>No live rooms yet. Start one!</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("Room", { room: item })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>
                {item.category ?? "General"} · host {item.host ?? "—"}
                {item.primaryLanguage ? ` · ${flag(item.primaryLanguage)} ${item.primaryLanguage}` : ""}
              </Text>
            </View>
            <View style={styles.live}>
              <Text style={styles.liveText}>🔴 {item.listeners}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("CreateRoom")}>
        <Text style={styles.fabText}>＋ Room</Text>
      </TouchableOpacity>
    </View>
  );
}

const flag = (lang: string) => ({ en: "🇬🇧", ar: "🇸🇦", es: "🇪🇸", fr: "🇫🇷", hi: "🇮🇳", pt: "🇧🇷" }[lang] ?? "🌍");

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: 16 },
  header: { color: theme.colors.text, fontSize: 26, fontWeight: "800", marginBottom: 12 },
  filter: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: { color: theme.colors.text, fontSize: 17, fontWeight: "700" },
  meta: { color: theme.colors.textDim, marginTop: 4, fontSize: 13 },
  live: { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  liveText: { color: theme.colors.text, fontWeight: "700" },
  empty: { color: theme.colors.textDim, textAlign: "center", marginTop: 40 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  fabText: { color: "#fff", fontWeight: "800" },
});
