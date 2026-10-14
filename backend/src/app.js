import cors from "cors";
import express from "express";
import comparisonRoutes from "./routes/comparisonRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

/** Parses the CORS_ORIGIN env var into what the `cors` package wants.
 *
 * Accepts a comma-separated list, which is what you need in practice: your
 * deployed frontend URL alongside http://localhost:5173 so you can still run the
 * Vite dev server against the deployed API.
 *
 * A wildcard is deliberately not the fallback in production — "*" and
 * credentials do not mix, and an open API invites other people's pages to call
 * yours. */
function parseOrigin(corsOrigin) {
  if (!corsOrigin) return "http://localhost:5173";
  const list = corsOrigin
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return list.length === 1 ? list[0] : list;
}

/** Builds the Express app. Deliberately does NOT call app.listen().
 *
 * Splitting "build the app" from "start the server" is what lets the same app
 * be used three ways: `node src/server.js` locally, Vercel's serverless handler,
 * and a test suite that imports it with no port binding at all.
 *
 * `beforeRoutes` is how the serverless handler injects its lazy database
 * connection. It is a parameter rather than something the caller appends
 * afterwards because Express runs middleware in registration order: anything
 * added after this function returns would sit *behind* the 404 handler and never
 * run. That bug looks like every route 404ing while the database is fine. */
export function createApp({ corsOrigin, beforeRoutes } = {}) {
  const app = express();

  // Vercel terminates TLS and forwards through a proxy, so Express needs to
  // trust the X-Forwarded-* headers to see the real protocol and client IP.
  app.set("trust proxy", 1);

  app.use(cors({ origin: parseOrigin(corsOrigin) }));

  // Built-in body parsers. Note they do NOT handle multipart/form-data — that is
  // multer's job in the route itself.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      uptime: Math.round(process.uptime()),
      ai: process.env.LABD_API_KEY ? "configured" : "not configured",
    });
  });

  // Injected connection middleware, before any route that needs the database.
  if (beforeRoutes) app.use(beforeRoutes);

  app.use("/api/comparisons", comparisonRoutes);

  // Order matters: 404 first, then the error handler, both after every route.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
