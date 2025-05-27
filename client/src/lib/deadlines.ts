
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
