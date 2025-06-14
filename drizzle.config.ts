import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

// IMPORTANTE: Carica dotenv prima di tutto
dotenv.config();

console.log("DATABASE_URL in drizzle.config:", process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
