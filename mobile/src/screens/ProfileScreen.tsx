import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useAuth } from "../store/auth";
import { api, Levels, LeaderRow } from "../api/client";
import { theme } from "../theme";
import { IdentityChips } from "../components/IdentityChips";

// Profile: the user's identity hub — levels with progress, status/mood, and leaderboards.
export function ProfileScreen() {
  const { me, logout, refreshMe } = useAuth();
  const [levels, setLevels] = useState<Levels | null>(null);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);

  useEffect(() => {
    refreshMe();
    api.levels().then(setLevels).catch(() => {});
    api.leaderboard("wealth").then(setLeaders).catch(() => {});
  }, []);

  const p = me?.profile;
  const s = me?.levelStats;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.headCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{p?.displayName?.[0]?.toUpperCase() ?? "A"}</Text>
        </View>
        <Text style={styles.name}>{p?.displayName ?? "Aura user"}</Text>
        <Text style={styles.meta}>
          {p?.countryCode ? `🌍 ${p.countryCode} · ` : ""}
          {p?.primaryLanguage ? `🗣 ${p.primaryLanguage}` : ""}
        </Text>
        <IdentityChips
          charmLevel={s?.charmLevel}
          wealthLevel={s?.wealthLevel}
          activityLevel={s?.activityLevel}
          status={me?.presence?.status}
          moodEmoji={me?.presence?.moodEmoji}
        />
      </View>

      {levels && (
        <View style={styles.card}>
          <Text style={styles.section}>Progression</Text>
          <LevelBar label="❤️ Charm" p={levels.charm.pct} level={levels.charm.level} color={theme.colors.accent} />
          <LevelBar label="💎 Wealth" p={levels.wealth.pct} level={levels.wealth.level} color={theme.colors.gold} />
          <LevelBar label="⭐ Activity" p={levels.activity.pct} level={levels.activity.level} color={theme.colors.primary} />
          <Text style={styles.streak}>🔥 {levels.streakDays}-day streak</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.section}>💎 Top Wealth Leaderboard</Text>
        {leaders.length === 0 ? (
          <Text style={styles.dim}>No rankings yet — be the first to climb.</Text>
        ) : (
          leaders.map((l) => (
            <View key={l.userId} style={styles.leaderRow}>
              <Text style={styles.rank}>#{l.rank}</Text>
              <Text style={styles.leaderName}>{l.displayName ?? l.userId.slice(0, 6)}</Text>
              <Text style={styles.leaderLevel}>Lv {l.level}</Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function LevelBar({ label, p, level, color }: { label: string; p: number; level: number; color: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={styles.barHead}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barLevel}>Lv {level}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.round(p * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  headCard: { alignItems: "center", backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 24, marginBottom: 16 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 34, fontWeight: "800" },
  name: { color: theme.colors.text, fontSize: 22, fontWeight: "800", marginTop: 12 },
  meta: { color: theme.colors.textDim, marginVertical: 6 },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 16, marginBottom: 16 },
  section: { color: theme.colors.text, fontSize: 16, fontWeight: "700", marginBottom: 12 },
  barHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  barLabel: { color: theme.colors.text },
  barLevel: { color: theme.colors.textDim },
  barTrack: { height: 10, backgroundColor: theme.colors.surfaceAlt, borderRadius: 5, overflow: "hidden" },
  barFill: { height: 10, borderRadius: 5 },
  streak: { color: theme.colors.gold, marginTop: 4, fontWeight: "700" },
  leaderRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  rank: { color: theme.colors.gold, width: 40, fontWeight: "800" },
  leaderName: { color: theme.colors.text, flex: 1 },
  leaderLevel: { color: theme.colors.textDim },
  dim: { color: theme.colors.textDim },
  logout: { padding: 14, alignItems: "center" },
  logoutText: { color: theme.colors.busy, fontWeight: "700" },
});
