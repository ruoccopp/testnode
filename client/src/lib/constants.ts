export const TAX_COEFFICIENTS = {
  'FOOD_COMMERCE': { value: 0.40, label: 'Commercio alimentare' },
  'STREET_COMMERCE': { value: 0.54, label: 'Commercio ambulante' },
  'INTERMEDIARIES': { value: 0.62, label: 'Intermediazione' },
  'OTHER_ACTIVITIES': { value: 0.67, label: 'Altre attività' },
  'PROFESSIONAL': { value: 0.78, label: 'Attività professionali' },
  'CONSTRUCTION': { value: 0.86, label: 'Costruzioni' }
} as const;

export const CONTRIBUTION_REGIMES = {
  'IVS_ARTIGIANI': 'IVS Artigiani',
  'IVS_COMMERCIANTI': 'IVS Commercianti',
  'GESTIONE_SEPARATA': 'Gestione Separata'
} as const;

export const CONTRIBUTION_REDUCTIONS = {
  'NONE': 'Nessuna',
  '35': '35%',
  '50': '50%'
} as const;

export const PAYMENT_TYPES = {
  'TAX_BALANCE': 'Saldo IRPEF',
  'TAX_ADVANCE_1': 'Primo Acconto IRPEF',
  'TAX_ADVANCE_2': 'Secondo Acconto IRPEF',
  'INPS_Q1': 'Contributi INPS Q1',
  'INPS_Q2': 'Contributi INPS Q2',
  'INPS_Q3': 'Contributi INPS Q3',
  'INPS_Q4': 'Contributi INPS Q4'
} as const;

export const TAX_CODES = {
  '1792': 'Saldo imposta sostitutiva forfettari',
  '1790': 'Acconto prima rata imposta sostitutiva',
  '1791': 'Acconto seconda rata imposta sostitutiva',
  '1668': 'Interessi pagamento dilazionato imposte erariali',
  '8904': 'Sanzione tributo sostitutivo'
} as const;

export const INPS_CODES = {
  GESTIONE_SEPARATA: {
    'PXX': 'Aliquota piena (senza altra previdenza)',
    'P10': 'Aliquota ridotta (pensionati/altra copertura)',
    'PXXR': 'Rate aliquota piena',
    'P10R': 'Rate aliquota ridotta',
    'DPPI': 'Interessi sui contributi rateizzati'
  },
  IVS_ARTIGIANI: {
    'AF': 'Contributi minimale artigiani',
    'AP': 'Contributi eccedenti artigiani',
    'APR': 'Rate contributi eccedenti artigiani'
  },
  IVS_COMMERCIANTI: {
    'CF': 'Contributi minimale commercianti',
    'CP': 'Contributi eccedenti commercianti',
    'CPR': 'Rate contributi eccedenti commercianti'
  }
} as const;

export const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
] as const;
