/* Client for labd, The Dev Labs' assistant API.
 *
 * Keep the key on the server: labd does not answer browsers on other sites, so a
 * key shipped in a web page is a key any visitor can copy. That is why this call
 * lives here and never in the frontend.
 *
 * The endpoint is stateless — nothing is remembered between requests, so any
 * earlier turns have to be sent again in `messages` when you want a
 * conversation. This service always sends a single self-contained prompt.
 *
 * Every answer spends the same allowance as labd in the portal, the editor and
 * the terminal. That is the reason for the caching in comparisonController: a
 * score for identical inputs should not be paid for twice.
 */

const ENDPOINT = "https://agent.thedevlabs.io/v1/api/chat";

/* Documented status codes, mapped to something a learner can act on. The raw
 * code alone would be an unhelpful "Request failed (402)". */
const STATUS_MESSAGES = {
  401: "labd rejected the API key — check LABD_API_KEY, it may have been rotated or revoked.",
  402: "The labd allowance is used up. Top up at learn.thedevlabs.io/settings#get-more-labd.",
  403: "The labd API is switched off for this account.",
  429: "Too many labd requests this minute — try again shortly.",
};

export class LabdError extends Error {
  constructor(message, { status, retryable = false } = {}) {
    super(message);
    this.name = "LabdError";
    this.status = status;
    // The caller decides whether a retry is honest: 429 and 5xx are worth one
    // more attempt, a 401 will fail identically every time.
    this.retryable = retryable;
  }
}

/**
 * Sends one prompt and returns labd's reply.
 *
 * @param {string} content the user message
 * @param {{ apiKey: string, timeoutMs?: number }} options
 * @returns {Promise<{ text: string, percentLeft: number|null }>}
 */
export async function askLabd(content, { apiKey, timeoutMs = 45_000 }) {
  if (!apiKey) {
    throw new LabdError(
      "LABD_API_KEY is not set. Add it to backend/.env (and to the Vercel project's environment variables)."
    );
  }

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content }],
      }),
      // Without a timeout a slow model call holds the serverless function open
      // until the platform kills it, and the client sees a hang rather than an
      // error. AbortSignal.timeout is the built-in way to bound that.
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const timedOut = err.name === "TimeoutError" || err.name === "AbortError";
    throw new LabdError(
      timedOut
        ? `labd did not answer within ${Math.round(timeoutMs / 1000)}s.`
        : `Could not reach labd: ${err.message}`,
      { retryable: true }
    );
  }

  if (!res.ok) {
    throw new LabdError(
      STATUS_MESSAGES[res.status] ?? `labd request failed (${res.status}).`,
      { status: res.status, retryable: res.status === 429 || res.status >= 500 }
    );
  }

  let body;
  try {
    body = await res.json();
  } catch {
    // A non-JSON body means the request never reached the API — typically a
    // proxy or login page in front of it.
    throw new LabdError("labd returned a non-JSON response.", { retryable: true });
  }

  const text = body?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new LabdError("labd returned an empty reply.", { retryable: true });
  }

  return {
    text,
    percentLeft: body?.credits?.percentLeft ?? null,
  };
}
