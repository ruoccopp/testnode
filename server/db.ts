import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

import { integer, real, sqliteTable, text, sql } from "drizzle-orm/sqlite-core";

export const businesses = sqliteTable("businesses", {
  id: integer("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  vatNumber: text("vat_number"),
  fiscalCode: text("fiscal_code"),
  address: text("address"),
  macroCategory: text("macro_category").notNull(),
  startDate: text("start_date").notNull(),
  isStartup: integer("is_startup", { mode: "boolean" }).default(false),
  contributionRegime: text("contribution_regime").notNull(),
  contributionReduction: text("contribution_reduction").default("NONE"),
  hasOtherCoverage: integer("has_other_coverage", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  businessSector: text("business_sector").notNull(),
  revenue: real("revenue"),
  category: text("category"),
  startDate: text("start_date"),
  isStartup: integer("is_startup", { mode: "boolean" }),
  contributionRegime: text("contribution_regime"),
  status: text("status").default("NEW"), // NEW, CONTACTED, CONVERTED, LOST
  notes: text("notes"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});


if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });