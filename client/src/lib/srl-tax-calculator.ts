
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
  // 1. CALCOLO REDDITO IMPONIBILE
  const grossProfit = input.revenue - input.costs - input.employeeCosts;
  const taxableIncome = Math.max(0, grossProfit - input.adminSalary);

  // 2. CALCOLO IRES (24%)
  const iresAmount = taxableIncome * 0.24;

  // 3. CALCOLO IRAP
  // Base IRAP = Ricavi - Costi deducibili (esclusi costi del personale)
  const irapBase = input.revenue - (input.costs - input.employeeCosts); // I costi del personale non sono deducibili
  const irapRate = (IRAP_RATES[input.region as keyof typeof IRAP_RATES] || 3.9) / 100;
  const irapAmount = Math.max(0, irapBase * irapRate);

  // 4. CALCOLO IVA
  // Stimiamo IVA al 22% sul margine (semplificazione)
  const vatBase = input.revenue * 0.22; // IVA a debito stimata
  const vatCredit = input.costs * 0.22; // IVA a credito stimata
  let vatAmount = Math.max(0, vatBase - vatCredit);
  
  if (input.hasVatDebt && input.vatDebt > 0) {
    vatAmount += input.vatDebt;
  }
  
  const vatFrequency = VAT_REGIMES[input.vatRegime as keyof typeof VAT_REGIMES]?.frequency || 4;
  const vatQuarterly = vatAmount / (vatFrequency / 4); // Normalizzato su base trimestrale

  // 5. CALCOLO CONTRIBUTI INPS
  
  // INPS Amministratore (se presente)
  let inpsAdmin = 0;
  if (input.adminSalary > 0) {
    // Contributi amministratore: 24% del compenso (min €18.324, max €105.014)
    const adminMinimum = 18324;
    const adminMaximum = 105014;
    const adminContributionBase = Math.max(adminMinimum, Math.min(input.adminSalary, adminMaximum));
    inpsAdmin = adminContributionBase * 0.24;
  }
  
  // INPS Dipendenti (se presenti)
  let inpsEmployees = 0;
  if (input.employees > 0 && input.employeeCosts > 0) {
    // Contributi dipendenti: 30% circa sui salari lordi
    inpsEmployees = input.employeeCosts * 0.30;
  }
  
  const inpsTotalAmount = inpsAdmin + inpsEmployees;

  // 6. CALCOLO TOTALI
  const totalTaxes = iresAmount + irapAmount;
  const totalDue = totalTaxes + inpsTotalAmount + vatAmount;

  // 7. CALCOLO ACCONTI (40% prima rata, 60% seconda rata)
  const iresFirstAcconto = iresAmount * 0.40;
  const iresSecondAcconto = iresAmount * 0.60;
  const irapFirstAcconto = irapAmount * 0.40;
  const irapSecondAcconto = irapAmount * 0.60;

  // 8. ACCANTONAMENTO MENSILE
  const monthlyAccrual = totalDue / 12;
  const quarterlyPayments = (vatQuarterly + inpsTotalAmount / 4);

  return {
    // Redditi
    grossProfit: Math.round(grossProfit * 100) / 100,
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    
    // IRES
    iresAmount: Math.round(iresAmount * 100) / 100,
    
    // IRAP
    irapBase: Math.round(irapBase * 100) / 100,
    irapAmount: Math.round(irapAmount * 100) / 100,
    
    // IVA
    vatAmount: Math.round(vatAmount * 100) / 100,
    vatQuarterly: Math.round(vatQuarterly * 100) / 100,
    
    // INPS
    inpsAdmin: Math.round(inpsAdmin * 100) / 100,
    inpsEmployees: Math.round(inpsEmployees * 100) / 100,
    inpsTotalAmount: Math.round(inpsTotalAmount * 100) / 100,
    
    // Totali
    totalTaxes: Math.round(totalTaxes * 100) / 100,
    totalDue: Math.round(totalDue * 100) / 100,
    
    // Acconti
    iresFirstAcconto: Math.round(iresFirstAcconto * 100) / 100,
    iresSecondAcconto: Math.round(iresSecondAcconto * 100) / 100,
    irapFirstAcconto: Math.round(irapFirstAcconto * 100) / 100,
    irapSecondAcconto: Math.round(irapSecondAcconto * 100) / 100,
    
    // Pianificazione
    monthlyAccrual: Math.round(monthlyAccrual * 100) / 100,
    quarterlyPayments: Math.round(quarterlyPayments * 100) / 100
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
