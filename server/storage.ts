import { 
  users, businesses, invoices, taxCalculations, paymentDeadlines,
  type User, type InsertUser,
  type Business, type InsertBusiness,
  type Invoice, type InsertInvoice,
  type TaxCalculation, type InsertTaxCalculation,
  type PaymentDeadline, type InsertPaymentDeadline
} from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private businesses: Map<number, Business>;
  private invoices: Map<number, Invoice>;
  private taxCalculations: Map<number, TaxCalculation>;
  private paymentDeadlines: Map<number, PaymentDeadline>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.businesses = new Map();
    this.invoices = new Map();
    this.taxCalculations = new Map();
    this.paymentDeadlines = new Map();
    this.currentId = 1;
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  // Businesses
  async getBusinessesByUserId(userId: number): Promise<Business[]> {
    return Array.from(this.businesses.values()).filter(business => business.userId === userId);
  }

  async getBusiness(id: number): Promise<Business | undefined> {
    return this.businesses.get(id);
  }

  async createBusiness(insertBusiness: InsertBusiness): Promise<Business> {
    const id = this.currentId++;
    const business: Business = {
      ...insertBusiness,
      id,
      createdAt: new Date()
    };
    this.businesses.set(id, business);
    return business;
  }

  async updateBusiness(id: number, updates: Partial<Business>): Promise<Business | undefined> {
    const business = this.businesses.get(id);
    if (!business) return undefined;
    
    const updated = { ...business, ...updates };
    this.businesses.set(id, updated);
    return updated;
  }

  async deleteBusiness(id: number): Promise<boolean> {
    return this.businesses.delete(id);
  }

  // Invoices
  async getInvoicesByBusinessId(businessId: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(invoice => invoice.businessId === businessId);
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = this.currentId++;
    const invoice: Invoice = {
      ...insertInvoice,
      id,
      createdAt: new Date()
    };
    this.invoices.set(id, invoice);
    return invoice;
  }

  async updateInvoice(id: number, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    
    const updated = { ...invoice, ...updates };
    this.invoices.set(id, updated);
    return updated;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    return this.invoices.delete(id);
  }

  // Tax Calculations
  async getTaxCalculationsByBusinessId(businessId: number): Promise<TaxCalculation[]> {
    return Array.from(this.taxCalculations.values()).filter(calc => calc.businessId === businessId);
  }

  async createTaxCalculation(insertCalculation: InsertTaxCalculation): Promise<TaxCalculation> {
    const id = this.currentId++;
    const calculation: TaxCalculation = {
      ...insertCalculation,
      id,
      createdAt: new Date()
    };
    this.taxCalculations.set(id, calculation);
    return calculation;
  }

  // Payment Deadlines
  async getPaymentDeadlinesByBusinessId(businessId: number): Promise<PaymentDeadline[]> {
    return Array.from(this.paymentDeadlines.values()).filter(deadline => deadline.businessId === businessId);
  }

  async getUpcomingDeadlines(userId: number): Promise<PaymentDeadline[]> {
    const userBusinesses = await this.getBusinessesByUserId(userId);
    const businessIds = userBusinesses.map(b => b.id);
    
    return Array.from(this.paymentDeadlines.values())
      .filter(deadline => businessIds.includes(deadline.businessId) && !deadline.isPaid)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  async createPaymentDeadline(insertDeadline: InsertPaymentDeadline): Promise<PaymentDeadline> {
    const id = this.currentId++;
    const deadline: PaymentDeadline = {
      ...insertDeadline,
      id,
      createdAt: new Date()
    };
    this.paymentDeadlines.set(id, deadline);
    return deadline;
  }

  async updatePaymentDeadline(id: number, updates: Partial<PaymentDeadline>): Promise<PaymentDeadline | undefined> {
    const deadline = this.paymentDeadlines.get(id);
    if (!deadline) return undefined;
    
    const updated = { ...deadline, ...updates };
    this.paymentDeadlines.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
