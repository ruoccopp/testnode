export const TAX_COEFFICIENTS = {
  // 🛒 COMMERCIO (Verde)
  'FOOD_COMMERCE': { 
    value: 0.40, 
    label: 'Alimentari e Ristorazione', 
    sector: 'COMMERCIO',
    color: 'green',
    description: 'Bar, ristoranti, gastronomie, vendita prodotti alimentari',
    examples: 'Bar, ristorante, pizzeria, gastronomia, alimentari, macelleria, panetteria'
  },
  'STREET_COMMERCE': { 
    value: 0.54, 
    label: 'Vendita Ambulante e Mercati', 
    sector: 'COMMERCIO',
    color: 'green',
    description: 'Vendita su aree pubbliche, mercati, fiere',
    examples: 'Commercio ambulante, bancarelle, vendita su mercati, fiere'
  },
  'OTHER_ACTIVITIES': { 
    value: 0.67, 
    label: 'Commercio al Dettaglio', 
    sector: 'COMMERCIO',
    color: 'green',
    description: 'Negozi, commercio al dettaglio, vendita prodotti',
    examples: 'Negozio abbigliamento, ferramenta, libreria, gioielleria, ottica'
  },
  
  // 🤝 SERVIZI (Blu)
  'INTERMEDIARIES': { 
    value: 0.62, 
    label: 'Intermediazione e Agenzie', 
    sector: 'SERVIZI',
    color: 'blue',
    description: 'Intermediazione commerciale, agenzie, rappresentanze',
    examples: 'Agente di commercio, mediatore immobiliare, agenzia viaggi, rappresentante'
  },
  
  // 🎓 PROFESSIONI (Viola)
  'PROFESSIONAL': { 
    value: 0.78, 
    label: 'Attività Professionali e Consulenza', 
    sector: 'PROFESSIONI',
    color: 'purple',
    description: 'Attività intellettuali, consulenze, servizi professionali',
    examples: 'Consulente, avvocato, architetto, ingegnere, commercialista, fisioterapista'
  },
  
  // 🔨 ARTIGIANATO (Arancione)
  'CONSTRUCTION': { 
    value: 0.86, 
    label: 'Costruzioni e Attività Edili', 
    sector: 'ARTIGIANATO',
    color: 'orange',
    description: 'Attività edili, ristrutturazioni, impiantistica',
    examples: 'Muratore, elettricista, idraulico, imbianchino, piastrellista, carpentiere'
  }
} as const;

export const SECTORS = {
  'COMMERCIO': {
    label: 'Commercio',
    icon: '🛒',
    color: 'green',
    description: 'Vendita di beni e prodotti'
  },
  'SERVIZI': {
    label: 'Servizi',
    icon: '🤝',
    color: 'blue',
    description: 'Servizi e intermediazione'
  },
  'PROFESSIONI': {
    label: 'Professioni',
    icon: '🎓',
    color: 'purple',
    description: 'Attività intellettuali e consulenza'
  },
  'ARTIGIANATO': {
    label: 'Artigianato',
    icon: '🔨',
    color: 'orange',
    description: 'Attività manuali e costruzioni'
  }
} as const;

export const CONTRIBUTION_REGIMES = {
  'IVS_ARTIGIANI': 'IVS Artigiani',
  'IVS_COMMERCIANTI': 'IVS Commercianti',
  'GESTIONE_SEPARATA': 'Gestione Separata',
  'CASSA_FORENSE': 'Cassa Forense',
  'INARCASSA': 'INARCASSA'
} as const;

// Costanti aggiornate 2025 dal manuale tecnico-operativo
export const FORFETTARIO_LIMITS_2025 = {
  REVENUE_LIMIT: 85000, // Limite ricavi/compensi €85.000
  REVENUE_EXIT_IMMEDIATE: 100000, // Fuoriuscita immediata €100.000
  EMPLOYEE_COSTS_LIMIT: 20000, // Limite spese personale €20.000
  OTHER_INCOME_LIMIT: 35000 // Limite altri redditi aumentato a €35.000 per il 2025
} as const;

export const CONTRIBUTION_RATES_2025 = {
  GESTIONE_SEPARATA: {
    WITHOUT_OTHER_PENSION: 26.07, // Include 0,72% maternità + 0,35% ISCRO
    WITH_OTHER_PENSION: 24.0,
    PENSIONERS: 24.0,
    MAXIMUM_INCOME: 120607 // Massimale 2025
  },
  CASSA_FORENSE: {
    SUBJECTIVE_RATE: 16.0, // 16% fino a €130.000
    SUBJECTIVE_RATE_EXCESS: 3.0, // 3% sulla parte eccedente €130.000
    INTEGRATIVE_RATE: 4.0,
    MINIMUM_SUBJECTIVE: 2750, // Minimo soggettivo 2025
    MINIMUM_INTEGRATIVE: 350, // Minimo integrativo 2025
    MAXIMUM_INCOME: 130000
  },
  INARCASSA: {
    SUBJECTIVE_RATE: 14.5, // 14,5% fino a €142.650
    INTEGRATIVE_RATE: 4.0,
    MINIMUM_INTEGRATIVE: 815, // Minimo integrativo 2025
    MATERNITY_CONTRIBUTION: 72, // Contributo maternità/paternità
    MAXIMUM_INCOME: 142650
  },
  IVS_ARTIGIANI: {
    MINIMUM_INCOME: 18555, // Reddito minimale 2025
    FIXED_CONTRIBUTION: 4460.64, // Contributi fissi 2025
    RATE_UP_TO_55448: 24.0, // Aliquota fino a €55.448
    RATE_ABOVE_55448: 25.0, // Aliquota oltre €55.448
    INCOME_THRESHOLD: 55448,
    MAXIMUM_INCOME_PRE_1996: 92413,
    MAXIMUM_INCOME_POST_1996: 120607
  },
  IVS_COMMERCIANTI: {
    MINIMUM_INCOME: 18555, // Reddito minimale 2025
    FIXED_CONTRIBUTION: 4549.70, // Contributi fissi 2025
    RATE_UP_TO_55448: 24.48, // Aliquota fino a €55.448
    RATE_ABOVE_55448: 25.48, // Aliquota oltre €55.448
    INCOME_THRESHOLD: 55448,
    MAXIMUM_INCOME_PRE_1996: 92413,
    MAXIMUM_INCOME_POST_1996: 120607
  }
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
  'INPS_Q1': 'Contributi INPS I Trimestre',
  'INPS_Q2': 'Contributi INPS II Trimestre',
  'INPS_Q3': 'Contributi INPS III Trimestre',
  'INPS_Q4': 'Contributi INPS IV Trimestre',
  'INPS_ANNUAL': 'Contributi INPS Annuali'
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
