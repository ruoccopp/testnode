// shared/lib/tax-calculator.ts
// Libreria centralizzata per tutti i calcoli fiscali

export interface TaxCalculationInput {
  revenue: number;
  macroCategory: MacroCategory;
  isStartup: boolean;
  startDate: string;
  contributionRegime: ContributionRegime;
  contributionReduction: ContributionReduction;
  hasOtherCoverage: boolean;
  year?: number;
}

export interface TaxCalculationResult {
  revenue: number;
  taxableIncome: number;
  taxRate: number;
  taxAmount: number;
  inpsAmount: number;
  totalDue: number;
  details: {
    coefficient: number;
    inpsRate?: number;
    inpsMinimum?: number;
    inpsExcess?: number;
  };
}

// Tipi per type safety
export type MacroCategory = 
  | 'FOOD_COMMERCE'
  | 'STREET_COMMERCE'
  | 'INTERMEDIARIES'
  | 'OTHER_ACTIVITIES'
  | 'PROFESSIONAL'
  | 'CONSTRUCTION';

export type ContributionRegime = 
  | 'GESTIONE_SEPARATA'
  | 'IVS_ARTIGIANI'
  | 'IVS_COMMERCIANTI';

export type ContributionReduction = 'NONE' | 'REDUCTION_35' | 'REDUCTION_50';

// Costanti configurabili (potrebbero venire da DB in futuro)
export const TAX_CONSTANTS = {
  coefficients: {
    FOOD_COMMERCE: 0.40,
    STREET_COMMERCE: 0.54,
    INTERMEDIARIES: 0.62,
    OTHER_ACTIVITIES: 0.67,
    PROFESSIONAL: 0.78,
    CONSTRUCTION: 0.86,
  },
  
  taxRates: {
    startup: 0.05,
    standard: 0.15,
    startupYearsLimit: 5,
  },
  
  inps: {
    gestioneSeparata: {
      rateWithCoverage: 0.24,
      rateWithoutCoverage: 0.2572,
      minimumIncome: 18555,
      maximumIncome: 120607,
    },
    ivs: {
      artigiani: {
        minimum: 4427.04,
        excessRate: 0.24,
        excessThreshold: 18324,
      },
      commercianti: {
        minimum: 4515.43,
        excessRate: 0.24,
        excessThreshold: 18324,
        additionalRate: 0.0048,
      },
    },
  },
} as const;

// Classe principale per i calcoli
export class TaxCalculator {
  /**
   * Calcola tutte le imposte per il regime forfettario
   */
  static calculate(input: TaxCalculationInput): TaxCalculationResult {
    const taxableIncome = this.calculateTaxableIncome(input.revenue, input.macroCategory);
    const taxRate = this.calculateTaxRate(input.isStartup, input.startDate, input.year);
    const taxAmount = this.calculateTaxAmount(taxableIncome, taxRate);
    const inpsDetails = this.calculateINPS(taxableIncome, input);
    const totalDue = taxAmount + inpsDetails.amount;

    return {
      revenue: input.revenue,
      taxableIncome,
      taxRate,
      taxAmount,
      inpsAmount: inpsDetails.amount,
      totalDue,
      details: {
        coefficient: TAX_CONSTANTS.coefficients[input.macroCategory],
        ...inpsDetails.details,
      },
    };
  }

  /**
   * Calcola il reddito imponibile applicando il coefficiente di redditività
   */
  static calculateTaxableIncome(revenue: number, category: MacroCategory): number {
    const coefficient = TAX_CONSTANTS.coefficients[category];
    return revenue * coefficient;
  }

  /**
   * Determina l'aliquota fiscale (5% startup o 15% standard)
   */
  static calculateTaxRate(isStartup: boolean, startDate: string, currentYear?: number): number {
    if (!isStartup) {
      return TAX_CONSTANTS.taxRates.standard;
    }

    const year = currentYear || new Date().getFullYear();
    const startYear = new Date(startDate).getFullYear();
    const yearsActive = year - startYear;

    return yearsActive <= TAX_CONSTANTS.taxRates.startupYearsLimit
      ? TAX_CONSTANTS.taxRates.startup
      : TAX_CONSTANTS.taxRates.standard;
  }

  /**
   * Calcola l'imposta sostitutiva
   */
  static calculateTaxAmount(taxableIncome: number, taxRate: number): number {
    return taxableIncome * taxRate;
  }

  /**
   * Calcola i contributi INPS in base al regime scelto
   */
  static calculateINPS(
    taxableIncome: number,
    input: Pick<TaxCalculationInput, 'contributionRegime' | 'contributionReduction' | 'hasOtherCoverage'>
  ): { amount: number; details: any } {
    switch (input.contributionRegime) {
      case 'GESTIONE_SEPARATA':
        return this.calculateINPSGestioneSeparata(taxableIncome, input.hasOtherCoverage);
      
      case 'IVS_ARTIGIANI':
        return this.calculateINPSArtigiani(taxableIncome, input.contributionReduction);
      
      case 'IVS_COMMERCIANTI':
        return this.calculateINPSCommercianti(taxableIncome, input.contributionReduction);
      
      default:
        return { amount: 0, details: {} };
    }
  }

  private static calculateINPSGestioneSeparata(
    taxableIncome: number,
    hasOtherCoverage: boolean
  ): { amount: number; details: any } {
    const config = TAX_CONSTANTS.inps.gestioneSeparata;
    const rate = hasOtherCoverage ? config.rateWithCoverage : config.rateWithoutCoverage;
    
    // Applica minimale e massimale
    const applicableIncome = Math.max(
      Math.min(taxableIncome, config.maximumIncome),
      config.minimumIncome
    );
    
    return {
      amount: applicableIncome * rate,
      details: {
        inpsRate: rate,
        applicableIncome,
      },
    };
  }

  private static calculateINPSArtigiani(
    taxableIncome: number,
    reduction: ContributionReduction
  ): { amount: number; details: any } {
    const config = TAX_CONSTANTS.inps.ivs.artigiani;
    const reductionFactor = this.getReductionFactor(reduction);
    
    let amount = config.minimum * reductionFactor;
    let excessAmount = 0;
    
    if (taxableIncome > config.excessThreshold) {
      const excess = (taxableIncome - config.excessThreshold) * config.excessRate;
      excessAmount = excess * reductionFactor;
      amount += excessAmount;
    }
    
    return {
      amount,
      details: {
        inpsMinimum: config.minimum * reductionFactor,
        inpsExcess: excessAmount,
        reductionFactor,
      },
    };
  }

  private static calculateINPSCommercianti(
    taxableIncome: number,
    reduction: ContributionReduction
  ): { amount: number; details: any } {
    const config = TAX_CONSTANTS.inps.ivs.commercianti;
    const artigianiResult = this.calculateINPSArtigiani(taxableIncome, reduction);
    
    // Commercianti = Artigiani + contributo aggiuntivo 0.48%
    const additionalAmount = taxableIncome * config.additionalRate;
    
    return {
      amount: artigianiResult.amount + additionalAmount,
      details: {
        ...artigianiResult.details,
        additionalAmount,
      },
    };
  }

  private static getReductionFactor(reduction: ContributionReduction): number {
    switch (reduction) {
      case 'REDUCTION_35':
        return 0.65;
      case 'REDUCTION_50':
        return 0.50;
      default:
        return 1;
    }
  }

  /**
   * Calcola le scadenze di pagamento
   */
  static calculatePaymentDeadlines(calculation: TaxCalculationResult, year: number) {
    const taxFirstInstallment = calculation.taxAmount * 0.4; // 40% a giugno
    const taxSecondInstallment = calculation.taxAmount * 0.6; // 60% a novembre
    
    // INPS trimestrale
    const inpsQuarterly = calculation.inpsAmount / 4;
    
    return {
      tax: {
        june: {
          date: `30/06/${year}`,
          amount: taxFirstInstallment * 1.004, // Con interesse 0.4%
        },
        november: {
          date: `30/11/${year}`,
          amount: taxSecondInstallment,
        },
      },
      inps: {
        q1: { date: `16/05/${year}`, amount: inpsQuarterly },
        q2: { date: `20/08/${year}`, amount: inpsQuarterly },
        q3: { date: `16/11/${year}`, amount: inpsQuarterly },
        q4: { date: `16/02/${year + 1}`, amount: inpsQuarterly },
      },
      monthlyProvision: (calculation.totalDue / 12),
    };
  }

  /**
   * Validazione input
   */
  static validateInput(input: Partial<TaxCalculationInput>): string[] {
    const errors: string[] = [];
    
    if (!input.revenue || input.revenue < 0) {
      errors.push('Il fatturato deve essere maggiore di 0');
    }
    
    if (input.revenue && input.revenue > 85000) {
      errors.push('Il regime forfettario è disponibile solo per fatturati fino a €85.000');
    }
    
    if (!input.macroCategory) {
      errors.push('La categoria è obbligatoria');
    }
    
    if (!input.contributionRegime) {
      errors.push('Il regime contributivo è obbligatorio');
    }
    
    return errors;
  }
}

// Funzioni helper per uso rapido
export const calculateTaxes = (input: TaxCalculationInput) => TaxCalculator.calculate(input);
export const validateTaxInput = (input: Partial<TaxCalculationInput>) => TaxCalculator.validateInput(input);

// Export per testing
export { TAX_CONSTANTS as testConstants } from './tax-calculator';