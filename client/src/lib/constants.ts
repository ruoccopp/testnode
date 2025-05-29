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
