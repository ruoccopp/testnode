import { 
  users, businesses, invoices, taxCalculations, paymentDeadlines, leads,
  type User, type InsertUser,
  type Business, type InsertBusiness,
  type Invoice, type InsertInvoice,
  type TaxCalculation, type InsertTaxCalculation,
  type PaymentDeadline, type InsertPaymentDeadline,
  type Lead, type InsertLead
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Businesses
  getBusinessesByUserId(userId: number): Promise<Business[]>;
  getBusiness(id: number): Promise<Business | undefined>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusiness(id: number, business: Partial<Business>): Promise<Business | undefined>;
  deleteBusiness(id: number): Promise<boolean>;

  // Invoices
  getInvoicesByBusinessId(businessId: number): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<Invoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;

  // Tax Calculations
  getTaxCalculationsByBusinessId(businessId: number): Promise<TaxCalculation[]>;
  createTaxCalculation(calculation: InsertTaxCalculation): Promise<TaxCalculation>;

  // Payment Deadlines
  getPaymentDeadlinesByBusinessId(businessId: number): Promise<PaymentDeadline[]>;
  getUpcomingDeadlines(userId: number): Promise<PaymentDeadline[]>;
  createPaymentDeadline(deadline: InsertPaymentDeadline): Promise<PaymentDeadline>;
  updatePaymentDeadline(id: number, deadline: Partial<PaymentDeadline>): Promise<PaymentDeadline | undefined>;

  // Leads
  getAllLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, lead: Partial<Lead>): Promise<Lead | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Businesses
  async getBusinessesByUserId(userId: number): Promise<Business[]> {
    return await db.select().from(businesses).where(eq(businesses.userId, userId));
  }

  async getBusiness(id: number): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, id));
    return business || undefined;
  }

  async createBusiness(insertBusiness: InsertBusiness): Promise<Business> {
    const [business] = await db
      .insert(businesses)
      .values(insertBusiness)
      .returning();
    return business;
  }

  async updateBusiness(id: number, updates: Partial<Business>): Promise<Business | undefined> {
    const [business] = await db
      .update(businesses)
      .set(updates)
      .where(eq(businesses.id, id))
      .returning();
    return business || undefined;
  }

  async deleteBusiness(id: number): Promise<boolean> {
    const result = await db.delete(businesses).where(eq(businesses.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Invoices
  async getInvoicesByBusinessId(businessId: number): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.businessId, businessId));
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db
      .insert(invoices)
      .values(insertInvoice)
      .returning();
    return invoice;
  }

  async updateInvoice(id: number, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const [invoice] = await db
      .update(invoices)
      .set(updates)
      .where(eq(invoices.id, id))
      .returning();
    return invoice || undefined;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    const result = await db.delete(invoices).where(eq(invoices.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Tax Calculations
  async getTaxCalculationsByBusinessId(businessId: number): Promise<TaxCalculation[]> {
    return await db.select().from(taxCalculations).where(eq(taxCalculations.businessId, businessId));
  }

  async createTaxCalculation(insertCalculation: InsertTaxCalculation): Promise<TaxCalculation> {
    const [calculation] = await db
      .insert(taxCalculations)
      .values(insertCalculation)
      .returning();
    return calculation;
  }

  // Payment Deadlines
  async getPaymentDeadlinesByBusinessId(businessId: number): Promise<PaymentDeadline[]> {
    return await db.select().from(paymentDeadlines).where(eq(paymentDeadlines.businessId, businessId));
  }

  async getUpcomingDeadlines(userId: number): Promise<PaymentDeadline[]> {
    const userBusinesses = await this.getBusinessesByUserId(userId);
    const businessIds = userBusinesses.map(b => b.id);

    if (businessIds.length === 0) return [];

    return await db.select()
      .from(paymentDeadlines)
      .where(eq(paymentDeadlines.isPaid, false));
  }

  async createPaymentDeadline(insertDeadline: InsertPaymentDeadline): Promise<PaymentDeadline> {
    const [deadline] = await db
      .insert(paymentDeadlines)
      .values(insertDeadline)
      .returning();
    return deadline;
  }

  async updatePaymentDeadline(id: number, updates: Partial<PaymentDeadline>): Promise<PaymentDeadline | undefined> {
    const [deadline] = await db
      .update(paymentDeadlines)
      .set(updates)
      .where(eq(paymentDeadlines.id, id))
      .returning();
    return deadline || undefined;
  }

  async getRecentActivity(userId: number): Promise<any[]> {
    const activities = [];

    // Get recent invoices
    const recentInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.businessId, userId))
      .orderBy(desc(invoices.createdAt))
      .limit(5);

    activities.push(...recentInvoices.map((invoice: any) => ({
      id: `invoice-${invoice.id}`,
      type: 'invoice',
      description: `Fattura #${invoice.number} - ${invoice.clientName}`,
      amount: invoice.total,
      date: invoice.createdAt,
    })));

    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Leads methods
  async createLead(leadData: any) {
    const [lead] = await db
      .insert(leads)
      .values(leadData)
      .returning();
    return lead;
  }

  async getAllLeads(): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .orderBy(desc(leads.createdAt));
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id));
    return lead || undefined;
  }

  async updateLead(id: number, updates: Partial<Lead>): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return lead || undefined;
  }

  async deleteLead(id: number): Promise<boolean> {
    await db
      .delete(leads)
      .where(eq(leads.id, id));
    return true;
  }

  async getLeadsStats() {
    const allLeads = await this.getAllLeads();
    const total = allLeads.length;
    const thisMonth = allLeads.filter((lead: Lead) => {
      const leadDate = new Date(lead.createdAt!);
      const now = new Date();
      return leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
    }).length;

    const statusCounts = allLeads.reduce((acc: Record<string, number>, lead: Lead) => {
      acc[lead.status!] = (acc[lead.status!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      thisMonth,
      new: statusCounts.NEW || 0,
      contacted: statusCounts.CONTACTED || 0,
      converted: statusCounts.CONVERTED || 0,
      lost: statusCounts.LOST || 0,
    };
  }
}

export const storage = new DatabaseStorage();