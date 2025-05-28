export const INPSQuarterlyDeadlines = {
  2025: [
    { date: '2025-05-16', description: 'Contributi INPS IVS - I Trimestre', type: 'INPS_Q1' },
    { date: '2025-08-20', description: 'Contributi INPS IVS - II Trimestre', type: 'INPS_Q2' },
    { date: '2025-11-16', description: 'Contributi INPS IVS - III Trimestre', type: 'INPS_Q3' },
    { date: '2026-02-16', description: 'Contributi INPS IVS - IV Trimestre 2025', type: 'INPS_Q4' }
  ]
};

export const TaxDeadlines = {
  2025: [
    { date: '2025-06-30', description: 'Saldo 2024 + I Acconto 2025', type: 'TAX_PAYMENT', canDefer: true },
    { date: '2025-07-30', description: 'Saldo 2024 + I Acconto 2025 (differito +0.40%)', type: 'TAX_PAYMENT_DEFERRED' },
    { date: '2025-11-30', description: 'II Acconto 2025 (non rateizzabile)', type: 'TAX_ADVANCE_2' },
    { date: '2025-10-31', description: 'Dichiarazione Redditi 2025 (anno 2024)', type: 'TAX_DECLARATION' }
  ]
};

export function generateTaxDeadlines(
  calculation: TaxCalculationResult, 
  year: number, 
  businessId: number,
  contributionRegime: string
): PaymentDeadline[] {
  const deadlines: PaymentDeadline[] = [];

  // Tax deadlines
  if (calculation.firstAcconto > 0) {
    deadlines.push({
      id: Math.random(),
      businessId,
      dueDate: `${year}-06-30`,
      paymentType: 'TAX_ADVANCE_1',
      amount: calculation.firstAcconto.toString(),
      isPaid: false,
      createdAt: new Date().toISOString()
    });
  }

  if (calculation.secondAcconto > 0) {
    deadlines.push({
      id: Math.random(),
      businessId,
      dueDate: `${year}-11-30`,
      paymentType: 'TAX_ADVANCE_2',
      amount: calculation.secondAcconto.toString(),
      isPaid: false,
      createdAt: new Date().toISOString()
    });
  }

  // INPS quarterly deadlines for Artigiani/Commercianti
  if ((contributionRegime === 'IVS_ARTIGIANI' || contributionRegime === 'IVS_COMMERCIANTI') 
      && calculation.inpsQuarterly && calculation.inpsQuarterly > 0) {

    const quarterlyDeadlines = [
      { date: `${year}-05-16`, type: 'INPS_Q1' },
      { date: `${year}-08-20`, type: 'INPS_Q2' },
      { date: `${year}-11-16`, type: 'INPS_Q3' },
      { date: `${year + 1}-02-16`, type: 'INPS_Q4' }
    ];

    quarterlyDeadlines.forEach(deadline => {
      deadlines.push({
        id: Math.random(),
        businessId,
        dueDate: deadline.date,
        paymentType: deadline.type,
        amount: calculation.inpsQuarterly!.toString(),
        isPaid: false,
        createdAt: new Date().toISOString()
      });
    });
  }

  return deadlines;
}