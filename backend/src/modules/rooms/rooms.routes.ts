import { Router } from "express";
import { z } from "zod";
import { RoomType, SeatRole } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";
import { issueAgoraToken } from "./agora";

export const roomsRouter = Router();

// ── Create a room (with language controls) ──────────────────────────────────────
const createSchema = z.object({
  title: z.string().min(2).max(60),
  category: z.string().max(40).optional(),
  type: z.nativeEnum(RoomType).default(RoomType.PUBLIC),
  seatCount: z.number().int().min(2).max(20).default(8),
  ticketPriceCoins: z.number().int().min(0).optional(),
  primaryLanguage: z.string().min(2).max(8).optional(),
  allowedLanguages: z.array(z.string()).max(10).default([]),
  excludedLanguages: z.array(z.string()).max(10).default([]),
  languageLocked: z.boolean().default(false),
});

roomsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const room = await prisma.room.create({
      data: {
        ...body,
        ownerId: req.userId!,
        isLive: true,
        members: { create: { userId: req.userId!, role: SeatRole.OWNER, seatIndex: 0 } },
      },
    });
    return res.status(201).json(room);
  } catch (e) {
    next(e);
  }
});

// ── List live rooms, with language include/exclude filtering ────────────────────
// Query: ?language=es (show rooms usable in Spanish) &category=Music &q=text
roomsRouter.get("/", async (req, res, next) => {
  try {
    const language = typeof req.query.language === "string" ? req.query.language : undefined;
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;

    let rooms = await prisma.room.findMany({
      where: {
        isLive: true,
        ...(category ? { category } : {}),
        ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      },
      include: { owner: { include: { profile: true } }, _count: { select: { members: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Language filter — respects each room's include (allowedLanguages) and exclude lists.
    if (language) {
      rooms = rooms.filter((r) => roomAcceptsLanguage(r, language));
    }

    return res.json(
      rooms.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        type: r.type,
        primaryLanguage: r.primaryLanguage,
        allowedLanguages: r.allowedLanguages,
        listeners: r._count.members,
        host: r.owner.profile?.displayName,
      }))
    );
  } catch (e) {
    next(e);
  }
});

// ── Join a room (enforces language lock for mic seats) ──────────────────────────
roomsRouter.post("/:id/join", requireAuth, async (req, res, next) => {
  try {
    const room = await prisma.room.findUnique({ where: { id: req.params.id } });
    if (!room || !room.isLive) throw new HttpError(404, "Room not found");

    // Language-locked rooms: users must share a language to take the mic (may still listen).
    let canSpeak = true;
    if (room.languageLocked) {
      const profile = await prisma.profile.findUnique({
        where: { userId: req.userId! },
        include: { languages: true },
      });
      const userLangs = new Set([
        ...(profile?.primaryLanguage ? [profile.primaryLanguage] : []),
        ...(profile?.languages.map((l) => l.language) ?? []),
      ]);
      canSpeak = languageIntersects(room, userLangs);
    }

    const member = await prisma.roomMember.upsert({
      where: { roomId_userId: { roomId: room.id, userId: req.userId! } },
      update: {},
      create: { roomId: room.id, userId: req.userId!, role: SeatRole.LISTENER },
    });

    const agora = issueAgoraToken(room.agoraChannel, req.userId!);
    return res.json({ member, canSpeak, agora });
  } catch (e) {
    next(e);
  }
});

roomsRouter.post("/:id/leave", requireAuth, async (req, res, next) => {
  try {
    await prisma.roomMember.deleteMany({ where: { roomId: req.params.id, userId: req.userId! } });
    return res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ── Language matching helpers (also used by discovery) ──────────────────────────
export function roomAcceptsLanguage(
  room: { primaryLanguage: string | null; allowedLanguages: string[]; excludedLanguages: string[] },
  language: string
): boolean {
  if (room.excludedLanguages.includes(language)) return false;
  const allow = room.allowedLanguages;
  if (allow.length === 0) return true; // open to any language
  return allow.includes(language) || room.primaryLanguage === language;
}

function languageIntersects(
  room: { primaryLanguage: string | null; allowedLanguages: string[]; excludedLanguages: string[] },
  userLangs: Set<string>
): boolean {
  const roomLangs = new Set([...(room.primaryLanguage ? [room.primaryLanguage] : []), ...room.allowedLanguages]);
  if (roomLangs.size === 0) return true;
  for (const l of userLangs) if (roomLangs.has(l) && !room.excludedLanguages.includes(l)) return true;
  return false;
}
