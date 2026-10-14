/* One place that knows how to talk to the backend.
 *
 * In dev, requests go to the relative path "/api/..." and Vite proxies them to
 * the Express server (see vite.config.js). That keeps the browser on a single
 * origin, so CORS never comes into play locally. Set VITE_API_URL to point at a
 * deployed API when the frontend is hosted separately.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "";

/** Pulls the server's { error } message out of a failed response. */
async function readError(res) {
  try {
    const body = await res.json();
    return body?.error || `Request failed (${res.status})`;
  } catch {
    // A non-JSON body means something upstream failed — an HTML error page from
    // a proxy, or the server dying mid-response.
    return `Request failed (${res.status})`;
  }
}

/**
 * Sends the resume and job description for comparison.
 * @param {{ file: File, jobDescription: string }} input
 * @returns {Promise<object>} the comparison record
 */
export async function compareResume({ file, jobDescription }) {
  const form = new FormData();
  // "resume" and "jobDescription" must match the multer field name and the
  // req.body key on the server exactly.
  form.append("resume", file);
  form.append("jobDescription", jobDescription);

  const res = await fetch(`${API_BASE}/api/comparisons`, {
    method: "POST",
    body: form,
    // No Content-Type header on purpose: the browser sets it, including the
    // multipart boundary. Setting it by hand omits the boundary and multer then
    // cannot parse the body.
  });

  if (!res.ok) throw new Error(await readError(res));

  const { comparison } = await res.json();
  return comparison;
}

export async function listComparisons(limit = 20) {
  const res = await fetch(`${API_BASE}/api/comparisons?limit=${limit}`);
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}
