// Calcolatore delle tasse per Ditte Individuali in Regime Ordinario (Normativa 2025)

export interface IndividualTaxCalculationInput {
  // Dati anagrafici e di attività
  startDate?: string;
  startYear?: number;
  atecoCode: string;
  businessType: 'professional' | 'business' | 'artisan' | 'commercial';
  
  // Ricavi e spese (dati principali per il calcolo)
  revenue: number;
  documentedExpenses: number;
  
  // Dati 2025 per pianificazione (opzionali)
  revenue2025?: number;
  documentedExpenses2025?: number;
  
  // Altri redditi per IRPEF complessiva
  otherIncome?: number;
  employmentIncome?: number;
  
  // Ritenute e acconti già versati
  taxWithholdings?: number;
  irpefFirstAcconto?: number;
  irpefSecondAcconto?: number;
  
  // Contributi previdenziali
  contributionType: 'inps_gestione_separata' | 'cassa_forense' | 'inarcassa' | 'inps_artigiani' | 'inps_commercianti';
  hasOtherPension?: boolean;
  isPensioner?: boolean;
  rivalsa4Percent?: boolean; // Solo per professionisti Gestione Separata
  
  // Dati anno precedente per acconti
  previousYearTaxableIncome?: number;
  previousYearIrpef?: number;
  
  // IVA
  vatRegime: string;
  vatOnSales?: number;
  vatOnPurchases?: number;
  hasVatDebt?: boolean;
  vatDebt?: number;
  
  // Liquidità e pianificazione
  currentBalance?: number;
  fiscalYear?: number;
}

export interface IndividualTaxCalculationResult {
  fiscalYear: number;
  
  // Reddito d'impresa/professionale
  businessRevenue: number;
  businessExpenses: number;
  businessIncome: number;
  
  // IRPEF
  totalTaxableIncome: number; // Include altri redditi
  irpefGrossAmount: number;
  irpefDeductions: number;
  irpefNetAmount: number;
  irpefRate: number;
  
  // Addizionali regionali e comunali
  regionalSurcharge: number;
  municipalSurcharge: number;
  
  // Calcoli 2026 (se presenti dati 2025)
  planning2026?: {
    businessRevenue: number;
    businessExpenses: number;
    businessIncome: number;
    totalTaxableIncome: number;
    irpefNetAmount: number;
    irpefRate: number;
    regionalSurcharge: number;
    municipalSurcharge: number;
    contributionAmount: number;
    totalTaxes: number;
    totalContributions: number;
    totalDue: number;
    irpefFirstAcconto: number;
    irpefSecondAcconto: number;
  };
  
  // Contributi previdenziali
  contributionDetails: {
    type: string;
    baseAmount: number;
    rate: number;
    minimumContribution: number;
    maximumContribution: number;
    calculatedAmount: number;
    integrative?: number; // Per Casse professionali
    maternity?: number; // Per alcune gestioni
  };
  
  // IVA
  vatAmount: number;
  vatQuarterly: number;
  vatDeadlines: Array<{
    date: string;
    amount: number;
    type: string;
  }>;
  
  // Acconti
  irpefFirstAcconto: number;
  irpefSecondAcconto: number;
  contributionAcconti: number;
  
  // Totali
  totalTaxes: number;
  totalContributions: number;
  totalDue: number;
  
  // Scadenziere e pianificazione
  calendar2025: Array<{
    date: string;
    amount: number;
    type: string;
    category: 'IRPEF' | 'CONTRIBUTI' | 'IVA' | 'ACCUMULO';
    description: string;
  }>;
  
  paymentSchedule: Array<{
    date: string;
    amount: number;
    type: string;
    category: 'IRPEF' | 'CONTRIBUTI' | 'IVA' | 'ACCUMULO';
    description: string;
    previousBalance: number;
    newBalance: number;
    deficit: number;
    isIncome: boolean;
    requiredPayment: number;
  }>;
  
  monthlyAccrual: number;
}

// Scaglioni IRPEF 2025
export const IRPEF_BRACKETS = [
  { min: 0, max: 28000, rate: 0.23 },
  { min: 28000, max: 50000, rate: 0.35 },
  { min: 50000, max: 55000, rate: 0.43 },
  { min: 55000, max: Infinity, rate: 0.43 }
];

// Aliquote contributive 2025 aggiornate dal manuale tecnico-operativo
export const CONTRIBUTION_RATES = {
  inps_gestione_separata: {
    withoutOtherPension: 0.2607, // 26,07% (include 0,72% maternità + 0,35% ISCRO)
    withOtherPension: 0.24, // 24%
    pensioner: 0.24, // 24%
    maxBase: 120607 // Massimale 2025
  },
  cassa_forense: {
    subjectiveRate: 0.16, // 16% fino a €130.000
    subjectiveRateHigh: 0.03, // 3% oltre €130.000
    subjectiveThreshold: 130000,
    integrativeRate: 0.04, // 4%
    minimumSubjective: 2750, // Minimo soggettivo 2025
    minimumIntegrative: 350 // Minimo integrativo 2025
  },
  inarcassa: {
    subjectiveRate: 0.145, // 14,5% fino a €142.650
    maxSubjectiveBase: 142650,
    integrativeRate: 0.04, // 4% su volume d'affari
    minimumIntegrative: 815, // Minimo integrativo 2025
    maternity: 72 // Contributo maternità/paternità 2025
  },
  inps_artigiani: {
    minimumIncome: 18555, // Reddito minimale 2025
    fixedContribution: 4460.64, // Contributi fissi 2025
    percentageRate1: 0.24, // 24% fino a €55.448
    percentageRate2: 0.25, // 25% oltre €55.448
    threshold: 55448,
    maxBase2025_ante1996: 92413,
    maxBase2025_post1996: 120607
  },
  inps_commercianti: {
    minimumIncome: 18555, // Reddito minimale 2025
    fixedContribution: 4549.70, // Contributi fissi 2025
    percentageRate1: 0.2448, // 24,48% fino a €55.448
    percentageRate2: 0.2548, // 25,48% oltre €55.448
    threshold: 55448,
    maxBase2025_ante1996: 92413,
    maxBase2025_post1996: 120607
  }
};

// Addizionali regionali (medie - variano per regione)
export const REGIONAL_SURCHARGE_RATES = {
  'LOMBARDIA': 0.0173,
  'LAZIO': 0.0333,
  'CAMPANIA': 0.0333,
  'SICILIA': 0.0333,
  // Media nazionale come default
  'DEFAULT': 0.014
};

function calculateIrpef(taxableIncome: number): { grossAmount: number; rate: number } {
  let totalTax = 0;
  let remainingIncome = taxableIncome;
  
  for (const bracket of IRPEF_BRACKETS) {
    if (remainingIncome <= 0) break;
    
    const taxableInThisBracket = Math.min(remainingIncome, bracket.max - bracket.min);
    totalTax += taxableInThisBracket * bracket.rate;
    remainingIncome -= taxableInThisBracket;
  }
  
  const averageRate = taxableIncome > 0 ? totalTax / taxableIncome : 0;
  
  return {
    grossAmount: totalTax,
    rate: averageRate
  };
}

function calculateContributions(
  income: number, 
  type: string, 
  hasOtherPension: boolean = false, 
  isPensioner: boolean = false,
  rivalsa4Percent: boolean = false
) {
  let result = {
    type,
    baseAmount: income,
    rate: 0,
    minimumContribution: 0,
    maximumContribution: 0,
    calculatedAmount: 0,
    integrative: 0,
    maternity: 0
  };
  
  switch (type) {
    case 'inps_gestione_separata':
      const rates = CONTRIBUTION_RATES.inps_gestione_separata;
      const rate = isPensioner ? rates.withOtherPension : 
                   hasOtherPension ? rates.withOtherPension : 
                   rates.withoutOtherPension;
      
      const baseIncome = rivalsa4Percent ? income * 1.04 : income;
      const cappedIncome = Math.min(baseIncome, rates.maxBase);
      
      result = {
        ...result,
        rate,
        baseAmount: cappedIncome,
        calculatedAmount: cappedIncome * rate,
        maximumContribution: rates.maxBase * rate
      };
      break;
      
    case 'cassa_forense':
      const ratesForense = CONTRIBUTION_RATES.cassa_forense;
      const subjectiveBase = Math.min(income, ratesForense.subjectiveThreshold);
      const subjectiveHigh = Math.max(0, income - ratesForense.subjectiveThreshold);
      const subjective = (subjectiveBase * ratesForense.subjectiveRate) + (subjectiveHigh * ratesForense.subjectiveRateHigh);
      const integrative = income * ratesForense.integrativeRate;
      
      result = {
        ...result,
        rate: ratesForense.subjectiveRate,
        calculatedAmount: Math.max(subjective, ratesForense.minimumSubjective),
        minimumContribution: ratesForense.minimumSubjective,
        integrative: Math.max(integrative, ratesForense.minimumIntegrative),
        maternity: 0
      };
      break;
      
    case 'inarcassa':
      const ratesInarca = CONTRIBUTION_RATES.inarcassa;
      const subjectiveInarca = Math.min(income, ratesInarca.maxSubjectiveBase) * ratesInarca.subjectiveRate;
      const integrativeInarca = Math.max(income * ratesInarca.integrativeRate, ratesInarca.minimumIntegrative);
      
      result = {
        ...result,
        rate: ratesInarca.subjectiveRate,
        calculatedAmount: subjectiveInarca,
        integrative: integrativeInarca,
        maternity: ratesInarca.maternity
      };
      break;
      
    case 'inps_artigiani':
    case 'inps_commercianti':
      const isCommercial = type === 'inps_commercianti';
      const ratesArtig = isCommercial ? CONTRIBUTION_RATES.inps_commercianti : CONTRIBUTION_RATES.inps_artigiani;
      const fixed = ratesArtig.fixedContribution;
      
      if (income <= ratesArtig.minimumIncome) {
        result.calculatedAmount = fixed;
      } else {
        const excessIncome = income - ratesArtig.minimumIncome;
        const cappedExcess = Math.min(excessIncome, ratesArtig.threshold - ratesArtig.minimumIncome);
        const highExcess = Math.max(0, excessIncome - cappedExcess);
        
        const percentageContrib = (cappedExcess * ratesArtig.percentageRate1) + (highExcess * ratesArtig.percentageRate2);
        result.calculatedAmount = fixed + percentageContrib;
      }
      
      result.minimumContribution = fixed;
      result.rate = income > ratesArtig.minimumIncome ? ratesArtig.percentageRate1 : 0;
      break;
  }
  
  return result;
}

function createIndividualFiscalCalendar(
  irpefFirst: number,
  irpefSecond: number,
  contributions: number,
  vatAmount: number,
  vatRegime: string,
  fiscalYear: number = 2025
) {
  const calendar = [];
  
  // IRPEF - Acconti
  if (irpefFirst > 0) {
    calendar.push({
      date: '2025-06-16',
      amount: irpefFirst,
      type: 'IRPEF - I Acconto',
      category: 'IRPEF' as const,
      description: 'Primo acconto IRPEF (40%)'
    });
  }
  
  if (irpefSecond > 0) {
    calendar.push({
      date: '2025-11-30',
      amount: irpefSecond,
      type: 'IRPEF - II Acconto',
      category: 'IRPEF' as const,
      description: 'Secondo acconto IRPEF (60%)'
    });
  }
  
  // Contributi previdenziali trimestrali
  const quarterlyContrib = contributions / 4;
  if (quarterlyContrib > 0) {
    calendar.push(
      {
        date: '2025-05-16',
        amount: quarterlyContrib,
        type: 'Contributi I Trim.',
        category: 'CONTRIBUTI' as const,
        description: 'Contributi previdenziali primo trimestre'
      },
      {
        date: '2025-08-20',
        amount: quarterlyContrib,
        type: 'Contributi II Trim.',
        category: 'CONTRIBUTI' as const,
        description: 'Contributi previdenziali secondo trimestre'
      },
      {
        date: '2025-11-16',
        amount: quarterlyContrib,
        type: 'Contributi III Trim.',
        category: 'CONTRIBUTI' as const,
        description: 'Contributi previdenziali terzo trimestre'
      },
      {
        date: '2025-02-16',
        amount: quarterlyContrib,
        type: 'Contributi IV Trim.',
        category: 'CONTRIBUTI' as const,
        description: 'Contributi previdenziali quarto trimestre'
      }
    );
  }
  
  // IVA trimestrale
  const vatQuarterly = vatAmount / 4;
  if (vatQuarterly > 0) {
    calendar.push(
      {
        date: '2025-04-16',
        amount: vatQuarterly,
        type: 'IVA I Trim.',
        category: 'IVA' as const,
        description: 'Liquidazione IVA primo trimestre'
      },
      {
        date: '2025-07-16',
        amount: vatQuarterly,
        type: 'IVA II Trim.',
        category: 'IVA' as const,
        description: 'Liquidazione IVA secondo trimestre'
      },
      {
        date: '2025-10-16',
        amount: vatQuarterly,
        type: 'IVA III Trim.',
        category: 'IVA' as const,
        description: 'Liquidazione IVA terzo trimestre'
      },
      {
        date: '2026-01-16',
        amount: vatQuarterly,
        type: 'IVA IV Trim.',
        category: 'IVA' as const,
        description: 'Liquidazione IVA quarto trimestre'
      }
    );
  }
  
  return calendar.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function createIndividualPaymentSchedule(
  calendar: any[], 
  currentBalance: number, 
  monthlyAccrual: number, 
  fiscalYear: number
) {
  const schedule = [];
  let runningBalance = currentBalance;
  const today = new Date();
  const allEvents = [];
  
  // Aggiungi accumuli mensili solo per mesi futuri
  for (let month = 1; month <= 12; month++) {
    const date = new Date(fiscalYear, month - 1, 1);
    
    // Solo se la data è futura
    if (date >= today) {
      allEvents.push({
        date: `${fiscalYear}-${month.toString().padStart(2, '0')}-01`,
        amount: monthlyAccrual,
        type: 'Accumulo Mensile',
        category: 'ACCUMULO' as const,
        description: `Accumulo per tasse del mese ${month}`,
        isIncome: true
      });
    }
  }
  
  // Aggiungi eventi del calendario solo se futuri
  calendar.forEach(event => {
    const eventDate = new Date(event.date);
    if (eventDate >= today) {
      allEvents.push({
        ...event,
        isIncome: false
      });
    }
  });
  
  // Ordina tutti gli eventi per data
  allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Processa gli eventi ordinati
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
  
  return schedule.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function calculateIndividualTaxes(input: IndividualTaxCalculationInput): IndividualTaxCalculationResult {
  const fiscalYear = input.fiscalYear || 2025;
  const startYear = input.startYear || (input.startDate ? new Date(input.startDate).getFullYear() : 2025);
  
  // 1. CALCOLO REDDITO D'IMPRESA/PROFESSIONALE
  const businessIncome = Math.max(0, input.revenue - input.documentedExpenses);
  
  // 2. CALCOLO REDDITO COMPLESSIVO IRPEF
  const totalTaxableIncome = businessIncome + (input.otherIncome || 0) + (input.employmentIncome || 0);
  
  // 3. CALCOLO IRPEF
  const irpefCalculation = calculateIrpef(totalTaxableIncome);
  const irpefGrossAmount = irpefCalculation.grossAmount;
  
  // 4. DEDUZIONI (contributi previdenziali versati anno precedente)
  const contributionDetails = calculateContributions(
    businessIncome,
    input.contributionType,
    input.hasOtherPension,
    input.isPensioner,
    input.rivalsa4Percent
  );
  
  // 5. IRPEF NETTA
  const irpefNetAmount = Math.max(0, irpefGrossAmount - (input.taxWithholdings || 0));
  
  // 6. ADDIZIONALI REGIONALI E COMUNALI
  const regionalSurcharge = totalTaxableIncome * (REGIONAL_SURCHARGE_RATES.DEFAULT);
  const municipalSurcharge = totalTaxableIncome * 0.008; // Media comunale 0,8%
  
  // 7. IVA
  const vatOnSales = input.vatOnSales || (input.revenue * 0.22); // Default 22%
  const vatOnPurchases = input.vatOnPurchases || (input.documentedExpenses * 0.22);
  const vatAmount = Math.max(0, vatOnSales - vatOnPurchases);
  const vatQuarterly = vatAmount / 4;
  
  // 8. ACCONTI (basati su anno precedente)
  const previousTax = input.previousYearIrpef || (irpefNetAmount * 0.8);
  const irpefFirstAcconto = previousTax * 0.40; // 40%
  const irpefSecondAcconto = previousTax * 0.60; // 60%
  
  // 9. TOTALI
  const totalTaxes = irpefNetAmount + regionalSurcharge + municipalSurcharge;
  const totalContributions = contributionDetails.calculatedAmount + 
                            (contributionDetails.integrative || 0) + 
                            (contributionDetails.maternity || 0);
  const totalDue = totalTaxes + totalContributions + vatAmount;
  
  // 10. PIANIFICAZIONE MENSILE
  const monthlyAccrual = totalDue / 12;
  
  // 11. CALENDARIO E SCADENZIERE
  const calendar2025 = createIndividualFiscalCalendar(
    irpefFirstAcconto,
    irpefSecondAcconto,
    totalContributions,
    vatAmount,
    input.vatRegime,
    fiscalYear
  );
  
  const paymentSchedule = createIndividualPaymentSchedule(
    calendar2025,
    input.currentBalance || 0,
    monthlyAccrual,
    fiscalYear
  );

  // 12. CALCOLO 2026 (se presenti dati 2025)
  let planning2026 = undefined;
  if (input.revenue2025 && input.revenue2025 > 0) {
    const businessIncome2025 = Math.max(0, input.revenue2025 - (input.documentedExpenses2025 || 0));
    const totalTaxableIncome2025 = businessIncome2025 + (input.otherIncome || 0) + (input.employmentIncome || 0);
    
    const irpef2025Calculation = calculateIrpef(totalTaxableIncome2025);
    const contribution2025Details = calculateContributions(
      businessIncome2025,
      input.contributionType,
      input.hasOtherPension,
      input.isPensioner,
      input.rivalsa4Percent
    );
    
    const irpef2025Net = irpef2025Calculation.grossAmount;
    const regional2025 = totalTaxableIncome2025 * REGIONAL_SURCHARGE_RATES.DEFAULT;
    const municipal2025 = totalTaxableIncome2025 * 0.008;
    
    const totalTaxes2025 = irpef2025Net + regional2025 + municipal2025;
    const totalContributions2025 = contribution2025Details.calculatedAmount + 
                                  (contribution2025Details.integrative || 0) + 
                                  (contribution2025Details.maternity || 0);
    const totalDue2025 = totalTaxes2025 + totalContributions2025;
    
    // Acconti 2026 basati su imposte 2025
    const irpefFirstAcconto2026 = totalTaxes2025 * 0.40;
    const irpefSecondAcconto2026 = totalTaxes2025 * 0.60;
    
    planning2026 = {
      businessRevenue: Math.round(input.revenue2025 * 100) / 100,
      businessExpenses: Math.round((input.documentedExpenses2025 || 0) * 100) / 100,
      businessIncome: Math.round(businessIncome2025 * 100) / 100,
      totalTaxableIncome: Math.round(totalTaxableIncome2025 * 100) / 100,
      irpefNetAmount: Math.round(irpef2025Net * 100) / 100,
      irpefRate: Math.round(irpef2025Calculation.rate * 10000) / 100,
      regionalSurcharge: Math.round(regional2025 * 100) / 100,
      municipalSurcharge: Math.round(municipal2025 * 100) / 100,
      contributionAmount: Math.round(totalContributions2025 * 100) / 100,
      totalTaxes: Math.round(totalTaxes2025 * 100) / 100,
      totalContributions: Math.round(totalContributions2025 * 100) / 100,
      totalDue: Math.round(totalDue2025 * 100) / 100,
      irpefFirstAcconto: Math.round(irpefFirstAcconto2026 * 100) / 100,
      irpefSecondAcconto: Math.round(irpefSecondAcconto2026 * 100) / 100,
    };
  }
  
  return {
    fiscalYear,
    
    // Reddito d'impresa/professionale
    businessRevenue: Math.round(input.revenue * 100) / 100,
    businessExpenses: Math.round(input.documentedExpenses * 100) / 100,
    businessIncome: Math.round(businessIncome * 100) / 100,
    
    // IRPEF
    totalTaxableIncome: Math.round(totalTaxableIncome * 100) / 100,
    irpefGrossAmount: Math.round(irpefGrossAmount * 100) / 100,
    irpefDeductions: Math.round((input.taxWithholdings || 0) * 100) / 100,
    irpefNetAmount: Math.round(irpefNetAmount * 100) / 100,
    irpefRate: Math.round(irpefCalculation.rate * 10000) / 100, // Percentuale
    
    // Addizionali
    regionalSurcharge: Math.round(regionalSurcharge * 100) / 100,
    municipalSurcharge: Math.round(municipalSurcharge * 100) / 100,
    
    // Contributi
    contributionDetails: {
      ...contributionDetails,
      calculatedAmount: Math.round(contributionDetails.calculatedAmount * 100) / 100,
      integrative: Math.round((contributionDetails.integrative || 0) * 100) / 100,
      maternity: Math.round((contributionDetails.maternity || 0) * 100) / 100
    },
    
    // IVA
    vatAmount: Math.round(vatAmount * 100) / 100,
    vatQuarterly: Math.round(vatQuarterly * 100) / 100,
    vatDeadlines: [
      { date: '2025-04-16', amount: Math.round(vatQuarterly * 100) / 100, type: 'IVA I Trim.' },
      { date: '2025-07-16', amount: Math.round(vatQuarterly * 100) / 100, type: 'IVA II Trim.' },
      { date: '2025-10-16', amount: Math.round(vatQuarterly * 100) / 100, type: 'IVA III Trim.' },
      { date: '2026-01-16', amount: Math.round(vatQuarterly * 100) / 100, type: 'IVA IV Trim.' }
    ],
    
    // Acconti
    irpefFirstAcconto: Math.round(irpefFirstAcconto * 100) / 100,
    irpefSecondAcconto: Math.round(irpefSecondAcconto * 100) / 100,
    contributionAcconti: Math.round(totalContributions * 100) / 100,
    
    // Totali
    totalTaxes: Math.round(totalTaxes * 100) / 100,
    totalContributions: Math.round(totalContributions * 100) / 100,
    totalDue: Math.round(totalDue * 100) / 100,
    
    // Pianificazione
    monthlyAccrual: Math.round(monthlyAccrual * 100) / 100,
    calendar2025,
    paymentSchedule,
    
    // Pianificazione 2026 (se presente)
    planning2026
  };
}

export function calculateIndividualInstallments(totalDue: number, currentBalance: number, monthsUntilDeadline: number) {
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