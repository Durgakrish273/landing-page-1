/* Central error handler. Must be registered LAST and must keep all four
 * arguments — Express identifies error middleware by arity, so dropping `next`
 * silently turns this into an ordinary handler that never runs on errors. */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // Multer's own errors carry a `code` rather than a status.
  const multerStatus =
    err.code === "LIMIT_FILE_SIZE"
      ? { status: 413, message: "That file is larger than 5 MB." }
      : null;

  const status = multerStatus?.status ?? err.status ?? 500;
  const message =
    multerStatus?.message ?? err.message ?? "Something went wrong.";

  if (status >= 500) console.error("[error]", err);

  res.status(status).json({ error: message });
}

/** Turns an unknown path into a JSON 404 rather than Express's HTML default,
 *  so the frontend never has to parse an HTML error page. */
export function notFound(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
}
