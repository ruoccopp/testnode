// server/routes.ts - Versione refactored con libreria

import { TaxCalculator, validateTaxInput } from '@shared/lib/tax-calculator';

// Endpoint calcolo tasse - PRIMA: 80+ righe, ORA: 20 righe
app.post("/api/calculations/tax", async (req: any, res) => {
  try {
    const { businessId, revenue, year, ...taxParams } = req.body;
    
    // Validazione
    const errors = validateTaxInput({ revenue, ...taxParams });
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    
    // Calcolo usando la libreria
    const calculation = TaxCalculator.calculate({
      revenue,
      year,
      ...taxParams
    });
    
    // Salva nel database
    const savedCalculation = await storage.createTaxCalculation({
      businessId,
      year,
      ...calculation
    });

    res.json(calculation);
  } catch (error) {
    res.status(400).json({ message: "Failed to calculate taxes", error });
  }
});

// Dashboard stats - Riuso della stessa logica
app.get("/api/dashboard/stats", async (req: any, res) => {
  try {
    const businesses = await storage.getBusinessesByUserId(req.user.userId);
    const currentYear = new Date().getFullYear();
    
    let totalRevenue = 0;
    let totalTaxesDue = 0;
    
    for (const business of businesses) {
      const invoices = await storage.getInvoicesByBusinessId(business.id);
      const yearlyRevenue = calculateYearlyRevenue(invoices, currentYear);
      
      if (yearlyRevenue > 0) {
        // Usa la libreria invece di duplicare il codice
        const calculation = TaxCalculator.calculate({
          revenue: yearlyRevenue,
          macroCategory: business.macroCategory,
          isStartup: business.isStartup,
          startDate: business.startDate,
          contributionRegime: business.contributionRegime,
          contributionReduction: business.contributionReduction,
          hasOtherCoverage: business.hasOtherCoverage,
          year: currentYear
        });
        
        totalRevenue += yearlyRevenue;
        totalTaxesDue += calculation.totalDue;
      }
    }
    
    res.json({
      currentRevenue: totalRevenue,
      taxesDue: totalTaxesDue,
      // ... resto della risposta
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get stats", error });
  }
});