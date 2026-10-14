import dns from "node:dns";
import mongoose from "mongoose";

/* Node 18+ resolves localhost to ::1 (IPv6) first, and a MongoDB listening only
 * on 127.0.0.1 then refuses the connection. Setting this once, before any
 * connection is made, keeps `mongodb://localhost:27017` working. */
dns.setDefaultResultOrder("ipv4first");

/* Cached across invocations, which is what makes this work on Vercel.
 *
 * A serverless function's container is reused for later requests, and Node
 * caches the module registry between them. Without the cache below, every
 * invocation would call mongoose.connect() again; Atlas eventually refuses new
 * connections and the function starts timing out. The promise is cached rather
 * than the connection, so concurrent cold requests all await the same one
 * handshake instead of racing to open several.
 *
 * On a long-running server this is harmless — start() calls it once at boot. */
let connectionPromise = null;

export function connectDb(uri) {
  if (connectionPromise) return connectionPromise;

  mongoose.connection.on("connected", () =>
    console.log("[db] connected to MongoDB")
  );
  mongoose.connection.on("error", (err) =>
    console.error("[db] connection error:", err.message)
  );
  mongoose.connection.on("disconnected", () => console.warn("[db] disconnected"));

  connectionPromise = mongoose
    .connect(uri, {
      // Fail fast instead of hanging until the platform's own timeout.
      serverSelectionTimeoutMS: 5000,
    })
    .catch((err) => {
      // Do NOT keep a rejected promise cached: the next request would fail
      // instantly forever, even after the database came back. Clearing it means
      // the following request gets a fresh attempt.
      connectionPromise = null;
      throw err;
    });

  return connectionPromise;
}

export async function disconnectDb() {
  if (!connectionPromise) return;
  await mongoose.connection.close();
  connectionPromise = null;
}
