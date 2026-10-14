/* Entry point, two ways.
 *
 * On Vercel this file is loaded as a serverless function: the platform invokes
 * the default export with (req, res), so nothing may bind a port. Locally
 * `npm run dev` reaches the `if (!isVercel)` branch and calls listen() as before.
 *
 * The check uses VERCEL, which Vercel injects automatically, so deploying needs
 * no config change to switch behaviour.
 */
import { requiredEnv } from "./config/env.js";
import { createApp } from "./app.js";
import { connectDb, disconnectDb } from "./config/db.js";

const PORT = Number(process.env.PORT) || 4000;
const isVercel = Boolean(process.env.VERCEL);

/* The connection middleware for serverless mode.
 *
 * It is passed into createApp as `beforeRoutes` rather than appended afterwards,
 * because Express runs middleware in registration order — a middleware registered
 * after createApp() returns would sit behind the 404 handler, and every request
 * would 404 while the database was perfectly fine.
 *
 * Calling connectDb on every request is safe: it caches its promise, so only the
 * first invocation in a container actually opens a connection. */
const connectOnce = async (req, res, next) => {
  try {
    await connectDb(requiredEnv("MONGO_URI"));
    next();
  } catch (err) {
    next(err);
  }
};

function appWithDb(extra = {}) {
  return createApp({ corsOrigin: process.env.CORS_ORIGIN, ...extra });
}

/* On Vercel there is no boot phase to hook into, so this module-level export is
 * the function handler itself. Everything above is definitions only; no side
 * effects run at import time. */
export default appWithDb({ beforeRoutes: connectOnce });

// ---------------------------------------------------------------------------
// Local development only.
// ---------------------------------------------------------------------------
async function start() {
  /* Resolved inside start() rather than at module scope, so a missing value is
   * caught by the .catch() below and reported as a sentence instead of throwing
   * at import time with a raw stack trace. */
  const MONGO_URI = requiredEnv("MONGO_URI");

  // Connect before listening: starting the server first would mean a brief
  // window where requests arrive with no database behind them. It is already
  // connected by the time the first request arrives, so no per-request
  // middleware is needed here — this is the long-running path.
  await connectDb(MONGO_URI);

  const app = appWithDb();
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

if (!isVercel) {
  start().catch((err) => {
    console.error("[server] failed to start:", err.message);
    if (err.message.includes("ECONNREFUSED")) {
      console.error(
        "[server] is MongoDB reachable? Start it locally, or check MONGO_URI in backend/.env"
      );
    }
    process.exit(1);
  });
}
