import { PrismaClient, CosmeticType, Rarity } from "@prisma/client";

const prisma = new PrismaClient();

// Seed the catalogs that power the economy and the identity system.
async function main() {
  // ── Gifts (the revenue engine) ────────────────────────────────────────────────
  const gifts = [
    { name: "Rose", emoji: "🌹", priceCoins: 10, diamondValue: 5, rarity: Rarity.COMMON, broadcast: false },
    { name: "Heart", emoji: "❤️", priceCoins: 50, diamondValue: 25, rarity: Rarity.COMMON, broadcast: false },
    { name: "Crown", emoji: "👑", priceCoins: 500, diamondValue: 300, rarity: Rarity.RARE, broadcast: false },
    { name: "Sports Car", emoji: "🏎️", priceCoins: 5000, diamondValue: 3000, rarity: Rarity.EPIC, broadcast: true },
    { name: "Galaxy", emoji: "🌌", priceCoins: 12000, diamondValue: 7500, rarity: Rarity.LEGENDARY, broadcast: true },
    { name: "Castle", emoji: "🏰", priceCoins: 30000, diamondValue: 19000, rarity: Rarity.LEGENDARY, broadcast: true },
  ];
  for (const g of gifts) {
    await prisma.gift.upsert({ where: { id: g.name }, update: g, create: { id: g.name, ...g } });
  }

  // ── Cosmetics (identity storefront — pure margin) ─────────────────────────────
  const cosmetics = [
    { id: "frame_rose_gold", type: CosmeticType.AVATAR_FRAME, name: "Rose Gold Frame", priceCoins: 800, rarity: Rarity.RARE },
    { id: "frame_dragon", type: CosmeticType.AVATAR_FRAME, name: "Dragon Frame", priceCoins: 3000, rarity: Rarity.EPIC },
    { id: "entrance_phoenix", type: CosmeticType.ENTRANCE_EFFECT, name: "Golden Phoenix", priceCoins: 8000, rarity: Rarity.LEGENDARY, durationDays: 30 },
    { id: "entrance_spaceship", type: CosmeticType.ENTRANCE_EFFECT, name: "Starship", priceCoins: 15000, rarity: Rarity.LEGENDARY, durationDays: 30 },
    { id: "bubble_neon", type: CosmeticType.CHAT_BUBBLE, name: "Neon Bubble", priceCoins: 500, rarity: Rarity.COMMON },
    { id: "title_night_mayor", type: CosmeticType.HONOR_TITLE, name: "Night Mayor", priceCoins: 2000, rarity: Rarity.RARE },
  ];
  for (const c of cosmetics) {
    await prisma.cosmeticItem.upsert({ where: { id: c.id }, update: c, create: c });
  }

  // ── VIP / Noble tiers ─────────────────────────────────────────────────────────
  const tiers = [
    { code: "BARON", name: "Baron", level: 1, monthlyPrice: 499, monthlyCoins: 300, perks: ["ad-free", "baron frame"] },
    { code: "DUKE", name: "Duke", level: 3, monthlyPrice: 1999, monthlyCoins: 1500, perks: ["incognito join", "gift discount 10%", "duke frame"] },
    { code: "KING", name: "King", level: 5, monthlyPrice: 4999, monthlyCoins: 5000, perks: ["gold nameplate", "priority match", "exclusive entrance", "who liked you"] },
  ];
  for (const t of tiers) {
    await prisma.vipTier.upsert({ where: { code: t.code }, update: t, create: t });
  }

  // ── Badges ────────────────────────────────────────────────────────────────────
  const badges = [
    { code: "VERIFIED", name: "Verified" },
    { code: "TOP_GIFTER_WEEK", name: "Top Gifter (Weekly)" },
    { code: "FOUNDING_MEMBER", name: "Founding Member" },
  ];
  for (const b of badges) {
    await prisma.badge.upsert({ where: { code: b.code }, update: b, create: b });
  }

  // eslint-disable-next-line no-console
  console.log("🌱 Seeded gifts, cosmetics, VIP tiers, and badges.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
