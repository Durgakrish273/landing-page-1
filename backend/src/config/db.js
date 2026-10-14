import dns from "node:dns";
import mongoose from "mongoose";

/* Node 18+ resolves localhost to ::1 (IPv6) first, and a MongoDB listening only
 * on 127.0.0.1 then refuses the connection. Setting this once, before any
 * connection is made, keeps `mongodb://localhost:27017` working. */
dns.setDefaultResultOrder("ipv4first");

/** Opens the one shared connection. Called once from server.js at boot. */
export async function connectDb(uri) {
  mongoose.connection.on("connected", () =>
    console.log("[db] connected to MongoDB")
  );
  mongoose.connection.on("error", (err) =>
    console.error("[db] connection error:", err.message)
  );
  mongoose.connection.on("disconnected", () =>
    console.warn("[db] disconnected")
  );

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000, // fail fast instead of hanging on boot
  });

  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.connection.close();
}
