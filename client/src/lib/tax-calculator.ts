import { TAX_COEFFICIENTS } from './constants';

export interface TaxCalculationInput {
  revenue: number;
  macroCategory: keyof typeof TAX_COEFFICIENTS;
  isStartup: boolean;
  yearsActive: number;
  contributionRegime: string;
  contributionReduction: string;
  hasOtherCoverage: boolean;
}

export interface TaxCalculationResult {
  taxableIncome: number;
  taxRate: number;
  taxAmount: number;
  inpsAmount: number;
  inpsQuarterly?: number; // Solo per artigiani/commercianti
  inpsExcess?: number; // Eccedenza per artigiani/commercianti
  totalDue: number;
  firstAcconto: number;
  secondAcconto: number;
}

export function calculateTaxes(input: TaxCalculationInput): TaxCalculationResult {
  const { revenue, macroCategory, isStartup, yearsActive, contributionRegime, contributionReduction, hasOtherCoverage } = input;

  // Calculate taxable income
  const coefficient = TAX_COEFFICIENTS[macroCategory]?.value || 0.67;
  const taxableIncome = revenue * coefficient;

  // Calculate tax rate and amount
  const taxRate = (isStartup && yearsActive <= 5) ? 0.05 : 0.15;
  const taxAmount = taxableIncome * taxRate;

  // Calculate INPS contributions
  let inpsAmount = 0;
  let inpsQuarterly: number | undefined;
  let inpsExcess: number | undefined;
  
  if (contributionRegime === 'GESTIONE_SEPARATA') {
    // Gestione Separata: versamento annuale basato sul reddito
    const rate = hasOtherCoverage ? 0.24 : 0.2607;
    const applicableIncome = Math.max(Math.min(taxableIncome, 120607), 18555);
    inpsAmount = applicableIncome * rate;
  } else if (contributionRegime === 'CASSA_FORENSE') {
    // Cassa Forense per Avvocati
    let subjectiveContribution = 0;
    let integrativeContribution = 0;
    
    if (taxableIncome <= 130000) {
      subjectiveContribution = Math.max(taxableIncome * 0.16, 2750);
    } else {
      subjectiveContribution = 130000 * 0.16 + (taxableIncome - 130000) * 0.03;
    }
    
    integrativeContribution = Math.max(taxableIncome * 0.04, 350);
    
    // Apply reductions
    if (contributionReduction === '35') {
      subjectiveContribution *= 0.65;
      integrativeContribution *= 0.65;
    } else if (contributionReduction === '50') {
      subjectiveContribution *= 0.50;
      integrativeContribution *= 0.50;
    }
    
    inpsAmount = subjectiveContribution + integrativeContribution;
  } else if (contributionRegime === 'INARCASSA') {
    // Inarcassa per Ingegneri e Architetti
    let subjectiveContribution = 0;
    let integrativeContribution = 0;
    const maternityContribution = 72;
    
    // Contributo soggettivo 14.5% fino a €142.650
    const applicableIncome = Math.min(taxableIncome, 142650);
    subjectiveContribution = applicableIncome * 0.145;
    
    // Contributo integrativo 4% con minimo €815
    integrativeContribution = Math.max(taxableIncome * 0.04, 815);
    
    // Apply reductions
    if (contributionReduction === '35') {
      subjectiveContribution *= 0.65;
      integrativeContribution *= 0.65;
    } else if (contributionReduction === '50') {
      subjectiveContribution *= 0.50;
      integrativeContribution *= 0.50;
    }
    
    inpsAmount = subjectiveContribution + integrativeContribution + maternityContribution;
  } else {
    // Artigiani/Commercianti: contributi fissi trimestrali + eccedenza
    const minimums = {
      'IVS_ARTIGIANI': 4460.64,
      'IVS_COMMERCIANTI': 4549.70
    };
    
    let minimum = minimums[contributionRegime as keyof typeof minimums] || 4460.64;
    
    // Apply reductions al contributo fisso
    let quarterlyBase = minimum;
    if (contributionReduction === '35') quarterlyBase *= 0.65;
    else if (contributionReduction === '50') quarterlyBase *= 0.50;
    
    // Contributo trimestrale fisso (diviso per 4 rate)
    inpsQuarterly = quarterlyBase / 4;
    
    inpsAmount = quarterlyBase;
    
    // Calcolo eccedenza (se reddito > minimale €18.555)
    inpsExcess = 0;
    if (taxableIncome > 18555) {
      const thresholds = {
        'IVS_ARTIGIANI': { rate1: 0.24, rate2: 0.25, threshold: 55448 },
        'IVS_COMMERCIANTI': { rate1: 0.2448, rate2: 0.2548, threshold: 55448 }
      };
      
      const config = thresholds[contributionRegime as keyof typeof thresholds];
      if (config) {
        const excessBase = taxableIncome - 18555;
        let excess = 0;
        
        if (taxableIncome <= config.threshold) {
          excess = excessBase * config.rate1;
        } else {
          excess = (config.threshold - 18555) * config.rate1 + (taxableIncome - config.threshold) * config.rate2;
        }
        
        const reductionFactor = contributionReduction === '35' ? 0.65 : 
                               contributionReduction === '50' ? 0.50 : 1;
        inpsExcess = excess * reductionFactor;
        inpsAmount += inpsExcess;
      }
    }
  }

  const totalDue = taxAmount + inpsAmount;

  // Calcolo acconti secondo normativa
  let firstAcconto = 0;
  let secondAcconto = 0;
  
  if (taxAmount >= 52) {
    if (taxAmount <= 257.52) {
      // Un'unica rata a novembre
      secondAcconto = taxAmount;
    } else {
      // Due rate: 40% a giugno, 60% a novembre
      firstAcconto = taxAmount * 0.4;
      secondAcconto = taxAmount * 0.6;
    }
  }

  return {
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    taxRate: Math.round(taxRate * 10000) / 100, // Convert to percentage
    taxAmount: Math.round(taxAmount * 100) / 100,
    inpsAmount: Math.round(inpsAmount * 100) / 100,
    inpsQuarterly: inpsQuarterly ? Math.round(inpsQuarterly * 100) / 100 : undefined,
    inpsExcess: inpsExcess ? Math.round(inpsExcess * 100) / 100 : undefined,
    totalDue: Math.round(totalDue * 100) / 100,
    firstAcconto: Math.round(firstAcconto * 100) / 100,
    secondAcconto: Math.round(secondAcconto * 100) / 100
  };
}

export function calculateInstallments(totalDue: number, currentBalance: number, monthsUntilDeadline: number) {
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
