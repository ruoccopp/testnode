
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

  // Scadenziere con liquidità progressiva
  paymentSchedule: Array<{
    date: string;
    amount: number;
    type: string;
    category: 'IRES' | 'IRAP' | 'IVA' | 'INPS';
    description: string;
    previousBalance: number;
    newBalance: number;
    deficit: number; // Eventuale deficit se il saldo non è sufficiente
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

function calculateVATDeadlines(vatRegime: string, totalVatAmount: number, frequency: number, fiscalYear: number = 2025) {
  const deadlines = [];
  
  if (vatRegime === 'TRIMESTRALE') {
    // Scadenze trimestrali IVA per l'anno fiscale corrente
    const quarterlyAmount = totalVatAmount / 4;
    deadlines.push(
      { date: `16/04/${fiscalYear}`, amount: quarterlyAmount, type: `IVA Q1 ${fiscalYear}` },
      { date: `16/07/${fiscalYear}`, amount: quarterlyAmount, type: `IVA Q2 ${fiscalYear}` },
      { date: `16/10/${fiscalYear}`, amount: quarterlyAmount, type: `IVA Q3 ${fiscalYear}` },
      { date: `16/01/${fiscalYear + 1}`, amount: quarterlyAmount, type: `IVA Q4 ${fiscalYear}` }
    );
  } else if (vatRegime === 'MENSILE') {
    // Scadenze mensili IVA per l'anno fiscale corrente
    const monthlyAmount = totalVatAmount / 12;
    for (let month = 1; month <= 12; month++) {
      const paymentMonth = month === 12 ? 1 : month + 1; // Il mese successivo
      const paymentYear = month === 12 ? fiscalYear + 1 : fiscalYear;
      const paymentMonthStr = paymentMonth.toString().padStart(2, '0');
      deadlines.push({
        date: `16/${paymentMonthStr}/${paymentYear}`,
        amount: monthlyAmount,
        type: `IVA ${getMonthName(month - 1)} ${fiscalYear}`
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

function createFiscalCalendar2025(iresAmount: number, irapAmount: number, vatDeadlines: any[], inpsTotalAmount: number, fiscalYear: number) {
  const calendar = [];
  
  // Scadenze IVA (già calcolate)
  calendar.push(...vatDeadlines.map(deadline => ({
    ...deadline,
    category: 'IVA' as const,
    description: deadline.type
  })));
  
  // ========== SCADENZE ANNO 2025 ==========
  
  // ACCONTI IRES/IRAP per anno ${fiscalYear} (calcolati sui dati inseriti)
  const primoAccontoIRES2025 = iresAmount * 0.40; // 40% primo acconto
  const secondoAccontoIRES2025 = iresAmount * 0.60; // 60% secondo acconto
  const primoAccontoIRAP2025 = irapAmount * 0.40;
  const secondoAccontoIRAP2025 = irapAmount * 0.60;
  
  // Primo acconto IRES/IRAP ${fiscalYear} - da pagare a giugno ${fiscalYear}
  calendar.push({
    date: `30/06/${fiscalYear}`,
    amount: primoAccontoIRES2025,
    type: `IRES I Acconto ${fiscalYear}`,
    category: 'IRES' as const,
    description: `Primo acconto IRES anno ${fiscalYear} (40% sui dati previsionali)`
  });
  
  calendar.push({
    date: `30/06/${fiscalYear}`,
    amount: primoAccontoIRAP2025,
    type: `IRAP I Acconto ${fiscalYear}`,
    category: 'IRAP' as const,
    description: `Primo acconto IRAP anno ${fiscalYear} (40% sui dati previsionali)`
  });
  
  // Secondo acconto IRES/IRAP ${fiscalYear} - da pagare a novembre ${fiscalYear}
  calendar.push({
    date: `30/11/${fiscalYear}`,
    amount: secondoAccontoIRES2025,
    type: `IRES II Acconto ${fiscalYear}`,
    category: 'IRES' as const,
    description: `Secondo acconto IRES anno ${fiscalYear} (60% sui dati previsionali)`
  });
  
  calendar.push({
    date: `30/11/${fiscalYear}`,
    amount: secondoAccontoIRAP2025,
    type: `IRAP II Acconto ${fiscalYear}`,
    category: 'IRAP' as const,
    description: `Secondo acconto IRAP anno ${fiscalYear} (60% sui dati previsionali)`
  });
  
  // CONTRIBUTI INPS per anno ${fiscalYear} - da pagare durante ${fiscalYear}
  const inpsQuarterly2025 = inpsTotalAmount / 4;
  if (inpsQuarterly2025 > 0) {
    calendar.push(
      {
        date: `16/05/${fiscalYear}`,
        amount: inpsQuarterly2025,
        type: `INPS I Trim ${fiscalYear}`,
        category: 'INPS' as const,
        description: `Contributi INPS anno ${fiscalYear} - I trimestre`
      },
      {
        date: `20/08/${fiscalYear}`,
        amount: inpsQuarterly2025,
        type: `INPS II Trim ${fiscalYear}`,
        category: 'INPS' as const,
        description: `Contributi INPS anno ${fiscalYear} - II trimestre`
      },
      {
        date: `16/11/${fiscalYear}`,
        amount: inpsQuarterly2025,
        type: `INPS III Trim ${fiscalYear}`,
        category: 'INPS' as const,
        description: `Contributi INPS anno ${fiscalYear} - III trimestre`
      },
      {
        date: `16/02/${fiscalYear + 1}`,
        amount: inpsQuarterly2025,
        type: `INPS IV Trim ${fiscalYear}`,
        category: 'INPS' as const,
        description: `Contributi INPS anno ${fiscalYear} - IV trimestre`
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

function createPaymentSchedule(calendar: any[], currentBalance: number) {
  let runningBalance = currentBalance;
  
  return calendar.map(payment => {
    const previousBalance = runningBalance;
    const newBalance = runningBalance - payment.amount;
    const deficit = newBalance < 0 ? Math.abs(newBalance) : 0;
    
    runningBalance = Math.max(0, newBalance); // Non può andare sotto zero
    
    return {
      date: payment.date,
      amount: payment.amount,
      type: payment.type,
      category: payment.category,
      description: payment.description,
      previousBalance: Math.round(previousBalance * 100) / 100,
      newBalance: Math.round(newBalance * 100) / 100,
      deficit: Math.round(deficit * 100) / 100
    };
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
  const vatDeadlines = calculateVATDeadlines(input.vatRegime, vatAmount, vatFrequency, fiscalYear);

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
  const calendar2025 = createFiscalCalendar2025(iresAmount, irapAmount, vatDeadlines, inpsTotalAmount, fiscalYear);

  // 10. SCADENZIERE CON LIQUIDITÀ PROGRESSIVA
  const paymentSchedule = createPaymentSchedule(calendar2025, input.currentBalance);

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
    calendar2025: calendar2025,

    // Scadenziere con liquidità progressiva
    paymentSchedule: paymentSchedule
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
