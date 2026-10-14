import { requiredEnv } from "./config/env.js";
import { createApp } from "./app.js";
import { connectDb, disconnectDb } from "./config/db.js";

const PORT = Number(process.env.PORT) || 4000;

async function start() {
  /* Resolved inside start() rather than at module scope, so a missing value is
   * caught by the .catch() below and reported as a sentence instead of throwing
   * at import time with a raw stack trace. */
  const MONGO_URI = requiredEnv("MONGO_URI");

  // Connect before listening: starting the server first would mean a brief
  // window where requests arrive with no database behind them.
  await connectDb(MONGO_URI);

  const app = createApp({ corsOrigin: process.env.CORS_ORIGIN });
  const server = app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
    console.log(`[server] health check: http://localhost:${PORT}/api/health`);
  });

  // Without this, Ctrl+C leaves the port held until the process is killed
  // outright, and the next `npm run dev` fails with EADDRINUSE.
  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((err) => {
  console.error("[server] failed to start:", err.message);
  if (err.message.includes("ECONNREFUSED")) {
    console.error(
      "[server] is MongoDB reachable? Start it locally, or check MONGO_URI in backend/.env"
    );
  }
  process.exit(1);
});
