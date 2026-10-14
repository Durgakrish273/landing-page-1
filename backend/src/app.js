import cors from "cors";
import express from "express";
import comparisonRoutes from "./routes/comparisonRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

export function createApp({ corsOrigin }) {
  const app = express();

  /* The dev setup is two origins — the Vite server on :5173 talking to this API
   * on :4000 — so the browser enforces CORS and needs this header. Accepts a
   * comma-separated list, which matters once there is a deployed frontend URL
   * alongside the localhost one. */
  app.use(
    cors({
      origin: corsOrigin
        ? corsOrigin.split(",").map((o) => o.trim())
        : "http://localhost:5173",
    })
  );

  // Built-in body parsers. Note they do NOT handle multipart/form-data — that is
  // multer's job in the route itself.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      uptime: Math.round(process.uptime()),
      ai: "not wired up yet", // so the frontend can tell what it is talking to
    });
  });

  app.use("/api/comparisons", comparisonRoutes);

  // Order matters: 404 first, then the error handler, both after every route.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
