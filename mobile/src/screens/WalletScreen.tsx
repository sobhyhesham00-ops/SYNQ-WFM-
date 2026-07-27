import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native";
import { api, Gift } from "../api/client";
import { theme } from "../theme";

const COIN_PACKS = [
  { productId: "coins_100", label: "Starter", coins: 100, price: "$0.99" },
  { productId: "coins_1100", label: "Popular", coins: 1100, price: "$9.99" },
  { productId: "coins_12000", label: "Whale", coins: 12000, price: "$99.99" },
];

// Wallet + coin top-up + gift catalog. Top-up here calls the demo endpoint;
// production wires Apple IAP / Google Play Billing with server-side receipt verification.
export function WalletScreen() {
  const [balance, setBalance] = useState<{ coins: string; diamonds: string }>({ coins: "0", diamonds: "0" });
  const [gifts, setGifts] = useState<Gift[]>([]);

  const load = async () => {
    try {
      setBalance(await api.wallet());
      setGifts(await api.giftCatalog());
    } catch {
      /* ignore */
    }
  };
  useEffect(() => {
    load();
  }, []);

  const buy = async (pack: (typeof COIN_PACKS)[number]) => {
    try {
      // TODO(provider: iap) — run the store purchase, then send the receipt here.
      const res = await api.topUp({ productId: pack.productId, coins: pack.coins });
      setBalance(res);
      Alert.alert("Coins added", `+${pack.coins} coins`);
    } catch (e: any) {
      Alert.alert("Purchase failed", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.balances}>
        <View style={styles.balCard}>
          <Text style={styles.balNum}>🪙 {balance.coins}</Text>
          <Text style={styles.balLabel}>Coins</Text>
        </View>
        <View style={styles.balCard}>
          <Text style={styles.balNum}>💎 {balance.diamonds}</Text>
          <Text style={styles.balLabel}>Diamonds</Text>
        </View>
      </View>

      <Text style={styles.section}>Buy coins</Text>
      <View style={styles.packs}>
        {COIN_PACKS.map((p) => (
          <TouchableOpacity key={p.productId} style={styles.pack} onPress={() => buy(p)}>
            <Text style={styles.packLabel}>{p.label}</Text>
            <Text style={styles.packCoins}>🪙 {p.coins}</Text>
            <Text style={styles.packPrice}>{p.price}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.section}>Gift catalog 🎁</Text>
      <FlatList
        data={gifts}
        numColumns={3}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <View style={styles.gift}>
            <Text style={styles.giftEmoji}>{item.emoji ?? "🎁"}</Text>
            <Text style={styles.giftName}>{item.name}</Text>
            <Text style={styles.giftPrice}>🪙 {item.priceCoins}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: 16 },
  balances: { flexDirection: "row", gap: 12 },
  balCard: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 18, alignItems: "center" },
  balNum: { color: theme.colors.text, fontSize: 22, fontWeight: "800" },
  balLabel: { color: theme.colors.textDim, marginTop: 4 },
  section: { color: theme.colors.text, fontSize: 18, fontWeight: "700", marginTop: 20, marginBottom: 10 },
  packs: { flexDirection: "row", gap: 10 },
  pack: { flex: 1, backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md, padding: 14, alignItems: "center", borderWidth: 1, borderColor: theme.colors.primaryDim },
  packLabel: { color: theme.colors.accent, fontWeight: "700" },
  packCoins: { color: theme.colors.text, marginVertical: 6, fontWeight: "800" },
  packPrice: { color: theme.colors.gold, fontWeight: "700" },
  gift: { flex: 1 / 3, alignItems: "center", padding: 12, margin: 4, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md },
  giftEmoji: { fontSize: 30 },
  giftName: { color: theme.colors.text, marginTop: 4, fontSize: 12 },
  giftPrice: { color: theme.colors.gold, fontSize: 12, marginTop: 2 },
});
