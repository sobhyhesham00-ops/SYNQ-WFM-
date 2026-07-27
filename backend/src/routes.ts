import { Router } from "express";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { roomsRouter } from "./modules/rooms/rooms.routes";
import { giftsRouter } from "./modules/gifts/gifts.routes";
import { walletRouter } from "./modules/wallet/wallet.routes";
import { identityRouter } from "./modules/identity/identity.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/rooms", roomsRouter);
apiRouter.use("/gifts", giftsRouter);
apiRouter.use("/wallet", walletRouter);
apiRouter.use("/identity", identityRouter);
