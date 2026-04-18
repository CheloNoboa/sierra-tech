/**
 * ============================================================================
 * 📌 Archivo: src/lib/connectToDB.ts
 * ============================================================================
 *
 * ES:
 * - Conexión única a MongoDB (HMR-safe)
 * - Base de datos oficial: sierratech
 * - Sin seeds ni lógica adicional
 *
 * EN:
 * - Single MongoDB connection (HMR-safe)
 * - Official database: sierratech
 * - No seeds or side effects
 * ============================================================================
 */

import mongoose, { Mongoose } from "mongoose";

/* -------------------------------------------------------------------------- */
/* ENV                                                                        */
/* -------------------------------------------------------------------------- */

const MONGO_URI: string = process.env.MONGO_URI || "";

if (!MONGO_URI) {
	throw new Error("❌ Missing MONGO_URI in environment variables");
}

/* -------------------------------------------------------------------------- */
/* Global cache                                                               */
/* -------------------------------------------------------------------------- */

interface MongooseCache {
	conn: Mongoose | null;
	promise: Promise<Mongoose> | null;
}

const globalForMongoose = globalThis as unknown as {
	mongoose?: MongooseCache;
};

const cached: MongooseCache = globalForMongoose.mongoose || {
	conn: null,
	promise: null,
};

/* -------------------------------------------------------------------------- */
/* Connect                                                                    */
/* -------------------------------------------------------------------------- */

export async function connectToDB(): Promise<Mongoose> {
	if (cached.conn) return cached.conn;

	if (!cached.promise) {
		cached.promise = mongoose
			.connect(MONGO_URI, {
				dbName: "sierratech", // ✅ FIX CRÍTICO
			})
			.then((mongooseInstance) => {
				console.log("🔗 MongoDB connected → sierratech");
				return mongooseInstance;
			})
			.catch((err) => {
				console.error("❌ MongoDB connection error:", err);
				throw err;
			});
	}

	cached.conn = await cached.promise;
	globalForMongoose.mongoose = cached;

	return cached.conn;
}

export const connectDB = connectToDB;
