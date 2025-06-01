
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
  // IVA dettagliata
  vatOnSales?: number;    // IVA a debito sui ricavi (se diversa dal 22%)
  vatOnPurchases?: number; // IVA a credito sugli acquisti
  // Anno fiscale di riferimento
  fiscalYear?: number;    // Anno fiscale per il calcolo (default: 2025)
}

export interface SRLTaxCalculationResult {
  // Anno fiscale di riferimento
  fiscalYear: number;
  
  // Redditi
  grossProfit: number;
  taxableIncome: number;
  
  // IRES (24%) - Anno fiscale di riferimento
  iresAmount: number;
  
  // IRAP (3.9% base) - Anno fiscale di riferimento  
  irapBase: number;
  irapAmount: number;
  
  // IVA
  vatOnSales: number;      // IVA a debito
  vatOnPurchases: number;  // IVA a credito
  vatAmount: number;       // IVA netta da versare
  vatQuarterly: number;
  vatDeadlines: Array<{
    date: string;
    amount: number;
    type: string;
  }>;
  
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
  
  // Calendario completo 2025
  calendar2025: Array<{
    date: string;
    amount: number;
    type: string;
    category: 'IRES' | 'IRAP' | 'IVA' | 'INPS';
    description: string;
  }>;
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

function calculateVATDeadlines(vatRegime: string, totalVatAmount: number, frequency: number) {
  const deadlines = [];
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  if (vatRegime === 'TRIMESTRALE') {
    // Scadenze trimestrali: 16 gennaio, 16 aprile, 16 luglio, 16 ottobre
    const quarterlyAmount = totalVatAmount / 4;
    deadlines.push(
      { date: `16/01/${nextYear}`, amount: quarterlyAmount, type: 'IVA Trimestrale Q4' },
      { date: `16/04/${nextYear}`, amount: quarterlyAmount, type: 'IVA Trimestrale Q1' },
      { date: `16/07/${nextYear}`, amount: quarterlyAmount, type: 'IVA Trimestrale Q2' },
      { date: `16/10/${nextYear}`, amount: quarterlyAmount, type: 'IVA Trimestrale Q3' }
    );
  } else if (vatRegime === 'MENSILE') {
    // Scadenze mensili: entro il 16 del mese successivo
    const monthlyAmount = totalVatAmount / 12;
    for (let month = 1; month <= 12; month++) {
      const year = month === 1 ? nextYear : currentYear;
      const monthStr = month.toString().padStart(2, '0');
      deadlines.push({
        date: `16/${monthStr}/${year}`,
        amount: monthlyAmount,
        type: `IVA Mensile ${month === 1 ? 'Dicembre' : getMonthName(month - 1)}`
      });
    }
  }
  
  return deadlines;
}

function getMonthName(month: number): string {
  const months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  return months[month] || '';
}

function createFiscalCalendar2025(iresAmount: number, irapAmount: number, vatDeadlines: any[], inpsTotalAmount: number) {
  const calendar = [];
  
  // Scadenze IVA (già calcolate)
  calendar.push(...vatDeadlines.map(deadline => ({
    ...deadline,
    category: 'IVA' as const,
    description: deadline.type
  })));
  
  // Scadenze IRES e IRAP 2025
  // 16 giugno 2025: Saldo 2024 + I acconto 2025
  const saldo2024IRES = iresAmount;
  const saldo2024IRAP = irapAmount;
  const primoAccontoIRES = iresAmount * 0.40;
  const primoAccontoIRAP = irapAmount * 0.40;
  
  calendar.push({
    date: '16/06/2025',
    amount: saldo2024IRES + primoAccontoIRES,
    type: 'IRES Saldo 2024 + I Acconto 2025',
    category: 'IRES' as const,
    description: `Saldo ${saldo2024IRES.toFixed(2)}€ + I Acconto ${primoAccontoIRES.toFixed(2)}€`
  });
  
  calendar.push({
    date: '16/06/2025',
    amount: saldo2024IRAP + primoAccontoIRAP,
    type: 'IRAP Saldo 2024 + I Acconto 2025',
    category: 'IRAP' as const,
    description: `Saldo ${saldo2024IRAP.toFixed(2)}€ + I Acconto ${primoAccontoIRAP.toFixed(2)}€`
  });
  
  // 30 novembre 2025: II acconto IRES e IRAP
  const secondoAccontoIRES = iresAmount * 0.60;
  const secondoAccontoIRAP = irapAmount * 0.60;
  
  calendar.push({
    date: '30/11/2025',
    amount: secondoAccontoIRES,
    type: 'IRES II Acconto 2025',
    category: 'IRES' as const,
    description: 'Secondo acconto basato su reddito 2024'
  });
  
  calendar.push({
    date: '30/11/2025',
    amount: secondoAccontoIRAP,
    type: 'IRAP II Acconto 2025',
    category: 'IRAP' as const,
    description: 'Secondo acconto basato su reddito 2024'
  });
  
  // Scadenze INPS trimestrali (approssimative)
  const inpsQuarterly = inpsTotalAmount / 4;
  if (inpsQuarterly > 0) {
    calendar.push(
      {
        date: '16/01/2025',
        amount: inpsQuarterly,
        type: 'INPS Trimestrale Q4 2024',
        category: 'INPS' as const,
        description: 'Contributi previdenziali trimestrali'
      },
      {
        date: '16/04/2025',
        amount: inpsQuarterly,
        type: 'INPS Trimestrale Q1 2025',
        category: 'INPS' as const,
        description: 'Contributi previdenziali trimestrali'
      },
      {
        date: '16/07/2025',
        amount: inpsQuarterly,
        type: 'INPS Trimestrale Q2 2025',
        category: 'INPS' as const,
        description: 'Contributi previdenziali trimestrali'
      },
      {
        date: '16/10/2025',
        amount: inpsQuarterly,
        type: 'INPS Trimestrale Q3 2025',
        category: 'INPS' as const,
        description: 'Contributi previdenziali trimestrali'
      }
    );
  }
  
  // Ordina per data
  return calendar.sort((a, b) => {
    const dateA = new Date(a.date.split('/').reverse().join('-'));
    const dateB = new Date(b.date.split('/').reverse().join('-'));
    return dateA.getTime() - dateB.getTime();
  });
}

export function calculateSRLTaxes(input: SRLTaxCalculationInput): SRLTaxCalculationResult {
  // Anno fiscale di riferimento (default: 2025)
  const fiscalYear = input.fiscalYear || 2025;
  
  // 1. CALCOLO REDDITO IMPONIBILE (Anno fiscale ${fiscalYear})
  const grossProfit = input.revenue - input.costs - input.employeeCosts;
  const taxableIncome = Math.max(0, grossProfit - input.adminSalary);

  // 2. CALCOLO IRES (24%) - Imposta sui redditi societari anno ${fiscalYear}
  const iresAmount = taxableIncome * 0.24;

  // 3. CALCOLO IRAP - Imposta regionale attività produttive anno ${fiscalYear}
  // Base IRAP = Ricavi - Costi deducibili (esclusi costi del personale)
  const irapBase = input.revenue - (input.costs - input.employeeCosts); // I costi del personale non sono deducibili
  const irapRate = (IRAP_RATES[input.region as keyof typeof IRAP_RATES] || 3.9) / 100;
  const irapAmount = Math.max(0, irapBase * irapRate);

  // 4. CALCOLO IVA
  // IVA a debito sui ricavi (default 22% se non specificato)
  const vatOnSales = input.vatOnSales || (input.revenue * 0.22);
  
  // IVA a credito sugli acquisti (default 22% sui costi se non specificato)
  const vatOnPurchases = input.vatOnPurchases || (input.costs * 0.22);
  
  // IVA netta da versare = IVA a debito - IVA a credito
  let vatAmount = Math.max(0, vatOnSales - vatOnPurchases);
  
  if (input.hasVatDebt && input.vatDebt > 0) {
    vatAmount += input.vatDebt;
  }
  
  const vatFrequency = VAT_REGIMES[input.vatRegime as keyof typeof VAT_REGIMES]?.frequency || 4;
  const vatQuarterly = vatAmount / (vatFrequency / 4); // Normalizzato su base trimestrale

  // Calcolo scadenze IVA
  const vatDeadlines = calculateVATDeadlines(input.vatRegime, vatAmount, vatFrequency);

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

  // 9. CALCOLO CALENDARIO COMPLETO 2025
  const calendar2025 = createFiscalCalendar2025(iresAmount, irapAmount, vatDeadlines, inpsTotalAmount);

  return {
    // Anno fiscale di riferimento
    fiscalYear: fiscalYear,
    
    // Redditi
    grossProfit: Math.round(grossProfit * 100) / 100,
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    
    // IRES
    iresAmount: Math.round(iresAmount * 100) / 100,
    
    // IRAP
    irapBase: Math.round(irapBase * 100) / 100,
    irapAmount: Math.round(irapAmount * 100) / 100,
    
    // IVA
    vatOnSales: Math.round(vatOnSales * 100) / 100,
    vatOnPurchases: Math.round(vatOnPurchases * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    vatQuarterly: Math.round(vatQuarterly * 100) / 100,
    vatDeadlines: vatDeadlines.map(deadline => ({
      ...deadline,
      amount: Math.round(deadline.amount * 100) / 100
    })),
    
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
    quarterlyPayments: Math.round(quarterlyPayments * 100) / 100,
    
    // Calendario completo 2025
    calendar2025: calendar2025
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
