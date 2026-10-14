/* Loads backend/.env regardless of where the process was started from.
 *
 * The one-line `import "dotenv/config"` is the usual approach, but it resolves
 * `.env` against the *current working directory*. Start the server from the repo
 * root (`node backend/src/server.js`) and it finds nothing, and every value
 * silently falls back to a default — which looks like the config is being
 * ignored rather than missing.
 *
 * Resolving from this file's own location means the same .env is used whether
 * you run `npm run dev` inside backend/, or the file directly from anywhere.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = dirname(fileURLToPath(import.meta.url)); // backend/src/config
export const BACKEND_ROOT = resolve(here, "..", ".."); // backend/

dotenv.config({ path: resolve(BACKEND_ROOT, ".env") });

/* Fail loudly on a missing database URI instead of quietly connecting to
 * localhost. A typo'd key name in .env otherwise produces a confusing
 * "ECONNREFUSED 127.0.0.1:27017" that has nothing to do with the real problem. */
export function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Create ${resolve(BACKEND_ROOT, ".env")} with ${name}=... (see .env.example)`
    );
  }
  return value;
}
