import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertBusinessSchema, insertInvoiceSchema, insertTaxCalculationSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail, generateReportEmailHTML } from './email';
import * as XLSX from 'xlsx';

import { TaxCalculator, validateTaxInput, type TaxCalculationInput } from '@shared/lib/tax-calculator';


const JWT_SECRET = process.env.JWT_SECRET || "my-development-secret-key-change-in-production-2024";

// Middleware for JWT authentication
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });

      // Generate token
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET);

      res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
    } catch (error) {
      res.status(400).json({ message: "Registration failed", error });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET);

      res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
    } catch (error) {
      res.status(400).json({ message: "Login failed", error });
    }
  });

  app.get("/api/auth/profile", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ id: user.id, email: user.email, name: user.name });
    } catch (error) {
      res.status(500).json({ message: "Failed to get profile", error });
    }
  });

  // Business routes
  app.get("/api/businesses", async (req: any, res) => {
    try {
      const businesses = await storage.getBusinessesByUserId(1); // Demo user ID
      res.json(businesses);
    } catch (error) {
      res.status(500).json({ message: "Failed to get businesses", error });
    }
  });

  app.post("/api/businesses", async (req: any, res) => {
    try {
      const businessData = insertBusinessSchema.parse({
        ...req.body,
        userId: 1, // Demo user ID
        currentBalance: req.body.currentBalance?.toString() || "0"
      });
      
      const business = await storage.createBusiness(businessData);
      res.json(business);
    } catch (error) {
      res.status(400).json({ message: "Failed to create business", error });
    }
  });

  app.put("/api/businesses/:id", authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const business = await storage.getBusiness(id);
      
      if (!business || business.userId !== req.user.userId) {
        return res.status(404).json({ message: "Business not found" });
      }

      const updated = await storage.updateBusiness(id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Failed to update business", error });
    }
  });

  app.delete("/api/businesses/:id", authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const business = await storage.getBusiness(id);
      
      if (!business || business.userId !== req.user.userId) {
        return res.status(404).json({ message: "Business not found" });
      }

      await storage.deleteBusiness(id);
      res.json({ message: "Business deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete business", error });
    }
  });

  // Invoice routes
  app.get("/api/businesses/:businessId/invoices", authenticateToken, async (req: any, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const business = await storage.getBusiness(businessId);
      
      if (!business || business.userId !== req.user.userId) {
        return res.status(404).json({ message: "Business not found" });
      }

      const invoices = await storage.getInvoicesByBusinessId(businessId);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to get invoices", error });
    }
  });

  app.post("/api/businesses/:businessId/invoices", authenticateToken, async (req: any, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const business = await storage.getBusiness(businessId);
      
      if (!business || business.userId !== req.user.userId) {
        return res.status(404).json({ message: "Business not found" });
      }

      const invoiceData = insertInvoiceSchema.parse({
        ...req.body,
        businessId
      });
      
      const invoice = await storage.createInvoice(invoiceData);
      res.json(invoice);
    } catch (error) {
      res.status(400).json({ message: "Failed to create invoice", error });
    }
  });

  app.put("/api/invoices/:id", authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const business = await storage.getBusiness(invoice.businessId);
      if (!business || business.userId !== req.user.userId) {
        return res.status(404).json({ message: "Business not found" });
      }

      const updated = await storage.updateInvoice(id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Failed to update invoice", error });
    }
  });

  app.delete("/api/invoices/:id", authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const business = await storage.getBusiness(invoice.businessId);
      if (!business || business.userId !== req.user.userId) {
        return res.status(404).json({ message: "Business not found" });
      }

      await storage.deleteInvoice(id);
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete invoice", error });
    }
  });

  // Tax calculation routes
  app.post("/api/calculations/tax", async (req: any, res) => {
    try {
      const { businessId, revenue, year, ...taxParams } = req.body;
      
      // Validazione
      const errors = validateTaxInput({ revenue, ...taxParams });
      if (errors.length > 0) {
        return res.status(400).json({ message: errors.join(', ') });
      }
      
      // Prepara input per il calculator
      const calculationInput: TaxCalculationInput = {
        revenue,
        macroCategory: taxParams.macroCategory || 'PROFESSIONAL',
        isStartup: taxParams.isStartup || false,
        startDate: taxParams.startDate || new Date().toISOString(),
        contributionRegime: taxParams.contributionRegime || 'GESTIONE_SEPARATA',
        contributionReduction: taxParams.contributionReduction || 'NONE',
        hasOtherCoverage: taxParams.hasOtherCoverage || false,
        year
      };
      
      // Calcola usando la libreria
      const calculation = TaxCalculator.calculate(calculationInput);
      
      // Salva nel database
      const savedCalculation = await storage.createTaxCalculation({
        businessId,
        year,
        revenue: calculation.revenue.toString(),
        taxableIncome: calculation.taxableIncome.toString(),
        taxRate: calculation.taxRate.toString(),
        taxAmount: calculation.taxAmount.toString(),
        inpsAmount: calculation.inpsAmount.toString(),
        totalDue: calculation.totalDue.toString()
      });

      // Rispondi con i calcoli
      res.json({
        ...savedCalculation,
        revenue: calculation.revenue,
        taxableIncome: calculation.taxableIncome,
        taxRate: calculation.taxRate,
        taxAmount: calculation.taxAmount,
        inpsAmount: calculation.inpsAmount,
        totalDue: calculation.totalDue
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to calculate taxes", error });
    }
  });

  app.get("/api/calculations/history/:businessId", authenticateToken, async (req: any, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const business = await storage.getBusiness(businessId);
      
      if (!business || business.userId !== req.user.userId) {
        return res.status(404).json({ message: "Business not found" });
      }

      const calculations = await storage.getTaxCalculationsByBusinessId(businessId);
      res.json(calculations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get calculation history", error });
    }
  });

  // Deadline routes
  app.get("/api/deadlines/:businessId", authenticateToken, async (req: any, res) => {
    try {
      const businessId = parseInt(req.params.businessId);
      const business = await storage.getBusiness(businessId);
      
      if (!business || business.userId !== req.user.userId) {
        return res.status(404).json({ message: "Business not found" });
      }

      const deadlines = await storage.getPaymentDeadlinesByBusinessId(businessId);
      res.json(deadlines);
    } catch (error) {
      res.status(500).json({ message: "Failed to get deadlines", error });
    }
  });

  app.get("/api/deadlines/upcoming", async (req: any, res) => {
    try {
      const deadlines = await storage.getUpcomingDeadlines(1); // Demo user ID
      res.json(deadlines);
    } catch (error) {
      res.status(500).json({ message: "Failed to get upcoming deadlines", error });
    }
  });

  app.put("/api/deadlines/:id/pay", authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const deadline = await storage.updatePaymentDeadline(id, {
        isPaid: true,
        paidDate: new Date().toISOString().split('T')[0]
      });
      
      if (!deadline) {
        return res.status(404).json({ message: "Deadline not found" });
      }

      res.json(deadline);
    } catch (error) {
      res.status(400).json({ message: "Failed to mark deadline as paid", error });
    }
  });

  // Email verification route
  app.post("/api/send-verification", async (req: any, res) => {
    try {
      const { email } = req.body;
      
      console.log('🔍 Richiesta verifica per email:', email);
      
      if (!email) {
        return res.status(400).json({ error: "Email richiesta" });
      }

      // Generate verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('🔢 Codice generato:', code);
      
      // Send verification email
      const emailSent = await sendEmail({
        to: email,
        subject: '🔐 Codice di Verifica - Pianificatore Imposte Forfettari',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
              .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .code { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; background: #f8f9ff; padding: 20px; border-radius: 8px; letter-spacing: 5px; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 style="text-align: center; color: #333;">🔐 Codice di Verifica</h1>
              <p>Il tuo codice di verifica per accedere al report fiscale completo è:</p>
              <div class="code">${code}</div>
              <p style="text-align: center; margin-top: 20px;">Inserisci questo codice nel calcolatore per procedere.</p>
              <p style="color: #666; font-size: 14px;">Il codice è valido per 10 minuti.</p>
              <div class="footer">
                <p>Pianificatore Imposte Forfettari</p>
                <p>Se non hai richiesto questo codice, ignora questa email.</p>
              </div>
            </div>
          </body>
          </html>
        `
      });

      if (emailSent) {
        res.json({ success: true, code: code, message: "Codice di verifica inviato via email" });
      } else {
        res.status(500).json({ error: "Errore nell'invio dell'email di verifica" });
      }
    } catch (error) {
      console.error("Errore invio verifica:", error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // Email sending route
  app.post("/api/send-report", async (req: any, res) => {
    try {
      const { email, calculationData } = req.body;
      
      if (!email || !calculationData) {
        return res.status(400).json({ error: "Email e dati di calcolo richiesti" });
      }

      // Generate Excel file
      const worksheetData = [
        ['PIANIFICATORE IMPOSTE FORFETTARI - REPORT COMPLETO'],
        ['Data:', new Date().toLocaleDateString('it-IT')],
        [''],
        ['CALCOLI FISCALI'],
        ['Reddito Imponibile:', calculationData.taxableIncome || 0],
        ['Imposta Sostitutiva:', calculationData.taxAmount || 0],
        ['Contributi INPS:', calculationData.inpsAmount || 0],
        ['Totale Dovuto:', calculationData.totalDue || 0],
        [''],
        ['SCADENZE FISCALI'],
        ['30 Giugno 2025:', (calculationData.taxAmount || 0) * 1.4],
        ['30 Novembre 2025:', (calculationData.taxAmount || 0) * 0.6],
        [''],
        ['ACCANTONAMENTO MENSILE'],
        ['Importo consigliato:', (calculationData.totalDue || 0) / 12],
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(wb, ws, 'Report Imposte');
      
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // Send email with Excel attachment
      const emailSent = await sendEmail({
        to: email,
        subject: '📊 Report Imposte Forfettari - Pianificazione Fiscale',
        html: generateReportEmailHTML(calculationData),
        attachments: [{
          filename: `Report_Imposte_${new Date().getFullYear()}.xlsx`,
          content: excelBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }]
      });

      if (emailSent) {
        res.json({ success: true, message: "Report inviato con successo via email" });
      } else {
        res.status(500).json({ error: "Errore nell'invio dell'email" });
      }
    } catch (error) {
      console.error("Errore invio report:", error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // Lead generation endpoint
  app.post("/api/leads/submit", async (req: any, res) => {
    try {
      const { firstName, lastName, email, companyName, vatNumber, businessSector, calculationData } = req.body;
      
      // Salva il lead nel database
      const leadData = {
        firstName,
        lastName,
        email,
        companyName,
        vatNumber,
        businessSector,
        revenue: calculationData.revenue,
        category: calculationData.category,
        startDate: calculationData.startDate,
        isStartup: calculationData.isStartup,
        contributionRegime: calculationData.contributionRegime,
        status: "NEW"
      };

      const lead = await storage.createLead(leadData);
      
      console.log('Nuovo Lead salvato nel database:', {
        id: lead.id,
        nome: firstName,
        cognome: lastName,
        email: email,
        settore: businessSector,
        fatturato: calculationData.revenue,
        categoria: calculationData.category,
        timestamp: new Date().toISOString()
      });
      
      res.json({ 
        success: true, 
        message: 'Lead salvato con successo',
        leadId: lead.id,
        reportSent: true
      });
    } catch (error) {
      res.status(400).json({ message: "Errore nel salvare il lead", error });
    }
  });

  // GET /api/leads - Recupera tutti i lead
  app.get('/api/leads', async (req: Request, res: Response) => {
    try {
      const leads = await storage.getAllLeads();
      res.json(leads);
    } catch (error) {
      console.error('Errore nel recupero dei lead:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // PATCH /api/leads/:id - Aggiorna un lead
  app.patch('/api/leads/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedLead = await storage.updateLead(parseInt(id), updates);
      
      if (!updatedLead) {
        return res.status(404).json({ error: 'Lead non trovato' });
      }
      
      res.json(updatedLead);
    } catch (error) {
      console.error('Errore nell\'aggiornamento del lead:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req: any, res) => {
    try {
      const businesses = await storage.getBusinessesByUserId(1); // Demo user ID
      const currentYear = new Date().getFullYear();
      
      let totalRevenue = 0;
      let totalTaxesDue = 0;
      let totalBalance = 0;

for (const business of businesses) {
  const invoices = await storage.getInvoicesByBusinessId(business.id);
  const yearlyInvoices = invoices.filter(inv => inv.year === currentYear);
  const businessRevenue = yearlyInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
  totalRevenue += businessRevenue;
  totalBalance += parseFloat(business.currentBalance || "0");

  // Calculate taxes using the library
  if (businessRevenue > 0) {
    const calculation = TaxCalculator.calculate({
      revenue: businessRevenue,
      macroCategory: business.macroCategory as any,
      isStartup: business.isStartup || false,
      startDate: business.startDate,
      contributionRegime: business.contributionRegime as any,
      contributionReduction: business.contributionReduction as any || 'NONE',
      hasOtherCoverage: business.hasOtherCoverage || false,
      year: currentYear
    });
    
    totalTaxesDue += calculation.totalDue;
  }
}

      const upcomingDeadlines = await storage.getUpcomingDeadlines(req.user.userId);
      const nextDeadline = upcomingDeadlines.length > 0 ? upcomingDeadlines[0] : null;

      res.json({
        currentRevenue: totalRevenue,
        taxesDue: totalTaxesDue,
        availableBalance: totalBalance,
        nextDeadline: nextDeadline ? new Date(nextDeadline.dueDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : null
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get dashboard stats", error });
    }
  });

  // Recent activity endpoint
  app.get("/api/dashboard/recent-activity", authenticateToken, async (req: any, res) => {
    try {
      const businesses = await storage.getBusinessesByUserId(req.user.userId);
      const activities: any[] = [];

      // Get recent invoices from all businesses
      for (const business of businesses) {
        const invoices = await storage.getInvoicesByBusinessId(business.id);
        const recentInvoices = invoices
          .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
          .slice(0, 3);

        recentInvoices.forEach(invoice => {
          activities.push({
            id: `invoice-${invoice.id}`,
            type: 'invoice',
            description: 'Nuova fattura registrata',
            amount: parseFloat(invoice.amount),
            businessName: business.businessName,
            date: invoice.createdAt,
          });
        });

        // Get recent calculations
        const calculations = await storage.getTaxCalculationsByBusinessId(business.id);
        const recentCalculations = calculations
          .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
          .slice(0, 2);

        recentCalculations.forEach(calc => {
          activities.push({
            id: `calculation-${calc.id}`,
            type: 'calculation',
            description: 'Calcolo imposte completato per',
            period: `${calc.year}`,
            businessName: business.businessName,
            date: calc.createdAt,
          });
        });
      }

      // Get upcoming deadlines
      const deadlines = await storage.getUpcomingDeadlines(req.user.userId);
      const urgentDeadlines = deadlines.slice(0, 2);

      urgentDeadlines.forEach(deadline => {
        const dueDate = new Date(deadline.dueDate);
        const today = new Date();
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil <= 30) {
          activities.push({
            id: `deadline-${deadline.id}`,
            type: 'deadline',
            description: 'Scadenza imminente:',
            deadline: deadline.paymentType,
            amount: parseFloat(deadline.amount),
            date: deadline.createdAt,
          });
        }
      });

      // Sort all activities by date and return the most recent 10
      const sortedActivities = activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      res.json(sortedActivities);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recent activity", error });
    }
  });

  // Leads management endpoints
  app.get("/api/leads", async (req: any, res) => {
    try {
      const leads = await storage.getAllLeads();
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recuperare i leads", error });
    }
  });

  app.get("/api/leads/stats", async (req: any, res) => {
    try {
      const stats = await storage.getLeadsStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recuperare le statistiche", error });
    }
  });

  app.put("/api/leads/:id", async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const lead = await storage.updateLead(parseInt(id), updateData);
      res.json(lead);
    } catch (error) {
      res.status(400).json({ message: "Errore nell'aggiornare il lead", error });
    }
  });

  app.delete("/api/leads/:id", async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteLead(parseInt(id));
      res.json({ success: true, message: "Lead eliminato" });
    } catch (error) {
      res.status(400).json({ message: "Errore nell'eliminare il lead", error });
    }
  });

  app.get("/api/leads/export", async (req: any, res) => {
    try {
      const leads = await storage.getAllLeads();
      
      // Create CSV data
      const csvHeader = "ID,Nome,Cognome,Email,Settore,Fatturato,Categoria,Data Creazione,Status,Note\n";
      const csvData = leads.map(lead => 
        `${lead.id},"${lead.firstName}","${lead.lastName}","${lead.email}","${lead.businessSector}",${lead.revenue || 0},"${lead.category || ''}","${lead.createdAt}","${lead.status}","${lead.notes || ''}"`
      ).join('\n');
      
      const csv = csvHeader + csvData;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "Errore nell'export", error });
    }
  });

  // Download individual tax report as Excel
  app.post("/api/download-report-individual", async (req: any, res) => {
    try {
      const { calculationData } = req.body;
      
      if (!calculationData) {
        return res.status(400).json({ error: "Dati di calcolo richiesti" });
      }

      // Generate Excel file
      const worksheetData = [
        ['REGIME ORDINARIO - REPORT FISCALE AVANZATO'],
        ['Data Generazione:', new Date().toLocaleDateString('it-IT')],
        [''],
        ['=== DATI ATTIVITÀ ==='],
        ['Data Inizio Attività:', calculationData.startDate || '-'],
        ['Codice ATECO:', calculationData.atecoCode || '-'],
        ['Tipo Attività:', calculationData.businessType || '-'],
        [''],
        ['=== DATI ECONOMICI 2024 ==='],
        ['Ricavi 2024:', calculationData.revenue2024 || 0],
        ['Spese Documentate 2024:', calculationData.documentedExpenses2024 || 0],
        ['Altri Redditi 2024:', calculationData.otherIncome2024 || 0],
        ['Ritenute 2024:', calculationData.taxWithholdings2024 || 0],
        [''],
        ['=== CALCOLI FISCALI 2024 ==='],
        ['Reddito Imponibile:', calculationData.taxableIncome || 0],
        ['IRPEF Dovuta:', calculationData.irpefAmount || 0],
        ['Addizionali IRPEF:', calculationData.additionalTax || 0],
        ['Contributi INPS:', calculationData.inpsAmount || 0],
        ['IVA a Debito:', calculationData.vatAmount || 0],
        ['Totale Imposte:', calculationData.totalTaxes || 0],
        [''],
        ['=== PREVISIONI 2025 ==='],
        ['Ricavi Previsti 2025:', calculationData.revenue2025 || 0],
        ['Spese Previste 2025:', calculationData.documentedExpenses2025 || 0],
        ['IRPEF Stimata 2025:', calculationData.estimatedIrpef2025 || 0],
        ['Contributi INPS 2025:', calculationData.estimatedInps2025 || 0],
        [''],
        ['=== SCADENZE FISCALI 2025 ==='],
        ['Acconto IRPEF (30/06/2025):', calculationData.firstInstallment || 0],
        ['Saldo IRPEF (16/06/2025):', calculationData.finalBalance || 0],
        ['Secondo Acconto (30/11/2025):', calculationData.secondInstallment || 0],
        [''],
        ['=== CONTRIBUTI INPS TRIMESTRALI ==='],
        ['I Trimestre (16/05/2025):', calculationData.quarterly1 || 0],
        ['II Trimestre (20/08/2025):', calculationData.quarterly2 || 0],
        ['III Trimestre (16/11/2025):', calculationData.quarterly3 || 0],
        ['IV Trimestre (16/02/2026):', calculationData.quarterly4 || 0],
        [''],
        ['=== LIQUIDAZIONI IVA MENSILI ==='],
        ['Gennaio 2025:', calculationData.vatJan || 0],
        ['Febbraio 2025:', calculationData.vatFeb || 0],
        ['Marzo 2025:', calculationData.vatMar || 0],
        ['Aprile 2025:', calculationData.vatApr || 0],
        ['Maggio 2025:', calculationData.vatMay || 0],
        ['Giugno 2025:', calculationData.vatJun || 0],
        ['Luglio 2025:', calculationData.vatJul || 0],
        ['Agosto 2025:', calculationData.vatAug || 0],
        ['Settembre 2025:', calculationData.vatSep || 0],
        ['Ottobre 2025:', calculationData.vatOct || 0],
        ['Novembre 2025:', calculationData.vatNov || 0],
        ['Dicembre 2025:', calculationData.vatDec || 0],
        [''],
        ['=== PIANO ACCANTONAMENTO ==='],
        ['Accantonamento Mensile Consigliato:', calculationData.monthlyAccrual || 0],
        ['Margine di Sicurezza 10%:', calculationData.monthlyAccrualSafety || 0],
        [''],
        ['=== RIEPILOGO LIQUIDITÀ ==='],
        ['Totale da Accantonare 2025:', calculationData.totalToAccrue || 0],
        ['Saldo Attuale:', calculationData.currentBalance || 0],
        ['Saldo Previsto Fine Anno:', calculationData.projectedBalance || 0]
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 35 }, // Column A
        { wch: 20 }  // Column B
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Report Regime Ordinario');
      
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=Report_Regime_Ordinario_${new Date().getFullYear()}.xlsx`);
      res.send(excelBuffer);
      
    } catch (error) {
      console.error('Errore generazione Excel:', error);
      res.status(500).json({ error: "Errore nella generazione del file Excel" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
