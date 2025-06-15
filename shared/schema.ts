import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const businesses = sqliteTable("businesses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  businessName: text("business_name").notNull(),
  macroCategory: text("macro_category").notNull(), // 'FOOD_COMMERCE', 'STREET_COMMERCE', etc.
  atecoCode: text("ateco_code"),
  startDate: text("start_date").notNull(),
  isStartup: integer("is_startup", { mode: 'boolean' }).default(false),
  contributionRegime: text("contribution_regime").notNull(), // 'IVS_ARTIGIANI', 'IVS_COMMERCIANTI', 'GESTIONE_SEPARATA'
  contributionReduction: text("contribution_reduction").default("NONE"), // 'NONE', '35', '50'
  hasOtherCoverage: integer("has_other_coverage", { mode: 'boolean' }).default(false),
  currentBalance: real("current_balance").default(0),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  businessId: integer("business_id").notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const taxCalculations = sqliteTable("tax_calculations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  businessId: integer("business_id").notNull(),
  year: integer("year").notNull(),
  revenue: real("revenue").notNull(),
  taxableIncome: real("taxable_income").notNull(),
  taxRate: real("tax_rate").notNull(),
  taxAmount: real("tax_amount").notNull(),
  inpsAmount: real("inps_amount").notNull(),
  totalDue: real("total_due").notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const paymentDeadlines = sqliteTable("payment_deadlines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  businessId: integer("business_id").notNull(),
  dueDate: text("due_date").notNull(),
  paymentType: text("payment_type").notNull(), // 'TAX_BALANCE', 'TAX_ADVANCE_1', 'TAX_ADVANCE_2', 'INPS_Q1', etc.
  amount: real("amount").notNull(),
  isPaid: integer("is_paid", { mode: 'boolean' }).default(false),
  paidDate: text("paid_date"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  companyName: text("company_name"),
  vatNumber: text("vat_number"),
  businessSector: text("business_sector").notNull(),
  revenue: real("revenue"),
  category: text("category"),
  startDate: text("start_date"),
  isStartup: integer("is_startup", { mode: 'boolean' }),
  contributionRegime: text("contribution_regime"),
  status: text("status").default("NEW"), // NEW, CONTACTED, CONVERTED, LOST
  notes: text("notes"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
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

export const insertLeadSchema = createInsertSchema(leads).omit({
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

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;