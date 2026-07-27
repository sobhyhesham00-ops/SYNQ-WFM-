import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { api } from "../api/client";
import { getSocket } from "../api/socket";
import { theme } from "../theme";
import { IdentityChips } from "../components/IdentityChips";

interface Seat {
  userId: string;
  name: string;
  speaking?: boolean;
}
interface GiftFx {
  id: string;
  emoji: string;
  from: string;
}

// A live audio room: seat grid (camera-off), live gift animations, and in-room chat.
// Real voice would attach react-native-agora using the token from api.joinRoom().
export function RoomScreen({ route, navigation }: any) {
  const room = route.params.room;
  const [seats, setSeats] = useState<Seat[]>([{ userId: room.id, name: room.host ?? "Host", speaking: true }]);
  const [messages, setMessages] = useState<{ userId: string; text: string }[]>([]);
  const [fx, setFx] = useState<GiftFx[]>([]);
  const [canSpeak, setCanSpeak] = useState(true);
  const joined = useRef(false);

  useEffect(() => {
    const socket = getSocket();
    (async () => {
      try {
        const res = await api.joinRoom(room.id);
        setCanSpeak(res.canSpeak);
        // res.agora = { appId, channel, token } → hand to react-native-agora to join voice.
      } catch {
        /* ignore for demo */
      }
      socket?.emit("room:join", { roomId: room.id });
      joined.current = true;
    })();

    socket?.on("room:message", (m: any) => setMessages((prev) => [...prev.slice(-40), m]));
    socket?.on("gift:recv", (g: any) =>
      setFx((prev) => [...prev, { id: `${Date.now()}`, emoji: g.gift?.emoji ?? "🎁", from: g.senderId }])
    );
    socket?.on("room:entrance", (e: any) =>
      setMessages((prev) => [...prev, { userId: "system", text: `✨ ${e.displayName ?? "Someone"} entered${e.entranceId ? ` in a ${e.entranceId}` : ""}` }])
    );

    return () => {
      socket?.emit("room:leave", { roomId: room.id });
      socket?.off("room:message");
      socket?.off("gift:recv");
      socket?.off("room:entrance");
    };
  }, [room.id]);

  const sendGift = async (giftId: string) => {
    getSocket()?.emit("gift:send", { roomId: room.id, receiverId: seats[0].userId, giftId, quantity: 1 });
  };

  return (
    <View style={styles.container}>
      <View style={styles.head}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Leave</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{room.title}</Text>
        <Text style={styles.lang}>{room.primaryLanguage ? `🌍 ${room.primaryLanguage}` : ""}</Text>
      </View>

      {!canSpeak && <Text style={styles.locked}>🔒 This room is language-locked — you can listen but not take the mic.</Text>}

      {/* Seat grid — camera-off audio seats */}
      <View style={styles.seatGrid}>
        {seats.map((s) => (
          <View key={s.userId} style={styles.seat}>
            <View style={[styles.avatar, s.speaking && styles.speaking]}>
              <Text style={styles.avatarText}>{s.name?.[0]?.toUpperCase() ?? "?"}</Text>
            </View>
            <Text style={styles.seatName}>{s.name}</Text>
            <IdentityChips charmLevel={12} wealthLevel={7} status="ONLINE" compact />
          </View>
        ))}
        {Array.from({ length: (room.seatCount ?? 8) - seats.length }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.seat}>
            <View style={[styles.avatar, styles.emptySeat]}>
              <Text style={styles.plus}>＋</Text>
            </View>
            <Text style={styles.seatName}>Empty</Text>
          </View>
        ))}
      </View>

      {/* Gift FX overlay */}
      <View style={styles.fxRow}>
        {fx.slice(-6).map((f) => (
          <Text key={f.id} style={styles.fx}>
            {f.emoji}
          </Text>
        ))}
      </View>

      {/* Chat */}
      <ScrollView style={styles.chat}>
        {messages.map((m, i) => (
          <Text key={i} style={[styles.msg, m.userId === "system" && styles.sysMsg]}>
            {m.userId === "system" ? m.text : `${m.userId.slice(0, 5)}: ${m.text}`}
          </Text>
        ))}
      </ScrollView>

      {/* Quick gift bar */}
      <View style={styles.giftBar}>
        {["Rose", "Crown", "Sports Car", "Galaxy"].map((g, i) => (
          <TouchableOpacity key={g} style={styles.giftBtn} onPress={() => sendGift(g)}>
            <Text style={styles.giftEmoji}>{["🌹", "👑", "🏎️", "🌌"][i]}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: 16 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  back: { color: theme.colors.textDim, fontSize: 16 },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: "800", flex: 1, textAlign: "center" },
  lang: { color: theme.colors.textDim },
  locked: { color: theme.colors.away, marginBottom: 10, fontSize: 13 },
  seatGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  seat: { width: "23%", alignItems: "center", marginBottom: 16 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  speaking: { borderColor: theme.colors.online },
  emptySeat: { borderStyle: "dashed", borderColor: theme.colors.border },
  avatarText: { color: theme.colors.text, fontSize: 22, fontWeight: "800" },
  plus: { color: theme.colors.textDim, fontSize: 22 },
  seatName: { color: theme.colors.textDim, fontSize: 12, marginTop: 4 },
  fxRow: { flexDirection: "row", justifyContent: "center", minHeight: 30 },
  fx: { fontSize: 26, marginHorizontal: 2 },
  chat: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    marginVertical: 8,
  },
  msg: { color: theme.colors.text, marginBottom: 6, fontSize: 13 },
  sysMsg: { color: theme.colors.accent, fontStyle: "italic" },
  giftBar: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 6 },
  giftBtn: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.pill,
    padding: 12,
  },
  giftEmoji: { fontSize: 24 },
});
