import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';

// Carica le variabili d'ambiente
dotenv.config();

// Use SQLite for development
const sqlite = new Database('database.sqlite');
export const db = drizzle(sqlite, { schema });
