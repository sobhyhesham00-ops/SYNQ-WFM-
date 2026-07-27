import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { sendGift } from "../modules/gifts/gift.service";
import { enqueue, dequeue, MatchMode, Seeker } from "../modules/chat/matchmaker";

interface AuthedSocket extends Socket {
  userId?: string;
}

// Track which random-chat pair a user is in, so we can relay messages/hangups.
const activeChat = new Map<string, string>(); // userId -> partnerUserId

export function attachRealtime(httpServer: HttpServer, corsOrigin: string) {
  const io = new Server(httpServer, { cors: { origin: corsOrigin } });

  // JWT auth on the socket handshake.
  io.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("unauthorized"));
    try {
      socket.userId = verifyAccessToken(token).sub;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    const userId = socket.userId!;

    // ── Audio rooms ────────────────────────────────────────────────────────────
    socket.on("room:join", async ({ roomId }: { roomId: string }) => {
      socket.join(roomId);

      // Entrance effect: broadcast the user's worn mount/entrance to the room.
      const loadout = await prisma.identityLoadout.findUnique({ where: { userId } });
      const profile = await prisma.profile.findUnique({ where: { userId } });
      socket.to(roomId).emit("room:entrance", {
        userId,
        displayName: profile?.displayName,
        entranceId: loadout?.entranceId ?? null,
      });

      io.to(roomId).emit("room:presence", { userId, joined: true });
    });

    socket.on("room:leave", ({ roomId }: { roomId: string }) => {
      socket.leave(roomId);
      io.to(roomId).emit("room:presence", { userId, joined: false });
    });

    socket.on("room:message", ({ roomId, text }: { roomId: string; text: string }) => {
      // TODO(safety): run text through the profanity/abuse filter before fan-out.
      io.to(roomId).emit("room:message", { userId, text, at: Date.now() });
    });

    // Send a gift inside a live room → transactional + broadcast animation.
    socket.on("gift:send", async (p: { roomId: string; receiverId: string; giftId: string; quantity?: number }) => {
      try {
        const result = await sendGift({
          senderId: userId,
          receiverId: p.receiverId,
          giftId: p.giftId,
          quantity: p.quantity,
          roomId: p.roomId,
        });
        io.to(p.roomId).emit("gift:recv", { senderId: userId, receiverId: p.receiverId, ...result });
        socket.emit("wallet:update", { coins: result.senderCoins });
        if (result.broadcast) io.emit("gift:broadcast", { senderId: userId, ...result }); // global banner
      } catch (e: any) {
        socket.emit("gift:error", { message: e?.message ?? "Gift failed" });
      }
    });

    // ── Random chat matchmaking (language-aware) ────────────────────────────────
    socket.on("match:enqueue", async (opts: { mode?: MatchMode; excludeLanguages?: string[] }) => {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        include: { languages: true },
      });
      const seeker: Seeker = {
        userId,
        socketId: socket.id,
        languages: [
          ...(profile?.primaryLanguage ? [profile.primaryLanguage] : []),
          ...(profile?.languages.map((l) => l.language) ?? []),
        ],
        learning: profile?.learningLanguages ?? [],
        mode: opts?.mode ?? "same",
        excludeLanguages: opts?.excludeLanguages ?? [],
        enqueuedAt: Date.now(),
      };

      const pair = enqueue(seeker);
      if (pair) {
        activeChat.set(pair.a.userId, pair.b.userId);
        activeChat.set(pair.b.userId, pair.a.userId);
        const payload = { sharedLanguages: pair.sharedLanguages, mode: pair.mode };
        io.to(pair.a.socketId).emit("match:found", { partnerId: pair.b.userId, ...payload });
        io.to(pair.b.socketId).emit("match:found", { partnerId: pair.a.userId, ...payload });
      } else {
        socket.emit("match:waiting");
      }
    });

    socket.on("match:message", ({ text }: { text: string }) => {
      const partnerId = activeChat.get(userId);
      if (!partnerId) return;
      // TODO(safety): moderation filter.
      io.to(partnerRoom(io, partnerId)).emit("match:message", { from: userId, text, at: Date.now() });
    });

    socket.on("match:skip", () => endChat(io, userId));

    socket.on("disconnect", () => {
      dequeue(userId);
      endChat(io, userId);
    });
  });

  return io;
}

// Find a user's socket room (each socket auto-joins a room named by its own id).
function partnerRoom(io: Server, userId: string): string {
  for (const [id, s] of io.sockets.sockets) {
    if ((s as AuthedSocket).userId === userId) return id;
  }
  return userId;
}

function endChat(io: Server, userId: string) {
  const partnerId = activeChat.get(userId);
  if (!partnerId) return;
  activeChat.delete(userId);
  activeChat.delete(partnerId);
  io.to(partnerRoom(io, partnerId)).emit("match:ended", { by: userId });
}
