
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
  vatOnSales?: number;    
  vatOnPurchases?: number; 
  
  // Anno fiscale di riferimento
  fiscalYear?: number;    
  
  // Dati per IRES Premiale 2025
  utile2024?: number;
  utile2023?: number;
  investimentiPrevisti?: number;
  mediaULA2022_2024?: number;
  dipendentiTempo2024?: number;
  nuoveAssunzioni2025?: number;
  hasUsedCIG?: boolean;
  
  // ROL e Interessi per calcolo preciso
  interessiAttivi?: number;
  interessiPassivi?: number;
  rolFiscale?: number;
  perditePregresseOrdinarie?: number;
  perditePrimi3Esercizi?: number;
  
  // Super deduzione nuove assunzioni
  costoNuoveAssunzioni?: number;
  incrementoCostoPersonale?: number;
}

export interface SRLTaxCalculationResult {
  // Anno fiscale di riferimento
  fiscalYear: number;
  
  // Redditi
  grossProfit: number;
  taxableIncome: number;
  taxableIncomeAfterLosses: number;
  
  // IRES con possibile aliquota premiale
  iresAmount: number;
  iresRate: number; // 0.24 o 0.20 se premiale
  isIresPremialeApplicable: boolean;
  iresPremialeDetails?: {
    condition1_utiliAccantonati: boolean;
    condition2_investimenti: boolean;
    condition3_livelloOccupazionale: boolean;
    condition4_nuoveAssunzioni: boolean;
    condition5_noCIG: boolean;
    requiredInvestment: number;
    actualInvestment: number;
  };
  
  // IRAP con deduzioni specifiche
  irapBase: number;
  irapDeductions: number;
  irapTaxableIncome: number;
  irapAmount: number;
  irapRate: number;
  
  // Gestione perdite fiscali
  lossesUsed: number;
  remainingLosses: number;
  
  // Super deduzione
  superDeductionAmount: number;
  
  // ROL e Interessi
  rolDetails?: {
    rolFiscale: number;
    interessiAttiviTotali: number;
    interessiPassiviDeducibili: number;
    interessiPassiviIndeducibili: number;
    limitROL: number;
  };
  
  // IVA
  vatOnSales: number;      
  vatOnPurchases: number;  
  vatAmount: number;       
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
    category: 'IRES' | 'IRAP' | 'IVA' | 'INPS' | 'ACCUMULO';
    description: string;
    previousBalance: number;
    newBalance: number;
    deficit: number;
    isIncome: boolean;
    requiredPayment: number;
  }>;
}

// Aliquote IRAP regionali aggiornate 2025 (da manuale tecnico)
export const IRAP_RATES = {
  'PIEMONTE': 3.9,
  'VALLE_AOSTA': 3.9,
  'LOMBARDIA': 3.9,
  'TRENTINO': 2.68, // PA Trento
  'VENETO': 4.08,
  'FRIULI': 3.9,
  'LIGURIA': 3.9,
  'EMILIA_ROMAGNA': 4.65,
  'TOSCANA': 3.9,
  'UMBRIA': 3.9,
  'MARCHE': 4.73,
  'LAZIO': 4.82,
  'ABRUZZO': 4.82,
  'MOLISE': 4.82,
  'CAMPANIA': 4.97,
  'PUGLIA': 4.82,
  'BASILICATA': 3.9,
  'CALABRIA': 4.82,
  'SICILIA': 3.9,
  'SARDEGNA': 2.93
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

// Verifica condizioni IRES Premiale (20%) - Anno 2025
function checkIresPremialeConditions(input: SRLTaxCalculationInput): {
  isApplicable: boolean;
  details: any;
} {
  if (input.fiscalYear !== 2025) {
    return { isApplicable: false, details: null };
  }

  const utile2024 = input.utile2024 || 0;
  const utile2023 = input.utile2023 || 0;
  
  // Condizione 1: Accantonamento 80% utili 2024
  const requiredReserve = utile2024 * 0.8;
  const condition1 = utile2024 > 0 && requiredReserve > 0;
  
  // Condizione 2: Investimenti qualificati
  const investmentFromReserve = requiredReserve * 0.3; // 30% della riserva
  const investmentFrom2023 = utile2023 * 0.24; // 24% utili 2023
  const requiredInvestment = Math.max(investmentFromReserve, investmentFrom2023, 20000);
  const actualInvestment = input.investimentiPrevisti || 0;
  const condition2 = actualInvestment >= requiredInvestment;
  
  // Condizione 3: Mantenimento livelli occupazionali (ULA)
  const mediaULA = input.mediaULA2022_2024 || 0;
  const condition3 = mediaULA > 0; // Semplificato - andrebbe verificato ULA 2025 >= media
  
  // Condizione 4: Nuove assunzioni
  const dipendenti2024 = input.dipendentiTempo2024 || 0;
  const incrementoMinimo = Math.max(1, dipendenti2024 * 0.01);
  const nuoveAssunzioni = input.nuoveAssunzioni2025 || 0;
  const condition4 = nuoveAssunzioni >= incrementoMinimo;
  
  // Condizione 5: No CIG
  const condition5 = !input.hasUsedCIG;
  
  const isApplicable = condition1 && condition2 && condition3 && condition4 && condition5;
  
  return {
    isApplicable,
    details: {
      condition1_utiliAccantonati: condition1,
      condition2_investimenti: condition2,
      condition3_livelloOccupazionale: condition3,
      condition4_nuoveAssunzioni: condition4,
      condition5_noCIG: condition5,
      requiredInvestment,
      actualInvestment
    }
  };
}

// Calcolo ROL fiscale secondo art. 96 TUIR
function calculateROLAndInterests(input: SRLTaxCalculationInput) {
  const interessiAttivi = input.interessiAttivi || 0;
  const interessiPassivi = input.interessiPassivi || 0;
  const rolFiscale = input.rolFiscale || (input.revenue * 0.15); // Stima se non fornito
  
  // Priorità: copertura con interessi attivi
  const interessiAttiviTotali = interessiAttivi;
  const interessiPassiviCopertiDaAttivi = Math.min(interessiPassivi, interessiAttiviTotali);
  const eccedenzaInteressiPassivi = interessiPassivi - interessiPassiviCopertiDaAttivi;
  
  // Limite ROL (30%)
  const limitROL = rolFiscale * 0.3;
  const interessiPassiviCopertiDaROL = Math.min(eccedenzaInteressiPassivi, limitROL);
  
  const interessiPassiviDeducibili = interessiPassiviCopertiDaAttivi + interessiPassiviCopertiDaROL;
  const interessiPassiviIndeducibili = interessiPassivi - interessiPassiviDeducibili;
  
  return {
    rolFiscale,
    interessiAttiviTotali,
    interessiPassiviDeducibili,
    interessiPassiviIndeducibili,
    limitROL
  };
}

// Calcolo perdite fiscali con limite 80%
function calculateLossesUsage(reddito: number, input: SRLTaxCalculationInput) {
  if (reddito <= 0) return { lossesUsed: 0, remainingLosses: input.perditePregresseOrdinarie || 0 };
  
  const perditeOrdinarie = input.perditePregresseOrdinarie || 0;
  const perditePrimi3 = input.perditePrimi3Esercizi || 0;
  
  // Prima utilizzo perdite primi 3 esercizi (100%)
  const perditePrimi3Used = Math.min(perditePrimi3, reddito);
  const redditoResiduoDopoPrimi3 = reddito - perditePrimi3Used;
  
  // Poi perdite ordinarie (limite 80%)
  const limiteOrdinary = redditoResiduoDopoPrimi3 * 0.8;
  const perditeOrdinarieUsed = Math.min(perditeOrdinarie, limiteOrdinary);
  
  const totalLossesUsed = perditePrimi3Used + perditeOrdinarieUsed;
  const remainingLosses = (perditeOrdinarie - perditeOrdinarieUsed);
  
  return { lossesUsed: totalLossesUsed, remainingLosses };
}

// Calcolo super deduzione nuove assunzioni (120%)
function calculateSuperDeduction(input: SRLTaxCalculationInput) {
  const costoNuove = input.costoNuoveAssunzioni || 0;
  const incrementoCosto = input.incrementoCostoPersonale || 0;
  
  if (costoNuove === 0) return 0;
  
  // Minore tra costo effettivo nuovi e incremento totale
  const costoAgevolabile = Math.min(costoNuove, incrementoCosto);
  
  // Maggiorazione 20% (quindi 120% totale)
  return costoAgevolabile * 0.2;
}

// Calcolo deduzioni IRAP specifiche
function calculateIrapDeductions(input: SRLTaxCalculationInput) {
  let deductions = 0;
  
  // Contributi previdenziali dipendenti tempo indeterminato
  const contributiBased = input.employeeCosts * 0.3; // Stima contributi
  deductions += contributiBased;
  
  // Possibili deduzioni regionali specifiche
  if (input.region === 'FRIULI') {
    deductions += 2000; // Deduzione forfettaria esempio
  }
  
  return deductions;
}

function calculateVATDeadlines(vatRegime: string, totalVatAmount: number, frequency: number, fiscalYear: number = 2025) {
  const deadlines = [];
  
  if (vatRegime === 'TRIMESTRALE') {
    const quarterlyAmount = totalVatAmount / 4;
    deadlines.push(
      { date: `16/04/${fiscalYear}`, amount: quarterlyAmount, type: `IVA Q1 ${fiscalYear}` },
      { date: `16/07/${fiscalYear}`, amount: quarterlyAmount, type: `IVA Q2 ${fiscalYear}` },
      { date: `16/10/${fiscalYear}`, amount: quarterlyAmount, type: `IVA Q3 ${fiscalYear}` },
      { date: `16/01/${fiscalYear + 1}`, amount: quarterlyAmount, type: `IVA Q4 ${fiscalYear}` }
    );
  } else if (vatRegime === 'MENSILE') {
    const monthlyAmount = totalVatAmount / 12;
    for (let month = 1; month <= 12; month++) {
      const paymentMonth = month === 12 ? 1 : month + 1;
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
  
  // Scadenze IVA
  calendar.push(...vatDeadlines.map(deadline => ({
    ...deadline,
    category: 'IVA' as const,
    description: deadline.type
  })));
  
  // ACCONTI IRES/IRAP per anno fiscale
  const primoAccontoIRES = iresAmount * 0.40;
  const secondoAccontoIRES = iresAmount * 0.60;
  const primoAccontoIRAP = irapAmount * 0.40;
  const secondoAccontoIRAP = irapAmount * 0.60;
  
  calendar.push({
    date: `30/06/${fiscalYear}`,
    amount: primoAccontoIRES,
    type: `IRES I Acconto ${fiscalYear}`,
    category: 'IRES' as const,
    description: `Primo acconto IRES anno ${fiscalYear} (40%)`
  });
  
  calendar.push({
    date: `30/06/${fiscalYear}`,
    amount: primoAccontoIRAP,
    type: `IRAP I Acconto ${fiscalYear}`,
    category: 'IRAP' as const,
    description: `Primo acconto IRAP anno ${fiscalYear} (40%)`
  });
  
  calendar.push({
    date: `30/11/${fiscalYear}`,
    amount: secondoAccontoIRES,
    type: `IRES II Acconto ${fiscalYear}`,
    category: 'IRES' as const,
    description: `Secondo acconto IRES anno ${fiscalYear} (60%)`
  });
  
  calendar.push({
    date: `30/11/${fiscalYear}`,
    amount: secondoAccontoIRAP,
    type: `IRAP II Acconto ${fiscalYear}`,
    category: 'IRAP' as const,
    description: `Secondo acconto IRAP anno ${fiscalYear} (60%)`
  });
  
  // CONTRIBUTI INPS
  const inpsQuarterly = inpsTotalAmount / 4;
  if (inpsQuarterly > 0) {
    calendar.push(
      {
        date: `16/05/${fiscalYear}`,
        amount: inpsQuarterly,
        type: `INPS I Trim ${fiscalYear}`,
        category: 'INPS' as const,
        description: `Contributi INPS anno ${fiscalYear} - I trimestre`
      },
      {
        date: `20/08/${fiscalYear}`,
        amount: inpsQuarterly,
        type: `INPS II Trim ${fiscalYear}`,
        category: 'INPS' as const,
        description: `Contributi INPS anno ${fiscalYear} - II trimestre`
      },
      {
        date: `16/11/${fiscalYear}`,
        amount: inpsQuarterly,
        type: `INPS III Trim ${fiscalYear}`,
        category: 'INPS' as const,
        description: `Contributi INPS anno ${fiscalYear} - III trimestre`
      },
      {
        date: `16/02/${fiscalYear + 1}`,
        amount: inpsQuarterly,
        type: `INPS IV Trim ${fiscalYear}`,
        category: 'INPS' as const,
        description: `Contributi INPS anno ${fiscalYear} - IV trimestre`
      }
    );
  }
  
  return calendar.sort((a, b) => {
    const dateA = new Date(a.date.split('/').reverse().join('-'));
    const dateB = new Date(b.date.split('/').reverse().join('-'));
    return dateA.getTime() - dateB.getTime();
  });
}

function createPaymentSchedule(calendar: any[], currentBalance: number, monthlyAccrual: number, fiscalYear: number) {
  let runningBalance = currentBalance;
  const schedule: Array<{
    date: string;
    amount: number;
    type: string;
    category: 'IRES' | 'IRAP' | 'IVA' | 'INPS' | 'ACCUMULO';
    description: string;
    previousBalance: number;
    newBalance: number;
    deficit: number;
    isIncome: boolean;
    requiredPayment: number;
  }> = [];
  const today = new Date();
  
  const allEvents = [];
  
  // Versamenti mensili per mesi futuri
  for (let month = 1; month <= 12; month++) {
    const monthStr = month.toString().padStart(2, '0');
    const paymentDate = new Date(`${fiscalYear}-${monthStr}-01`);
    
    if (paymentDate >= today) {
      allEvents.push({
        date: `01/${monthStr}/${fiscalYear}`,
        amount: monthlyAccrual,
        type: `Versamento Mensile ${month}`,
        category: 'ACCUMULO' as const,
        description: `Accantonamento mensile consigliato`,
        isIncome: true
      });
    }
  }
  
  // Pagamenti tasse per date future
  calendar.forEach(payment => {
    const paymentDate = new Date(payment.date.split('/').reverse().join('-'));
    
    if (paymentDate >= today) {
      allEvents.push({
        ...payment,
        isIncome: false
      });
    }
  });
  
  allEvents.sort((a, b) => {
    const dateA = new Date(a.date.split('/').reverse().join('-'));
    const dateB = new Date(b.date.split('/').reverse().join('-'));
    return dateA.getTime() - dateB.getTime();
  });
  
  allEvents.forEach(event => {
    const previousBalance = runningBalance;
    let requiredPayment = 0;
    
    if (event.isIncome) {
      runningBalance += event.amount;
      requiredPayment = event.amount;
    } else {
      const balanceAfterPayment = runningBalance - event.amount;
      
      if (balanceAfterPayment < 0) {
        requiredPayment = Math.abs(balanceAfterPayment);
        runningBalance = 0;
      } else {
        requiredPayment = 0;
        runningBalance = balanceAfterPayment;
      }
    }
    
    const deficit = runningBalance < 0 ? Math.abs(runningBalance) : 0;
    
    schedule.push({
      date: event.date,
      amount: event.amount,
      type: event.type,
      category: event.category,
      description: event.description,
      previousBalance: Math.round(previousBalance * 100) / 100,
      newBalance: Math.round(runningBalance * 100) / 100,
      deficit: Math.round(deficit * 100) / 100,
      isIncome: event.isIncome,
      requiredPayment: Math.round(requiredPayment * 100) / 100
    });
  });
  
  return schedule;
}

export function calculateSRLTaxes(input: SRLTaxCalculationInput): SRLTaxCalculationResult {
  const fiscalYear = input.fiscalYear || 2025;
  
  // 1. CALCOLO REDDITO IMPONIBILE BASE
  const grossProfit = input.revenue - input.costs - input.employeeCosts;
  let taxableIncome = Math.max(0, grossProfit - input.adminSalary);
  
  // 2. CALCOLO ROL E INTERESSI PASSIVI
  const rolDetails = calculateROLAndInterests(input);
  taxableIncome -= rolDetails.interessiPassiviIndeducibili; // Sottrai parte indeducibile
  
  // 3. SUPER DEDUZIONE NUOVE ASSUNZIONI
  const superDeductionAmount = calculateSuperDeduction(input);
  taxableIncome = Math.max(0, taxableIncome - superDeductionAmount);
  
  // 4. UTILIZZO PERDITE FISCALI
  const lossesUsage = calculateLossesUsage(taxableIncome, input);
  const taxableIncomeAfterLosses = Math.max(0, taxableIncome - lossesUsage.lossesUsed);
  
  // 5. VERIFICA IRES PREMIALE
  const iresPremialeCheck = checkIresPremialeConditions(input);
  const iresRate = (iresPremialeCheck.isApplicable && fiscalYear === 2025) ? 0.20 : 0.24;
  const iresAmount = taxableIncomeAfterLosses * iresRate;
  
  // 6. CALCOLO IRAP
  const irapBase = input.revenue - (input.costs - input.employeeCosts); // Costi personale non deducibili
  const irapDeductions = calculateIrapDeductions(input);
  const irapTaxableIncome = Math.max(0, irapBase - irapDeductions);
  const irapRate = (IRAP_RATES[input.region as keyof typeof IRAP_RATES] || 3.9) / 100;
  const irapAmount = irapTaxableIncome * irapRate;
  
  // 7. CALCOLO IVA
  const vatOnSales = input.vatOnSales || (input.revenue * 0.22);
  const vatOnPurchases = input.vatOnPurchases || (input.costs * 0.22);
  let vatAmount = Math.max(0, vatOnSales - vatOnPurchases);
  
  if (input.hasVatDebt && input.vatDebt > 0) {
    vatAmount += input.vatDebt;
  }
  
  const vatFrequency = VAT_REGIMES[input.vatRegime as keyof typeof VAT_REGIMES]?.frequency || 4;
  const vatQuarterly = vatAmount / (vatFrequency / 4);
  const vatDeadlines = calculateVATDeadlines(input.vatRegime, vatAmount, vatFrequency, fiscalYear);
  
  // 8. CALCOLO CONTRIBUTI INPS
  let inpsAdmin = 0;
  if (input.adminSalary > 0) {
    const adminMinimum = 18324;
    const adminMaximum = 105014;
    const adminContributionBase = Math.max(adminMinimum, Math.min(input.adminSalary, adminMaximum));
    inpsAdmin = adminContributionBase * 0.24;
  }
  
  let inpsEmployees = 0;
  if (input.employees > 0 && input.employeeCosts > 0) {
    inpsEmployees = input.employeeCosts * 0.30;
  }
  
  const inpsTotalAmount = inpsAdmin + inpsEmployees;
  
  // 9. CALCOLO TOTALI
  const totalTaxes = iresAmount + irapAmount;
  const totalDue = totalTaxes + inpsTotalAmount + vatAmount;
  
  // 10. CALCOLO ACCONTI
  const iresFirstAcconto = iresAmount * 0.40;
  const iresSecondAcconto = iresAmount * 0.60;
  const irapFirstAcconto = irapAmount * 0.40;
  const irapSecondAcconto = irapAmount * 0.60;
  
  // 11. ACCANTONAMENTO MENSILE
  const monthlyAccrual = totalDue / 12;
  const quarterlyPayments = (vatQuarterly + inpsTotalAmount / 4);
  
  // 12. CALENDARIO E SCADENZIERE
  const calendar2025 = createFiscalCalendar2025(iresAmount, irapAmount, vatDeadlines, inpsTotalAmount, fiscalYear);
  const paymentSchedule = createPaymentSchedule(calendar2025, input.currentBalance, monthlyAccrual, fiscalYear);

  return {
    fiscalYear: fiscalYear,
    
    // Redditi
    grossProfit: Math.round(grossProfit * 100) / 100,
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    taxableIncomeAfterLosses: Math.round(taxableIncomeAfterLosses * 100) / 100,
    
    // IRES
    iresAmount: Math.round(iresAmount * 100) / 100,
    iresRate: iresRate,
    isIresPremialeApplicable: iresPremialeCheck.isApplicable,
    iresPremialeDetails: iresPremialeCheck.isApplicable ? iresPremialeCheck.details : undefined,
    
    // IRAP
    irapBase: Math.round(irapBase * 100) / 100,
    irapDeductions: Math.round(irapDeductions * 100) / 100,
    irapTaxableIncome: Math.round(irapTaxableIncome * 100) / 100,
    irapAmount: Math.round(irapAmount * 100) / 100,
    irapRate: irapRate,
    
    // Perdite fiscali
    lossesUsed: Math.round(lossesUsage.lossesUsed * 100) / 100,
    remainingLosses: Math.round(lossesUsage.remainingLosses * 100) / 100,
    
    // Super deduzione
    superDeductionAmount: Math.round(superDeductionAmount * 100) / 100,
    
    // ROL e interessi
    rolDetails: {
      rolFiscale: Math.round(rolDetails.rolFiscale * 100) / 100,
      interessiAttiviTotali: Math.round(rolDetails.interessiAttiviTotali * 100) / 100,
      interessiPassiviDeducibili: Math.round(rolDetails.interessiPassiviDeducibili * 100) / 100,
      interessiPassiviIndeducibili: Math.round(rolDetails.interessiPassiviIndeducibili * 100) / 100,
      limitROL: Math.round(rolDetails.limitROL * 100) / 100
    },
    
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
    
    // Calendario e scadenziere
    calendar2025: calendar2025,
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
