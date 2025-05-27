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
  totalDue: number;
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
  
  if (contributionRegime === 'GESTIONE_SEPARATA') {
    const rate = hasOtherCoverage ? 0.24 : 0.26;
    inpsAmount = Math.min(taxableIncome, 120607) * rate;
  } else {
    const minimums = {
      'IVS_ARTIGIANI': 4427.04,
      'IVS_COMMERCIANTI': 4515.43
    };
    
    let minimum = minimums[contributionRegime as keyof typeof minimums] || 4427.04;
    
    // Apply reductions
    if (contributionReduction === '35') minimum *= 0.65;
    else if (contributionReduction === '50') minimum *= 0.50;
    
    inpsAmount = minimum;
    
    // Add percentage on excess income
    if (taxableIncome > 18324) {
      const excess = (taxableIncome - 18324) * 0.24;
      const reductionFactor = contributionReduction === '35' ? 0.65 : 
                             contributionReduction === '50' ? 0.50 : 1;
      inpsAmount += excess * reductionFactor;
    }
  }

  const totalDue = taxAmount + inpsAmount;

  return {
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    taxRate: Math.round(taxRate * 10000) / 100, // Convert to percentage
    taxAmount: Math.round(taxAmount * 100) / 100,
    inpsAmount: Math.round(inpsAmount * 100) / 100,
    totalDue: Math.round(totalDue * 100) / 100
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
