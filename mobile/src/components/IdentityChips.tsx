import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme, statusColor } from "../theme";

// Renders the "recognize every user" signals: charm/wealth/activity levels,
// a status dot, mood emoji, and (optionally) a worn honor title.
export function IdentityChips({
  charmLevel,
  wealthLevel,
  activityLevel,
  status,
  moodEmoji,
  title,
  compact,
}: {
  charmLevel?: number;
  wealthLevel?: number;
  activityLevel?: number;
  status?: string;
  moodEmoji?: string;
  title?: string;
  compact?: boolean;
}) {
  return (
    <View style={styles.row}>
      {status ? <View style={[styles.dot, { backgroundColor: statusColor(status) }]} /> : null}
      {moodEmoji ? <Text style={styles.mood}>{moodEmoji}</Text> : null}
      {charmLevel != null ? <Chip icon="❤️" value={charmLevel} color={theme.colors.accent} /> : null}
      {wealthLevel != null ? <Chip icon="💎" value={wealthLevel} color={theme.colors.gold} /> : null}
      {!compact && activityLevel != null ? <Chip icon="⭐" value={activityLevel} color={theme.colors.primary} /> : null}
      {!compact && title ? (
        <View style={styles.title}>
          <Text style={styles.titleText}>{title}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Chip({ icon, value, color }: { icon: string; value: number; color: string }) {
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={styles.chipText}>
        {icon} {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  mood: { fontSize: 14 },
  chip: {
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: { color: theme.colors.text, fontSize: 12, fontWeight: "600" },
  title: {
    backgroundColor: theme.colors.primaryDim,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  titleText: { color: theme.colors.text, fontSize: 11, fontWeight: "700" },
});
