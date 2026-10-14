/* Client-side presentation helpers.
 *
 * This file no longer scores anything — the score comes from the API. What is
 * left is formatting, the gauge geometry, and the upload check. */

export function formatSize(bytes) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

/* Kept in step with the server's limit in backend/src/middleware/upload.js.
 * Checking here too is a courtesy, not security: it saves a 5 MB round trip to
 * be told no, but the server must still enforce it, because a client can always
 * be bypassed. */
export const MAX_BYTES = 5 * 1024 * 1024;

/** Returns an error message, or null when the file is acceptable. */
export function validateFile(file) {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return `"${file.name}" is not a PDF. Upload a .pdf file.`;
  if (file.size > MAX_BYTES) return "That file is larger than 5 MB. Try a smaller PDF.";
  return null;
}

/* The gauge colour, derived on the client from the server's score. */
export function scoreTone(score) {
  if (score >= 75) return "good";
  if (score >= 55) return "ok";
  return "bad";
}

export const GAUGE_RADIUS = 52;
export const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;
