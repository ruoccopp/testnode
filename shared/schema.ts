import { pgTable, text, serial, integer, boolean, decimal, date, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  businessName: text("business_name").notNull(),
  macroCategory: text("macro_category").notNull(), // 'FOOD_COMMERCE', 'STREET_COMMERCE', etc.
  atecoCode: text("ateco_code"),
  startDate: date("start_date").notNull(),
  isStartup: boolean("is_startup").default(false),
  contributionRegime: text("contribution_regime").notNull(), // 'IVS_ARTIGIANI', 'IVS_COMMERCIANTI', 'GESTIONE_SEPARATA'
  contributionReduction: text("contribution_reduction").default("NONE"), // 'NONE', '35', '50'
  hasOtherCoverage: boolean("has_other_coverage").default(false),
  currentBalance: decimal("current_balance", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taxCalculations = pgTable("tax_calculations", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  year: integer("year").notNull(),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).notNull(),
  taxableIncome: decimal("taxable_income", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 4, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull(),
  inpsAmount: decimal("inps_amount", { precision: 10, scale: 2 }).notNull(),
  totalDue: decimal("total_due", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentDeadlines = pgTable("payment_deadlines", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  dueDate: date("due_date").notNull(),
  paymentType: text("payment_type").notNull(), // 'TAX_BALANCE', 'TAX_ADVANCE_1', 'TAX_ADVANCE_2', 'INPS_Q1', etc.
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  isPaid: boolean("is_paid").default(false),
  paidDate: date("paid_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export const insertTaxCalculationSchema = createInsertSchema(taxCalculations).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentDeadlineSchema = createInsertSchema(paymentDeadlines).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type TaxCalculation = typeof taxCalculations.$inferSelect;
export type InsertTaxCalculation = z.infer<typeof insertTaxCalculationSchema>;

export type PaymentDeadline = typeof paymentDeadlines.$inferSelect;
export type InsertPaymentDeadline = z.infer<typeof insertPaymentDeadlineSchema>;

// Lead table
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  companyName: text("company_name"),
  vatNumber: text("vat_number"),
  businessSector: text("business_sector").notNull(),
  revenue: decimal("revenue", { precision: 10, scale: 2 }),
  category: text("category"),
  startDate: text("start_date"),
  isStartup: boolean("is_startup"),
  contributionRegime: text("contribution_regime"),
  status: text("status").default("NEW"), // NEW, CONTACTED, CONVERTED, LOST
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
