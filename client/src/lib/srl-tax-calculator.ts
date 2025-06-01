
export interface SRLTaxCalculationInput {
  revenue: number;
  costs: number;
  employees: number;
  employeeCosts: number;
  adminSalary: number;
  region: string;
  vatRegime: string;
  hasVatDebt: boolean;
  vatDebt: number;
  currentBalance: number;
}

export interface SRLTaxCalculationResult {
  // Redditi
  grossProfit: number;
  taxableIncome: number;
  
  // IRES (24%)
  iresAmount: number;
  
  // IRAP (3.9% base)
  irapBase: number;
  irapAmount: number;
  
  // IVA
  vatAmount: number;
  vatQuarterly: number;
  
  // INPS
  inpsAdmin: number;
  inpsEmployees: number;
  inpsTotalAmount: number;
  
  // Totali
  totalTaxes: number;
  totalDue: number;
  
  // Rate e acconti
  iresFirstAcconto: number;
  iresSecondAcconto: number;
  irapFirstAcconto: number;
  irapSecondAcconto: number;
  
  // Scadenze mensili
  monthlyAccrual: number;
  quarterlyPayments: number;
}

// Aliquote IRAP regionali 2024-2025
export const IRAP_RATES = {
  'PIEMONTE': 3.9,
  'VALLE_AOSTA': 3.5,
  'LOMBARDIA': 3.9,
  'TRENTINO': 3.5,
  'VENETO': 3.9,
  'FRIULI': 3.9,
  'LIGURIA': 3.9,
  'EMILIA_ROMAGNA': 4.65,
  'TOSCANA': 3.9,
  'UMBRIA': 3.9,
  'MARCHE': 3.9,
  'LAZIO': 4.65,
  'ABRUZZO': 3.9,
  'MOLISE': 4.65,
  'CAMPANIA': 5.25,
  'PUGLIA': 4.82,
  'BASILICATA': 3.9,
  'CALABRIA': 4.82,
  'SICILIA': 3.9,
  'SARDEGNA': 3.9
};

export const VAT_REGIMES = {
  'MENSILE': { 
    label: 'Liquidazione Mensile', 
    frequency: 12,
    description: 'Obbligo per fatturato > €400k'
  },
  'TRIMESTRALE': { 
    label: 'Liquidazione Trimestrale', 
    frequency: 4,
    description: 'Standard per fatturato ≤ €400k'
  }
};

export function calculateSRLTaxes(input: SRLTaxCalculationInput): SRLTaxCalculationResult {
  // Funzione helper per calcolare imposte per un anno specifico
  function calculateYearTaxes(revenue: number, costs: number, employees: number, employeeCosts: number, adminSalary: number, region: string) {
    const grossProfit = revenue - costs - employeeCosts;
    const taxableIncome = Math.max(0, grossProfit - adminSalary);
    const iresAmount = taxableIncome * 0.24;
    const irapBase = revenue - (costs - employeeCosts);
    const irapRate = (IRAP_RATES[region as keyof typeof IRAP_RATES] || 3.9) / 100;
    const irapAmount = Math.max(0, irapBase * irapRate);
    const vatBase = revenue * 0.22;
    const vatCredit = costs * 0.22;
    const vatAmount = Math.max(0, vatBase - vatCredit);
    
    let inpsAdmin = 0;
    if (adminSalary > 0) {
      const adminMinimum = 18324;
      const adminMaximum = 105014;
      const adminContributionBase = Math.max(adminMinimum, Math.min(adminSalary, adminMaximum));
      inpsAdmin = adminContributionBase * 0.24;
    }
    
    let inpsEmployees = 0;
    if (employees > 0 && employeeCosts > 0) {
      inpsEmployees = employeeCosts * 0.30;
    }
    
    const totalTaxes = iresAmount + irapAmount + vatAmount + inpsAdmin + inpsEmployees;

    return {
      grossProfit,
      taxableIncome,
      iresAmount,
      irapAmount,
      vatAmount,
      inpsAdmin,
      inpsEmployees,
      totalTaxes
    };
  }

  // Calcoli per 2024 e 2025
  const calc2024 = calculateYearTaxes(
    input.revenue2024, input.costs2024, input.employees2024, 
    input.employeeCosts2024, input.adminSalary2024, input.region
  );
  
  const calc2025 = calculateYearTaxes(
    input.revenue2025, input.costs2025, input.employees2025, 
    input.employeeCosts2025, input.adminSalary2025, input.region
  );

  // Calcolo scadenze 2025 (basate su 2024)
  const saldo2024 = calc2024.totalTaxes;
  const primoAcconto2025 = calc2024.totalTaxes * 0.40;
  const secondoAcconto2025 = calc2024.totalTaxes * 0.60;
  
  const scadenze2025 = {
    giugno: saldo2024 + primoAcconto2025,
    novembre: secondoAcconto2025
  };

  // Calcolo scadenze 2026 (basate su 2025)
  const saldo2025 = calc2025.totalTaxes;
  const primoAcconto2026 = calc2025.totalTaxes * 0.40;
  
  const scadenze2026 = {
    giugno: saldo2025 + primoAcconto2026
  };

  // Calcolo piano di accantonamento
  const today = new Date();
  const giugno2025 = new Date(2025, 5, 30);
  const mesiFinoGiugno2025 = Math.max(1, Math.ceil((giugno2025.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  
  const fabbisognoTotale = scadenze2025.giugno + scadenze2025.novembre + scadenze2026.giugno - input.currentBalance;
  const accantonamentoMensile = Math.max(0, fabbisognoTotale / mesiFinoGiugno2025);

  return {
    calc2024,
    calc2025,
    scadenze2025,
    scadenze2026,
    currentBalance: input.currentBalance,
    fabbisognoTotale: Math.max(0, fabbisognoTotale),
    accantonamentoMensile
  };
}

export function calculateSRLInstallments(totalDue: number, currentBalance: number, monthsUntilDeadline: number) {
  if (currentBalance >= totalDue) {
    return { monthlyAmount: 0, covered: true, deficit: 0 };
  }
  
  const deficit = totalDue - currentBalance;
  const monthlyAmount = deficit / monthsUntilDeadline;
  
  return {
    monthlyAmount: Math.ceil(monthlyAmount * 100) / 100,
    covered: false,
    deficit: Math.round(deficit * 100) / 100
  };
}
