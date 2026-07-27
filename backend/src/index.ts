import { createServer } from "http";
import { createApp } from "./app";
import { attachRealtime } from "./realtime/socket";
import { env } from "./config/env";

const app = createApp();
const httpServer = createServer(app);

attachRealtime(httpServer, env.corsOrigin);

httpServer.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`🌙 Aura API listening on http://localhost:${env.port}  (env: ${env.nodeEnv})`);
});
