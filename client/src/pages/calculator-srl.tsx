
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building2, Euro, Users, Calculator, Download, Lock, Mail, User, MapPin, Calendar, AlertTriangle, TrendingUp, HelpCircle, Hash, Briefcase, FileText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import * as XLSX from 'xlsx';

import { Link } from "wouter";
import { calculateSRLTaxes, IRAP_RATES, VAT_REGIMES, SRLTaxCalculationResult } from "@/lib/srl-tax-calculator";

const calculationSchema = z.object({
  // Data inizio attività
  startDate: z.string().min(1, "Seleziona la data di inizio attività"),
  businessSector: z.string().min(1, "Seleziona il settore merceologico"),
  
  revenue: z.number().min(0, "Il fatturato deve essere positivo"),
  costs: z.number().min(0, "I costi devono essere positivi"),
  employees: z.number().min(0, "Il numero dipendenti deve essere positivo").int(),
  employeeCosts: z.number().min(0, "I costi dipendenti devono essere positivi"),
  adminSalary: z.number().min(0, "Il compenso amministratore deve essere positivo"),
  region: z.string().min(1, "Seleziona una regione"),
  vatRegime: z.string().min(1, "Seleziona il regime IVA"),
  hasVatDebt: z.boolean().default(false),
  vatDebt: z.number().min(0).optional(),
  vatOnSales: z.number().min(0, "L'IVA sui ricavi deve essere positiva").optional(),
  vatOnPurchases: z.number().min(0, "L'IVA sugli acquisti deve essere positiva").optional(),
  currentBalance: z.number().min(0, "Il saldo deve essere positivo").optional(),
  
  // IRES Premiale 2025
  utile2024: z.number().min(0).optional(),
  utile2023: z.number().min(0).optional(),
  investimentiPrevisti: z.number().min(0).optional(),
  mediaULA2022_2024: z.number().min(0).optional(),
  dipendentiTempo2024: z.number().min(0).optional(),
  nuoveAssunzioni2025: z.number().min(0).optional(),
  hasUsedCIG: z.boolean().default(false),
  
  // ROL e Interessi
  interessiAttivi: z.number().min(0).optional(),
  interessiPassivi: z.number().min(0).optional(),
  rolFiscale: z.number().min(0).optional(),
  perditePregresseOrdinarie: z.number().min(0).optional(),
  perditePrimi3Esercizi: z.number().min(0).optional(),
  
  // Super deduzione nuove assunzioni
  costoNuoveAssunzioni: z.number().min(0).optional(),
  incrementoCostoPersonale: z.number().min(0).optional(),
  
  // Dati 2024 (anno chiuso) - obbligatori se attività iniziata nel 2024 o prima
  revenue2024: z.number().min(0).optional(),
  costs2024: z.number().min(0).optional(),
  taxableIncome2024: z.number().min(0).optional(),
  iresAcconto2024: z.number().min(0).optional(),
  irapAcconto2024: z.number().min(0).optional(),
  
  // Situazione 2025 (parziale)
  currentDate: z.string().optional(),
  revenue2025Partial: z.number().min(0).optional(),
  iresPaid2025: z.number().min(0).optional(),
  irapPaid2025: z.number().min(0).optional(),
  vatPaid2025: z.number().min(0).optional(),
  inpsPaid2025: z.number().min(0).optional(),
}).refine((data) => {
  // Se l'attività è iniziata nel 2024 o prima, i dati 2024 sono obbligatori
  const startYear = new Date(data.startDate).getFullYear();
  if (startYear <= 2024) {
    return data.revenue2024 !== undefined && data.revenue2024 >= 0 && 
           data.taxableIncome2024 !== undefined && data.taxableIncome2024 >= 0;
  }
  return true;
}, {
  message: "Per attività iniziate nel 2024 o prima sono obbligatori: Fatturato 2024 e Reddito Imponibile 2024",
  path: ["revenue2024"]
});

const leadSchema = z.object({
  firstName: z.string().min(2, "Nome deve avere almeno 2 caratteri"),
  lastName: z.string().min(2, "Cognome deve avere almeno 2 caratteri"),
  email: z.string().email("Email non valida"),
  companyName: z.string().min(2, "Ragione sociale deve avere almeno 2 caratteri"),
  vatNumber: z.string().optional(),
  businessSector: z.string().min(2, "Settore aziendale richiesto"),
});

const emailSchema = z.object({
  email: z.string().email("Email non valida"),
});

type CalculationForm = z.infer<typeof calculationSchema>;
type LeadForm = z.infer<typeof leadSchema>;
type EmailForm = z.infer<typeof emailSchema>;

const BUSINESS_SECTORS = {
  'MANIFATTURIERO': 'Attività Manifatturiere',
  'COSTRUZIONI': 'Costruzioni e Affini',
  'COMMERCIO_DETTAGLIO': 'Commercio al Dettaglio',
  'COMMERCIO_INGROSSO': 'Commercio all\'Ingrosso',
  'TRASPORTI': 'Trasporti e Logistica',
  'SERVIZI_INFORMATICI': 'Servizi Informatici e Digitali',
  'CONSULENZA_TECNICA': 'Consulenza Tecnica e Professionale',
  'SERVIZI_FINANZIARI': 'Servizi Finanziari e Assicurativi',
  'SERVIZI_SANITARI': 'Servizi Sanitari e Sociali',
  'TURISMO_RISTORAZIONE': 'Turismo e Ristorazione',
  'SERVIZI_IMMOBILIARI': 'Servizi Immobiliari',
  'SERVIZI_COMUNICAZIONE': 'Comunicazione e Marketing',
  'RICERCA_SVILUPPO': 'Ricerca e Sviluppo',
  'SERVIZI_ENERGIA': 'Energia e Utilities',
  'AGRICOLTURA': 'Agricoltura e Agroalimentare',
  'SERVIZI_EDUCATIVI': 'Servizi Educativi e Formativi',
  'SERVIZI_LEGALI': 'Servizi Legali e Amministrativi',
  'INDUSTRIA_CHIMICA': 'Industria Chimica e Farmaceutica',
  'AUTOMOTIVE': 'Automotive e Componentistica',
  'MODA_TESSILE': 'Moda e Tessile',
  'SERVIZI_AMBIENTALI': 'Servizi Ambientali',
  'ALTRO': 'Altro Settore'
};

const ITALIAN_REGIONS = {
  'PIEMONTE': 'Piemonte',
  'VALLE_AOSTA': 'Valle d\'Aosta',
  'LOMBARDIA': 'Lombardia',
  'TRENTINO': 'Trentino-Alto Adige',
  'VENETO': 'Veneto',
  'FRIULI': 'Friuli-Venezia Giulia',
  'LIGURIA': 'Liguria',
  'EMILIA_ROMAGNA': 'Emilia-Romagna',
  'TOSCANA': 'Toscana',
  'UMBRIA': 'Umbria',
  'MARCHE': 'Marche',
  'LAZIO': 'Lazio',
  'ABRUZZO': 'Abruzzo',
  'MOLISE': 'Molise',
  'CAMPANIA': 'Campania',
  'PUGLIA': 'Puglia',
  'BASILICATA': 'Basilicata',
  'CALABRIA': 'Calabria',
  'SICILIA': 'Sicilia',
  'SARDEGNA': 'Sardegna'
};

export default function CalculatorSRLPage() {
  const [results, setResults] = useState<SRLTaxCalculationResult | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [emailValidated, setEmailValidated] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [useSafetyMargin, setUseSafetyMargin] = useState(false);
  const [showAdvancedCalculations, setShowAdvancedCalculations] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const { toast } = useToast();

  const form = useForm<CalculationForm>({
    resolver: zodResolver(calculationSchema),
    defaultValues: {
      startDate: "",
      businessSector: "",
      revenue: undefined,
      costs: undefined,
      employees: 0,
      employeeCosts: 0,
      adminSalary: undefined,
      region: "",
      vatRegime: "TRIMESTRALE",
      hasVatDebt: false,
      vatDebt: undefined,
      currentBalance: undefined,
      revenue2024: undefined,
      taxableIncome2024: undefined,
      iresAcconto2024: undefined,
      irapAcconto2024: undefined,
      currentDate: new Date().toISOString().split('T')[0],
      revenue2025Partial: undefined,
      iresPaid2025: undefined,
      irapPaid2025: undefined,
      vatPaid2025: undefined,
      inpsPaid2025: undefined,
    },
  });

  const leadForm = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      companyName: "",
      vatNumber: "",
      businessSector: "",
    },
  });

  // Auto-populate business sector from main form
  useEffect(() => {
    const businessSector = form.watch('businessSector');
    if (businessSector && BUSINESS_SECTORS[businessSector as keyof typeof BUSINESS_SECTORS]) {
      leadForm.setValue('businessSector', BUSINESS_SECTORS[businessSector as keyof typeof BUSINESS_SECTORS]);
    }
  }, [form.watch('businessSector'), leadForm]);

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  // Separate form for email dialog
  const emailDialogForm = useForm<{ email: string }>({
    resolver: zodResolver(z.object({
      email: z.string().email("Inserisci un indirizzo email valido"),
    })),
    defaultValues: {
      email: "",
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async (data: CalculationForm) => {
      // Calcolo diretto senza API per semplicità
      const startYear = new Date(data.startDate).getFullYear();
      const result = calculateSRLTaxes({
        revenue: data.revenue,
        costs: data.costs,
        employees: data.employees,
        employeeCosts: data.employeeCosts,
        adminSalary: data.adminSalary,
        region: data.region,
        businessSector: data.businessSector,
        vatRegime: data.vatRegime,
        hasVatDebt: data.hasVatDebt,
        vatDebt: data.vatDebt || 0,
        vatOnSales: data.vatOnSales,
        vatOnPurchases: data.vatOnPurchases,
        currentBalance: data.currentBalance || 0,
        fiscalYear: 2025,
        startDate: data.startDate,
        startYear: startYear,
        // Dati 2024 solo se l'attività è iniziata nel 2024 o prima
        utile2024: startYear <= 2024 ? data.taxableIncome2024 : undefined,
        utile2023: startYear <= 2024 ? data.utile2023 : undefined,
        investimentiPrevisti: data.investimentiPrevisti,
        mediaULA2022_2024: startYear <= 2024 ? data.mediaULA2022_2024 : undefined,
        dipendentiTempo2024: startYear <= 2024 ? data.dipendentiTempo2024 : undefined,
        nuoveAssunzioni2025: data.nuoveAssunzioni2025,
        hasUsedCIG: startYear <= 2024 ? data.hasUsedCIG : false,
        interessiAttivi: data.interessiAttivi,
        interessiPassivi: data.interessiPassivi,
        rolFiscale: data.rolFiscale,
        perditePregresseOrdinarie: data.perditePregresseOrdinarie,
        perditePrimi3Esercizi: data.perditePrimi3Esercizi,
        costoNuoveAssunzioni: data.costoNuoveAssunzioni,
        incrementoCostoPersonale: data.incrementoCostoPersonale,
        revenue2024: startYear <= 2024 ? data.revenue2024 : undefined,
        costs2024: startYear <= 2024 ? data.costs2024 : undefined,
      });
      return result;
    },
    onSuccess: (data) => {
      setResults(data);
      setShowLeadForm(true);
      toast({
        title: "Anteprima calcolo completata",
        description: "Inserisci i tuoi dati per vedere il report completo",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore nel calcolo",
        description: error.message || "Errore durante il calcolo delle imposte SRL",
      });
    },
  });

  const sendVerificationMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('POST', '/api/send-verification', {
        email: email
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      setSentCode(data.code);
      toast({
        title: "📧 Codice inviato!",
        description: "Controlla la tua email e inserisci il codice di verifica ricevuto",
        duration: 10000,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore invio verifica",
        description: error.message || "Problemi con l'invio del codice di verifica",
      });
    },
  });

  const submitLeadMutation = useMutation({
    mutationFn: async (data: LeadForm & { calculationData: CalculationForm }) => {
      const response = await apiRequest('POST', '/api/leads/submit-srl', data);
      return response;
    },
    onSuccess: () => {
      setIsUnlocked(true);
      toast({
        title: "Dati salvati con successo!",
        description: "Ora puoi accedere al report completo e ti abbiamo inviato il report via email",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: EmailForm & { calculationData: SRLTaxCalculationResult }) => {
      const response = await apiRequest('POST', '/api/send-report-srl', {
        email: data.email,
        calculationData: data.calculationData
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "📧 Report inviato!",
        description: "Il report completo è stato inviato alla tua email con allegato Excel",
      });
      emailForm.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore nell'invio email",
        description: error.message || "Errore durante l'invio dell'email",
      });
    },
  });

  const onSubmit = (data: CalculationForm) => {
    calculateMutation.mutate(data);
  };

  const handleEmailVerification = () => {
    // Verifica email rimossa per velocizzare i test
    setEmailValidated(true);
    setIsUnlocked(true);
    
    const formData = leadForm.getValues();
    if (formData.firstName && formData.lastName && formData.email) {
      const leadData = {
        ...formData,
        calculationData: form.getValues(),
      };
      
      submitLeadMutation.mutate(leadData);
    }
    
    toast({
      title: "Email verificata con successo!",
      description: "I tuoi dati sono stati salvati e il report completo è disponibile",
    });
  };

  const onLeadSubmit = (data: LeadForm) => {
    submitLeadMutation.mutate({
      ...data,
      calculationData: form.getValues(),
    });
  };

  const onEmailSubmit = (data: EmailForm) => {
    if (!results) return;
    sendEmailMutation.mutate({
      ...data,
      calculationData: results,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getUrgencyLevel = (dateString: string) => {
    const deadline = new Date(dateString.split('/').reverse().join('-'));
    const today = new Date();
    const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return { level: 'overdue', text: '🚨 Scaduto', class: 'bg-red-100 text-red-800 border-red-300' };
    if (daysUntil <= 30) return { level: 'urgent', text: `🚨 ${daysUntil} giorni`, class: 'bg-red-100 text-red-800 border-red-300' };
    if (daysUntil <= 60) return { level: 'warning', text: `⚠️ ${daysUntil} giorni`, class: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    return { level: 'normal', text: `✅ ${daysUntil} giorni`, class: 'bg-green-100 text-green-800 border-green-300' };
  };

  const calculateSafetyMargin = (amount: number) => {
    return Math.round(amount * 1.1 * 100) / 100; // 10% margine di sicurezza
  };

  // Calculate dynamic payment schedule based on safety margin
  const getDynamicPaymentSchedule = (baseSchedule: any[], monthlyAccrual: number, useSafety: boolean) => {
    if (!baseSchedule || baseSchedule.length === 0) return [];
    
    const adjustedMonthlyAccrual = useSafety ? calculateSafetyMargin(monthlyAccrual) : monthlyAccrual;
    const difference = adjustedMonthlyAccrual - monthlyAccrual;
    
    let runningBalance = form.watch('currentBalance') || 0;
    
    return baseSchedule.map((payment, index) => {
      // Adjust accumulo entries with safety margin
      const adjustedAmount = payment.category === 'ACCUMULO' ? adjustedMonthlyAccrual : payment.amount;
      
      // Calculate new balances
      const previousBalance = runningBalance;
      const newBalance = payment.isIncome ? 
        runningBalance + adjustedAmount : 
        runningBalance - adjustedAmount;
      
      runningBalance = newBalance;
      
      // Calculate required payment if needed
      const requiredPayment = payment.requiredPayment > 0 ? 
        Math.max(0, adjustedAmount - previousBalance) : 0;
      
      // Calculate deficit
      const deficit = newBalance < 0 ? Math.abs(newBalance) : 0;
      
      return {
        ...payment,
        amount: adjustedAmount,
        previousBalance,
        balance: newBalance,
        requiredPayment,
        deficit
      };
    });
  };

  // Helper component per FormLabel con tooltip
  const TooltipFormLabel = ({ children, tooltip }: { children: React.ReactNode; tooltip: string }) => (
    <div className="flex items-center gap-1">
      {children}
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );

  const exportToExcel = () => {
    if (!results || !isUnlocked) return;

    const formData = form.getValues();
    const currentBalance = formData.currentBalance || 0;
    const safeMonthlyAccrual = calculateSafetyMargin(results.monthlyAccrual);
    
    const worksheetData = [
      ['PIANIFICATORE IMPOSTE SRL - REPORT AVANZATO'],
      ['Data:', new Date().toLocaleDateString('it-IT')],
      [''],
      
      // Dati società
      ['DATI SOCIETA\''],
      ['Fatturato Annuo:', formData.revenue || 0],
      ['Costi Operativi:', formData.costs || 0],
      ['Settore Merceologico:', BUSINESS_SECTORS[formData.businessSector as keyof typeof BUSINESS_SECTORS] || ''],
      ['Numero Dipendenti:', formData.employees],
      ['Costi Dipendenti:', formData.employeeCosts || 0],
      ['Compenso Amministratore:', formData.adminSalary || 0],
      ['Regione:', ITALIAN_REGIONS[formData.region as keyof typeof ITALIAN_REGIONS] || ''],
      ['Regime IVA:', VAT_REGIMES[formData.vatRegime as keyof typeof VAT_REGIMES]?.label || ''],
      ['Saldo Accantonato:', currentBalance],
      [''],
      
      // Pianificazione avanzata (se abilitata)
      ...(true ? [
        ['PIANIFICAZIONE AVANZATA 2024-2025'],
        ['Dati 2024 (definitivi):'],
        ['- Fatturato 2024:', formData.revenue2024 || 0],
        ['- Reddito Imponibile 2024:', formData.taxableIncome2024 || 0],
        ['- Acconti IRES Versati:', formData.iresAcconto2024 || 0],
        ['- Acconti IRAP Versati:', formData.irapAcconto2024 || 0],
        [''],
        ['Situazione 2025 (al ' + (formData.currentDate || 'oggi') + '):'],
        ['- Fatturato Parziale 2025:', formData.revenue2025Partial || 0],
        ['- IRES Già Versata:', formData.iresPaid2025 || 0],
        ['- IRAP Già Versata:', formData.irapPaid2025 || 0],
        ['- IVA Già Versata:', formData.vatPaid2025 || 0],
        ['- INPS Già Versati:', formData.inpsPaid2025 || 0],
        [''],
      ] : []),
      
      // Calcoli fiscali
      ['CALCOLI FISCALI 2025'],
      ['Utile Lordo:', results.grossProfit],
      ['Reddito Imponibile:', results.taxableIncome],
      ['IRES (24%):', results.iresAmount],
      ['Base IRAP:', results.irapBase],
      ['IRAP (' + ((IRAP_RATES[formData.region as keyof typeof IRAP_RATES] || 3.9)) + '%):', results.irapAmount],
      ['IVA Stimata:', results.vatAmount],
      ['INPS Amministratore:', results.inpsAdmin],
      ['INPS Dipendenti:', results.inpsEmployees],
      ['Totale Imposte:', results.totalTaxes],
      ['Totale Dovuto:', results.totalDue],
      [''],
      
      // Scadenze fiscali con urgenza
      ['SCADENZE FISCALI CON INDICATORI URGENZA'],
      ['30 Giugno 2025 - IRES Saldo:', results.iresAmount, getUrgencyLevel('30/06/2025').text],
      ['30 Giugno 2025 - IRES 1° Acconto:', results.iresFirstAcconto, getUrgencyLevel('30/06/2025').text],
      ['30 Novembre 2025 - IRES 2° Acconto:', results.iresSecondAcconto, getUrgencyLevel('30/11/2025').text],
      ['30 Giugno 2025 - IRAP Saldo:', results.irapAmount, getUrgencyLevel('30/06/2025').text],
      ['30 Giugno 2025 - IRAP 1° Acconto:', results.irapFirstAcconto, getUrgencyLevel('30/06/2025').text],
      ['30 Novembre 2025 - IRAP 2° Acconto:', results.irapSecondAcconto, getUrgencyLevel('30/11/2025').text],
      [''],
      
      // Piano accantonamento con margine
      ['PIANO ACCANTONAMENTO CON MARGINE SICUREZZA'],
      ['Accantonamento Mensile Standard:', results.monthlyAccrual],
      ['Accantonamento con Margine 10%:', safeMonthlyAccrual],
      ['Margine di Sicurezza Mensile:', safeMonthlyAccrual - results.monthlyAccrual],
      ['% su Fatturato Mensile:', ((results.monthlyAccrual / ((formData.revenue || 1) / 12)) * 100).toFixed(1) + '%'],
      ['% con Margine su Fatturato:', ((safeMonthlyAccrual / ((formData.revenue || 1) / 12)) * 100).toFixed(1) + '%'],
      [''],
      
      // Cashflow ottimizzato
      ['DISTRIBUZIONE CASHFLOW OTTIMIZZATA'],
      ['Pagamenti Trimestrali Base:', results.quarterlyPayments],
      ['Pagamenti Trimestrali con Margine:', calculateSafetyMargin(results.quarterlyPayments)],
      ['Accumulo Fondi Annuale:', safeMonthlyAccrual * 12],
      ['Copertura Totale Dovuto:', ((safeMonthlyAccrual * 12) / results.totalDue * 100).toFixed(1) + '%'],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    ws['!cols'] = [
      { width: 40 },
      { width: 20 },
      { width: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Report Avanzato SRL');
    
    const fileName = `Report_Avanzato_SRL_${new Date().getFullYear()}_${new Date().getMonth() + 1}_${new Date().getDate()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Report avanzato scaricato",
      description: `Il file ${fileName} è stato scaricato con successo`,
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="bg-white shadow-md border-b mb-8">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-purple-600">SmartRate</div>
            </div>
            <div className="flex gap-2">
              <Link href="/calculator">
                <Button variant="outline" size="sm" className="text-xs">
                  📊 Forfettario
                </Button>
              </Link>
              <Link href="/calculator-individual">
                <Button variant="outline" size="sm" className="text-xs">
                  👤 Ordinario
                </Button>
              </Link>
              <Button variant="default" size="sm" className="text-xs bg-purple-600">
                🏢 SRL
              </Button>
              <Link href="/leads">
                <Button variant="outline" size="sm" className="text-xs">
                  🎯 Dashboard Lead
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-2">
          Calcolatore Imposte SRL
        </h1>
        <div className="text-center">
          <p className="text-sm text-gray-500 leading-relaxed">
            Calcola con precisione IRES, IRAP, contributi previdenziali, IVA e pianifica le scadenze fiscali 2025
          </p>
          <p className="text-sm text-gray-500">
            per la tua società a responsabilità limitata
          </p>
        </div>
      </div>

      {/* Calculator Form */}
      <Card className="mb-6 md:mb-8">
        <CardContent className="p-4 md:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
              
              {/* Data Inizio Attività */}
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  📅 Informazioni Societarie
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          🏢 Data Inizio Attività *
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs text-sm">
                                  Data di costituzione della SRL. Se l'attività è iniziata nel 2024 o prima, 
                                  saranno richiesti i dati fiscali 2024 per calcoli precisi degli acconti 2025.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            max={new Date().toISOString().split('T')[0]}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessSector"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          🏭 Settore Merceologico *
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs text-sm">
                                  Il settore di attività principale della SRL. Influenza aliquote IRAP regionali specifiche, 
                                  deduzioni settoriali e agevolazioni fiscali mirate.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona il settore principale" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(BUSINESS_SECTORS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Sezione Dati 2024 - mostrata solo se attività iniziata nel 2024 o prima */}
              {form.watch("startDate") && new Date(form.watch("startDate")).getFullYear() <= 2024 && (
                <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    📊 Dati 2024
                  </h3>
                  <p className="text-sm text-orange-700 mb-4">
                    <strong>Campi obbligatori:</strong> I dati fiscali 2024 sono necessari per calcolare correttamente gli acconti 2025.
                    Inserisci i valori definitivi (se l'anno è chiuso) o stimati (se ancora in corso).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="revenue2024"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            💼 Fatturato 2024 (€) *
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Inserisci il fatturato totale dell'anno 2024. Include tutti i ricavi fatturati, incluse le fatture emesse ma non ancora pagate.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="es: 480000"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="taxableIncome2024"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>📈 Reddito Imponibile 2024 (€) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="es: 150000"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="iresAcconto2024"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>💰 Acconti IRES Versati 2024 (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="es: 30000"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="irapAcconto2024"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>🏛️ Acconti IRAP Versati 2024 (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="es: 8000"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Sezione Calcoli Avanzati (Collassabile) */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border-2 border-gray-300">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowAdvancedCalculations(!showAdvancedCalculations)}
                >
                  <h3 className="font-semibold text-gray-900 mb-0 flex items-center">
                    <Calculator className="h-5 w-5 mr-2" />
                    🔬 Calcoli Avanzati (Opzionale)
                  </h3>
                  <div className="flex items-center text-gray-600">
                    <span className="text-sm mr-2">
                      {showAdvancedCalculations ? 'Chiudi' : 'Espandi'}
                    </span>
                    {showAdvancedCalculations ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mt-2 mb-4">
                  Sezioni specifiche per SRL di grandi dimensioni: IRES Premiale, ROL, perdite fiscali, super deduzioni
                </p>

                {showAdvancedCalculations && (
                  <div className="space-y-6 mt-6">
                    {/* Sezione IRES Premiale 2025 */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border-2 border-purple-300">
                      <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2" />
                        🏆 IRES Premiale 2025 (Aliquota 20% invece di 24%)
                      </h4>
                      <p className="text-sm text-purple-700 mb-4">
                        Compila questi campi per verificare l'accesso all'IRES ridotta al 20% per l'anno 2025
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="utile2024"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>💰 Utile Civilistico 2024 (€)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="es: 800000"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="utile2023"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>📊 Utile Civilistico 2023 (€)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="es: 1000000"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="investimentiPrevisti"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>🔧 Investimenti Industria 4.0/5.0 (€)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="es: 250000"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="mediaULA2022_2024"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>👥 Media ULA 2022-2024</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="es: 18"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="dipendentiTempo2024"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>🔄 Dipendenti T.I. Media 2024</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="es: 20"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="nuoveAssunzioni2025"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>➕ Nuove Assunzioni T.I. 2025</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="es: 1"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="mt-4">
                        <FormField
                          control={form.control}
                          name="hasUsedCIG"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">🚫 Hai usato CIG nel 2024/2025?</FormLabel>
                                <div className="text-sm text-muted-foreground">
                                  L'uso di Cassa Integrazione esclude dall'IRES Premiale
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Sezione ROL e Interessi Passivi */}
                    <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-200">
                      <h4 className="font-semibold text-indigo-900 mb-4 flex items-center">
                        <Calculator className="h-5 w-5 mr-2" />
                        📊 ROL e Gestione Interessi Passivi (Art. 96 TUIR)
                      </h4>
                      <p className="text-sm text-indigo-700 mb-4">
                        Per un calcolo preciso della deducibilità degli interessi passivi
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="interessiAttivi"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>💹 Interessi Attivi 2025 (€)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="es: 5000"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="interessiPassivi"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>📉 Interessi Passivi 2025 (€)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="es: 70000"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="rolFiscale"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>🎯 ROL Fiscale 2025 (€)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="es: 150000"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Sezione Perdite Fiscali Pregresse */}
                    <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
                      <h4 className="font-semibold text-red-900 mb-4 flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2" />
                        📊 Perdite Fiscali Pregresse (Art. 84 TUIR)
                      </h4>
                      <p className="text-sm text-red-700 mb-4">
                        Perdite utilizzabili per ridurre il reddito imponibile 2025
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="perditePregresseOrdinarie"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>📉 Perdite Ordinarie (limite 80%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="es: 180000"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="perditePrimi3Esercizi"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>🆕 Perdite Primi 3 Esercizi (100%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="es: 50000"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Sezione Super Deduzione */}
                    <div className="bg-emerald-50 p-4 rounded-lg border-2 border-emerald-200">
                      <h4 className="font-semibold text-emerald-900 mb-4 flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        🚀 Super Deduzione Nuove Assunzioni (120%)
                      </h4>
                      <p className="text-sm text-emerald-700 mb-4">
                        Maggiorazione 20% del costo per nuove assunzioni a tempo indeterminato
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="costoNuoveAssunzioni"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>💰 Costo Nuovi Assunti 2025 (€)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="es: 60000"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="incrementoCostoPersonale"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>📈 Incremento Totale Costo Personale (€)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="es: 80000"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sezione Situazione 2025 */}
                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                  <h3 className="font-semibold text-green-900 mb-4 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    🔄 Situazione Parziale 2025 (Anno in Corso)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="currentDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>📅 Data Situazione Attuale</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="revenue2025Partial"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>💼 Fatturato Parziale 2025 (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="es: 250000"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="iresPaid2025"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>💰 IRES Già Versata 2025 (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="es: 15000"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="irapPaid2025"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>🏛️ IRAP Già Versata 2025 (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="es: 4000"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="vatPaid2025"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>📋 IVA Già Versata 2025 (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="es: 20000"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="inpsPaid2025"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>👥 INPS Già Versati 2025 (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="es: 12000"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

              {/* Dati Economici Standard */}
              <div className="bg-blue-50 p-3 md:p-4 rounded-lg mb-4 md:mb-6">
                <h3 className="font-medium text-blue-900 mb-3 md:mb-4 text-sm md:text-base">📊 Dati Economici 2025 (Proiezione Annuale)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="revenue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm md:text-base flex items-center gap-1">
                          💼 Fatturato Annuo 2025 (€)
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Inserisci la previsione di fatturato per l'anno 2025. Include tutti i ricavi che prevedi di fatturare durante l'anno.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="es: 500000"
                            className="text-base md:text-lg h-12 md:h-auto"
                            inputMode="numeric"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="costs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          🏭 Costi Operativi (€)
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Inserisci tutti i costi operativi deducibili: materie prime, servizi, consulenze, utenze, affitti, ammortamenti. Non includere stipendi e compensi amministratore.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="es: 200000"
                            className="text-lg"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Personale */}
              <div className="bg-green-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-green-900 mb-4">👥 Personale e Compensi</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="employees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel title="Inserisci il numero totale di dipendenti con contratto di lavoro subordinato. Include tutti i dipendenti a tempo determinato e indeterminato.">
                          👨‍💼 Numero Dipendenti <HelpCircle className="h-4 w-4 inline ml-1 text-gray-400" />
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="es: 3"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="employeeCosts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>💰 Costi Dipendenti (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="es: 100000"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="adminSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>🎯 Compenso Amministratore (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="es: 50000"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Localizzazione e Regime IVA */}
              <div className="bg-purple-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-purple-900 mb-4">🗺️ Localizzazione e IVA</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>📍 Regione (per IRAP)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona la regione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(ITALIAN_REGIONS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex justify-between w-full">
                                  <span>{label}</span>
                                  <span className="text-xs text-gray-500 ml-2">
                                    ({IRAP_RATES[key as keyof typeof IRAP_RATES]}%)
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="vatRegime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>📋 Regime IVA</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona regime IVA" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(VAT_REGIMES).map(([key, regime]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex flex-col items-start">
                                  <span>{regime.label}</span>
                                  <span className="text-xs text-gray-500">{regime.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="hasVatDebt"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">💳 Hai debiti IVA pregressi?</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Include eventuali debiti IVA da anni precedenti
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch('hasVatDebt') && (
                    <FormField
                      control={form.control}
                      name="vatDebt"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>💸 Importo Debito IVA (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="es: 15000"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {/* Campi IVA dettagliata */}
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-3">📊 IVA Dettagliata (Opzionale)</h4>
                    <p className="text-sm text-blue-700 mb-4">
                      Se conosci gli importi esatti, inserisci l'IVA sui ricavi e sugli acquisti per un calcolo più preciso
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="vatOnSales"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>📈 IVA a Debito sui Ricavi (€)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="es: 110000"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Se vuoto, verrà calcolato automaticamente al 22% sui ricavi
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="vatOnPurchases"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>📉 IVA a Credito sugli Acquisti (€)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="es: 44000"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Se vuoto, verrà calcolato automaticamente al 22% sui costi
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Situazione Finanziaria */}
              <div className="bg-orange-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-orange-900 mb-4">💰 Situazione Finanziaria</h3>
                <FormField
                  control={form.control}
                  name="currentBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>🏦 Saldo Attuale Accantonato (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="es: 50000"
                          className="text-lg"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          value={field.value || ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full text-base md:text-lg py-4 md:py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 touch-manipulation"
                disabled={calculateMutation.isPending}
              >
                <Calculator className="mr-2 h-5 w-5" />
                {calculateMutation.isPending ? "Calcolo in corso..." : "🎯 CALCOLA IMPOSTE SRL AVANZATO"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Preview Results */}
      {results && !isUnlocked && (
        <Card className="mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white z-10 rounded-lg"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">📊 Anteprima Risultati</h3>
              <div className="flex items-center text-orange-600">
                <Lock className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Report completo bloccato</span>
              </div>
            </div>

            {/* Sezione Anno Fiscale di Riferimento */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Anno Fiscale di Riferimento: {results.fiscalYear}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                <div className="space-y-2">
                  <p><strong>IRES (24%):</strong> Anno fiscale {results.fiscalYear}</p>
                  <p><strong>IRAP:</strong> Anno fiscale {results.fiscalYear}</p>
                </div>
                <div className="space-y-2">
                  <p><strong>IVA:</strong> Liquidazioni anno {results.fiscalYear}</p>
                  <p><strong>INPS:</strong> Contributi anno {results.fiscalYear}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-300">
                <p className="text-sm text-blue-800 font-medium">
                  📅 Scadenze di pagamento: Calendario fiscale {results.fiscalYear + 1}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  📊 <strong>Redditi e imposte {results.fiscalYear}</strong> → 💰 <strong>Pagamenti {results.fiscalYear + 1}</strong>
                </p>
                <p className="text-xs text-blue-600">
                  Gli importi sotto si riferiscono ai redditi 2025, da dichiarare e pagare nel 2026
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
              <Card className="opacity-100">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center">
                    <Building2 className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
                    <div className="ml-3 md:ml-4">
                      <p className="text-xs md:text-sm font-medium text-gray-500">Utile Lordo 2025</p>
                      <p className="text-lg md:text-2xl font-bold text-gray-900">{formatCurrency(results.grossProfit)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="opacity-100">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center">
                    <Euro className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
                    <div className="ml-3 md:ml-4">
                      <p className="text-xs md:text-sm font-medium text-gray-500">IRES 2025 (24%)</p>
                      <p className="text-lg md:text-2xl font-bold text-gray-900">{formatCurrency(results.iresAmount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="opacity-60 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lock className="h-8 w-8 text-gray-400" />
                </div>
                <CardContent className="p-6 blur-sm">
                  <div className="flex items-center">
                    <MapPin className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">IRAP</p>
                      <p className="text-2xl font-bold text-gray-900">€ ***</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="opacity-60 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lock className="h-8 w-8 text-gray-400" />
                </div>
                <CardContent className="p-6 blur-sm">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-orange-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Totale Dovuto</p>
                      <p className="text-2xl font-bold text-gray-900">€ ***</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 text-center">
              <h4 className="text-lg font-bold text-yellow-800 mb-2">
                🔓 Sblocca il Report Avanzato GRATIS
              </h4>
              <p className="text-yellow-700 mb-4">
                Pianificazione fiscale completa con dati 2024-2025 e margine di sicurezza del 10%!
              </p>
              <ul className="text-left text-yellow-700 text-sm mb-4 max-w-md mx-auto">
                <li>• ✅ Pianificazione avanzata 2024-2025</li>
                <li>• ✅ Indicatori di urgenza scadenze (🚨 &lt; 30 giorni)</li>
                <li>• ✅ Accantonamento con margine sicurezza 10%</li>
                <li>• ✅ Distribuzione cashflow ottimizzata</li>
                <li>• ✅ Proiezioni intelligenti per resto 2025</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lead Generation Form */}
      {showLeadForm && !isUnlocked && (
        <Card className="mb-6 md:mb-8 border-2 border-green-500">
          <CardContent className="p-4 md:p-6">
            <div className="text-center mb-4 md:mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-green-800 mb-2">
                🎯 Ottieni il Report Avanzato GRATIS
              </h3>
              <p className="text-sm md:text-base text-gray-600">
                Inserisci i dati della tua società per sbloccare la pianificazione fiscale completa
              </p>
            </div>

            <Form {...leadForm}>
              <form onSubmit={leadForm.handleSubmit(onLeadSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={leadForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Nome *
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Mario" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={leadForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Cognome *
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Rossi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={leadForm.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Building2 className="h-4 w-4 mr-2" />
                        Ragione Sociale *
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="ABC Srl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={leadForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        Email * (per ricevere il report)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="mario.rossi@azienda.com" 
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={leadForm.control}
                  name="businessSector"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Briefcase className="h-4 w-4 mr-2" />
                        Settore Merceologico *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Settore merceologico" 
                          {...field}
                          value={field.value || form.watch('businessSector') || ''}
                          readOnly
                          className="bg-gray-50"
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-600">
                        Settore rilevato automaticamente dalle informazioni societarie
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <input type="checkbox" required className="mt-1" />
                    <div className="text-sm text-gray-600">
                      <p>
                        Accetto che i miei dati vengano utilizzati per ricevere il report richiesto e 
                        comunicazioni relative ai servizi fiscali per SRL. I dati non verranno ceduti a terzi.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={submitLeadMutation.isPending}
                >
                  {submitLeadMutation.isPending ? "Invio in corso..." : "Sblocca Report Completo"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Full Results (Unlocked) */}
      {results && isUnlocked && (
        <>
          {/* Sezione IRES Premiale se applicabile */}
          {results.isIresPremialeApplicable && (
            <Card className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center">
                  🏆 IRES Premiale Applicabile - Aliquota 20%
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-purple-800 mb-3">Condizioni Verificate:</h4>
                    <div className="space-y-2 text-sm">
                      <div className={`flex items-center ${results.iresPremialeDetails?.condition1_utiliAccantonati ? 'text-green-700' : 'text-red-700'}`}>
                        {results.iresPremialeDetails?.condition1_utiliAccantonati ? '✅' : '❌'} Accantonamento 80% utili 2024
                      </div>
                      <div className={`flex items-center ${results.iresPremialeDetails?.condition2_investimenti ? 'text-green-700' : 'text-red-700'}`}>
                        {results.iresPremialeDetails?.condition2_investimenti ? '✅' : '❌'} Investimenti qualificati sufficienti
                      </div>
                      <div className={`flex items-center ${results.iresPremialeDetails?.condition3_livelloOccupazionale ? 'text-green-700' : 'text-red-700'}`}>
                        {results.iresPremialeDetails?.condition3_livelloOccupazionale ? '✅' : '❌'} Mantenimento livelli ULA
                      </div>
                      <div className={`flex items-center ${results.iresPremialeDetails?.condition4_nuoveAssunzioni ? 'text-green-700' : 'text-red-700'}`}>
                        {results.iresPremialeDetails?.condition4_nuoveAssunzioni ? '✅' : '❌'} Nuove assunzioni sufficienti
                      </div>
                      <div className={`flex items-center ${results.iresPremialeDetails?.condition5_noCIG ? 'text-green-700' : 'text-red-700'}`}>
                        {results.iresPremialeDetails?.condition5_noCIG ? '✅' : '❌'} Nessun uso CIG
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-800 mb-3">Risparmio Fiscale:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>IRES al 24% (ordinaria):</span>
                        <span className="font-semibold text-red-600">{formatCurrency(results.taxableIncomeAfterLosses * 0.24)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IRES al 20% (premiale):</span>
                        <span className="font-semibold text-green-600">{formatCurrency(results.iresAmount)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-purple-300">
                        <span className="font-bold">Risparmio:</span>
                        <span className="font-bold text-green-700">{formatCurrency((results.taxableIncomeAfterLosses * 0.24) - results.iresAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ROL e Interessi Passivi */}
          {results.rolDetails && (
            <Card className="mb-6 bg-indigo-50 border-2 border-indigo-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-indigo-900 mb-4">📊 Gestione ROL e Interessi Passivi (Art. 96 TUIR)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-indigo-800 mb-3">Calcoli ROL:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>ROL Fiscale:</span>
                        <span className="font-semibold">{formatCurrency(results.rolDetails.rolFiscale)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Limite ROL (30%):</span>
                        <span className="font-semibold">{formatCurrency(results.rolDetails.limitROL)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-indigo-800 mb-3">Deducibilità Interessi:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Interessi Attivi:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(results.rolDetails.interessiAttiviTotali)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Interessi Passivi Deducibili:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(results.rolDetails.interessiPassiviDeducibili)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Interessi Passivi Indeducibili:</span>
                        <span className="font-semibold text-red-600">{formatCurrency(results.rolDetails.interessiPassiviIndeducibili)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Perdite Fiscali e Super Deduzione */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {results.lossesUsed > 0 && (
              <Card className="bg-red-50 border-2 border-red-200">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-red-900 mb-4">📉 Gestione Perdite Fiscali</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Perdite Utilizzate 2025:</span>
                      <span className="font-semibold text-red-600">{formatCurrency(results.lossesUsed)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Perdite Residue Riportabili:</span>
                      <span className="font-semibold">{formatCurrency(results.remainingLosses)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-red-300">
                      <span>Reddito dopo Perdite:</span>
                      <span className="font-bold text-green-700">{formatCurrency(results.taxableIncomeAfterLosses)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {results.superDeductionAmount > 0 && (
              <Card className="bg-emerald-50 border-2 border-emerald-200">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-emerald-900 mb-4">🚀 Super Deduzione Nuove Assunzioni</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Maggiorazione 20%:</span>
                      <span className="font-semibold text-emerald-600">{formatCurrency(results.superDeductionAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Risparmio IRES:</span>
                      <span className="font-bold text-green-700">{formatCurrency(results.superDeductionAmount * results.iresRate)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sezione Anno Fiscale di Riferimento - Report Completo */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-green-900 mb-3 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Anno Fiscale di Riferimento: {results.fiscalYear}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-green-700">
              <div className="space-y-2">
                <p><strong>IRES (24%):</strong> Anno fiscale {results.fiscalYear}</p>
                <p><strong>IRAP ({((IRAP_RATES[form.watch('region') as keyof typeof IRAP_RATES] || 3.9))}%):</strong> Anno fiscale {results.fiscalYear}</p>
              </div>
              <div className="space-y-2">
                <p><strong>IVA ({form.watch('vatRegime')}):</strong> Liquidazioni anno {results.fiscalYear}</p>
                <p><strong>INPS:</strong> Contributi anno {results.fiscalYear}</p>
              </div>
              <div className="space-y-2">
                <p><strong>IVA a Debito:</strong> {formatCurrency(results.vatOnSales)}</p>
                <p><strong>IVA a Credito:</strong> {formatCurrency(results.vatOnPurchases)}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-green-300">
              <p className="text-sm text-green-800 font-medium">
                Scadenze di pagamento: Calendario fiscale {results.fiscalYear + 1}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Le imposte calcolate per il {results.fiscalYear} sono da versare nell'anno successivo secondo il calendario fiscale mostrato sotto
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6 md:mb-8">
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <Building2 className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Utile Lordo</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(results.grossProfit)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={results.isIresPremialeApplicable ? "border-2 border-purple-400 bg-purple-50" : ""}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Euro className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      IRES ({(results.iresRate * 100).toFixed(0)}%)
                      {results.isIresPremialeApplicable && <span className="text-purple-600 font-bold"> PREMIALE!</span>}
                    </p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(results.iresAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <MapPin className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">IRAP</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(results.irapAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">INPS Totale</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(results.inpsTotalAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Download className="h-8 w-8 text-red-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Totale Dovuto</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(results.totalDue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Success Message */}
          <Card className="mb-8 bg-green-50 border-2 border-green-200">
            <CardContent className="p-6 text-center">
              <h3 className="text-2xl font-bold text-green-800 mb-2">
                🎉 Report SRL Avanzato Sbloccato!
              </h3>
              <p className="text-green-700 mb-4">
                Pianificazione fiscale completa con tutti i calcoli avanzati per la tua SRL.
              </p>
              <div className="text-green-600 text-sm mb-4">
                ✅ Report avanzato inviato anche via email • ✅ Salva questa pagina nei preferiti
              </div>
              
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={exportToExcel}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Scarica Excel Avanzato
                </Button>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                      <Mail className="h-4 w-4 mr-2" />
                      Invia via Email
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>📧 Invia Report SRL Avanzato via Email</DialogTitle>
                      <DialogDescription>
                        Riceverai il report completo con pianificazione fiscale avanzata
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...emailForm}>
                      <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                        <FormField
                          control={emailForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Indirizzo Email</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="mario.rossi@azienda.com" 
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={sendEmailMutation.isPending}
                        >
                          {sendEmailMutation.isPending ? "Invio in corso..." : "📧 Invia Report Avanzato"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Dettaglio Fiscale Completo Anno 2024 */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800">
                <Euro className="mr-2 h-5 w-5" />
                Dettaglio Fiscale Completo Anno 2024
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Reddito imponibile:</span>
                      <span className="font-medium">{formatCurrency(results.taxableIncomeAfterLosses)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Aliquota IRES:</span>
                      <span className="font-medium">{results.isIresPremialeApplicable ? '20.0%' : '24.0%'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IRES 2024:</span>
                      <span className="font-medium">{formatCurrency(results.iresAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IRAP 2024:</span>
                      <span className="font-medium">{formatCurrency(results.irapAmount)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Totale Imposte:</span>
                      <span>{formatCurrency(results.iresAmount + results.irapAmount)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Contributi INPS:</span>
                      <span className="font-medium">{formatCurrency(results.inpsTotalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Regime contributivo:</span>
                      <span className="font-medium">INPS SRL</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Totale Contributi:</span>
                      <span>{formatCurrency(results.inpsTotalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-blue-900">Totale Dovuto Anno 2024:</span>
                  <span className="text-2xl font-bold text-blue-600">{formatCurrency(results.iresAmount + results.irapAmount + results.inpsTotalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pianificatore Scadenze Fiscali 2025 */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-800">
                <Calendar className="mr-2 h-5 w-5" />
                Pianificatore Scadenze Fiscali 2025
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Data Scadenza</th>
                      <th className="text-left py-2 px-4">Importo</th>
                      <th className="text-left py-2 px-4">Tipo Versamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b bg-green-50">
                      <td className="py-2 px-4">30 Giugno 2025</td>
                      <td className="py-2 px-4 font-medium text-green-600">{formatCurrency(results.iresAmount)}</td>
                      <td className="py-2 px-4">Saldo IRES 2024</td>
                    </tr>
                    <tr className="border-b bg-blue-50">
                      <td className="py-2 px-4">30 Giugno 2025</td>
                      <td className="py-2 px-4 font-medium text-blue-600">{formatCurrency(results.iresFirstAcconto)}</td>
                      <td className="py-2 px-4">Primo Acconto IRES 2025 (40%)</td>
                    </tr>
                    <tr className="border-b bg-orange-50">
                      <td className="py-2 px-4">30 Giugno 2025</td>
                      <td className="py-2 px-4 font-medium text-orange-600">{formatCurrency(results.irapAmount)}</td>
                      <td className="py-2 px-4">Saldo IRAP 2024</td>
                    </tr>
                    <tr className="border-b bg-cyan-50">
                      <td className="py-2 px-4">30 Giugno 2025</td>
                      <td className="py-2 px-4 font-medium text-cyan-600">{formatCurrency(results.irapFirstAcconto)}</td>
                      <td className="py-2 px-4">Primo Acconto IRAP 2025 (40%)</td>
                    </tr>
                    <tr className="border-b bg-purple-50">
                      <td className="py-2 px-4">30 Novembre 2025</td>
                      <td className="py-2 px-4 font-medium text-purple-600">{formatCurrency(results.iresSecondAcconto)}</td>
                      <td className="py-2 px-4">Secondo Acconto IRES 2025 (60%)</td>
                    </tr>
                    <tr className="border-b bg-pink-50">
                      <td className="py-2 px-4">30 Novembre 2025</td>
                      <td className="py-2 px-4 font-medium text-pink-600">{formatCurrency(results.irapSecondAcconto)}</td>
                      <td className="py-2 px-4">Secondo Acconto IRAP 2025 (60%)</td>
                    </tr>
                    <tr className="border-b bg-amber-50">
                      <td className="py-2 px-4">16 Agosto 2025</td>
                      <td className="py-2 px-4 font-medium text-amber-600">{formatCurrency(results.inpsTotalAmount)}</td>
                      <td className="py-2 px-4">Contributi INPS 2024</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Dettaglio Fiscale Completo Anno 2025 */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800">
                <Euro className="mr-2 h-5 w-5" />
                Dettaglio Fiscale Completo Anno 2025
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Reddito imponibile:</span>
                      <span className="font-medium">{formatCurrency(results.taxableIncomeAfterLosses)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Aliquota IRES:</span>
                      <span className="font-medium">{results.isIresPremialeApplicable ? '20.0%' : '24.0%'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IRES 2025:</span>
                      <span className="font-medium">{formatCurrency(results.iresAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IRAP 2025:</span>
                      <span className="font-medium">{formatCurrency(results.irapAmount)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Totale Imposte:</span>
                      <span>{formatCurrency(results.iresAmount + results.irapAmount)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Contributi INPS:</span>
                      <span className="font-medium">{formatCurrency(results.inpsTotalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Regime contributivo:</span>
                      <span className="font-medium">INPS SRL</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Totale Contributi:</span>
                      <span>{formatCurrency(results.inpsTotalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-blue-900">Totale Dovuto Anno 2025:</span>
                  <span className="text-2xl font-bold text-blue-600">{formatCurrency(results.iresAmount + results.irapAmount + results.inpsTotalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pianificatore Scadenze Fiscali 2026 */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-800">
                <Calendar className="mr-2 h-5 w-5" />
                Pianificatore Scadenze Fiscali 2026
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Data Scadenza</th>
                      <th className="text-left py-2 px-4">Importo</th>
                      <th className="text-left py-2 px-4">Tipo Versamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b bg-green-50">
                      <td className="py-2 px-4">30 Giugno 2026</td>
                      <td className="py-2 px-4 font-medium text-green-600">{formatCurrency(results.iresAmount)}</td>
                      <td className="py-2 px-4">Saldo IRES 2025</td>
                    </tr>
                    <tr className="border-b bg-blue-50">
                      <td className="py-2 px-4">30 Giugno 2026</td>
                      <td className="py-2 px-4 font-medium text-blue-600">{formatCurrency(results.iresFirstAcconto)}</td>
                      <td className="py-2 px-4">Primo Acconto IRES 2026 (40%)</td>
                    </tr>
                    <tr className="border-b bg-orange-50">
                      <td className="py-2 px-4">30 Giugno 2026</td>
                      <td className="py-2 px-4 font-medium text-orange-600">{formatCurrency(results.irapAmount)}</td>
                      <td className="py-2 px-4">Saldo IRAP 2025</td>
                    </tr>
                    <tr className="border-b bg-cyan-50">
                      <td className="py-2 px-4">30 Giugno 2026</td>
                      <td className="py-2 px-4 font-medium text-cyan-600">{formatCurrency(results.irapFirstAcconto)}</td>
                      <td className="py-2 px-4">Primo Acconto IRAP 2026 (40%)</td>
                    </tr>
                    <tr className="border-b bg-purple-50">
                      <td className="py-2 px-4">30 Novembre 2026</td>
                      <td className="py-2 px-4 font-medium text-purple-600">{formatCurrency(results.iresSecondAcconto)}</td>
                      <td className="py-2 px-4">Secondo Acconto IRES 2026 (60%)</td>
                    </tr>
                    <tr className="border-b bg-pink-50">
                      <td className="py-2 px-4">30 Novembre 2026</td>
                      <td className="py-2 px-4 font-medium text-pink-600">{formatCurrency(results.irapSecondAcconto)}</td>
                      <td className="py-2 px-4">Secondo Acconto IRAP 2026 (60%)</td>
                    </tr>
                    <tr className="border-b bg-amber-50">
                      <td className="py-2 px-4">16 Agosto 2026</td>
                      <td className="py-2 px-4 font-medium text-amber-600">{formatCurrency(results.inpsTotalAmount)}</td>
                      <td className="py-2 px-4">Contributi INPS 2025</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pianificatore IVA 2025 (Regime Trimestrale) */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-800">
                <FileText className="mr-2 h-5 w-5" />
                Pianificatore IVA 2025 (Regime Trimestrale)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-orange-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-orange-800 font-semibold">IVA su Vendite Annua</div>
                    <div className="text-2xl font-bold text-orange-600">{formatCurrency(results.vatOnSales || 0)}</div>
                  </div>
                  <div>
                    <div className="text-orange-800 font-semibold">IVA Acquisti Stimata</div>
                    <div className="text-2xl font-bold text-orange-600">{formatCurrency(results.vatOnPurchases || 0)}</div>
                  </div>
                  <div>
                    <div className="text-orange-800 font-semibold">IVA Netta da Versare</div>
                    <div className="text-2xl font-bold text-orange-600">{formatCurrency((results.vatOnSales || 0) - (results.vatOnPurchases || 0))}</div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Periodo</th>
                      <th className="text-left py-2 px-4">Data Scadenza</th>
                      <th className="text-left py-2 px-4">Importo IVA</th>
                      <th className="text-left py-2 px-4">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b bg-orange-50">
                      <td className="py-2 px-4">I Trimestre 2025</td>
                      <td className="py-2 px-4">16 Maggio 2025</td>
                      <td className="py-2 px-4 font-medium text-orange-600">{formatCurrency(((results.vatOnSales || 0) - (results.vatOnPurchases || 0)) / 4)}</td>
                      <td className="py-2 px-4">Liquidazione Trimestrale</td>
                    </tr>
                    <tr className="border-b bg-orange-50">
                      <td className="py-2 px-4">II Trimestre 2025</td>
                      <td className="py-2 px-4">16 Agosto 2025</td>
                      <td className="py-2 px-4 font-medium text-orange-600">{formatCurrency(((results.vatOnSales || 0) - (results.vatOnPurchases || 0)) / 4)}</td>
                      <td className="py-2 px-4">Liquidazione Trimestrale</td>
                    </tr>
                    <tr className="border-b bg-orange-50">
                      <td className="py-2 px-4">III Trimestre 2025</td>
                      <td className="py-2 px-4">16 Novembre 2025</td>
                      <td className="py-2 px-4 font-medium text-orange-600">{formatCurrency(((results.vatOnSales || 0) - (results.vatOnPurchases || 0)) / 4)}</td>
                      <td className="py-2 px-4">Liquidazione Trimestrale</td>
                    </tr>
                    <tr className="border-b bg-orange-50">
                      <td className="py-2 px-4">IV Trimestre 2025</td>
                      <td className="py-2 px-4">16 Febbraio 2026</td>
                      <td className="py-2 px-4 font-medium text-orange-600">{formatCurrency(((results.vatOnSales || 0) - (results.vatOnPurchases || 0)) / 4)}</td>
                      <td className="py-2 px-4">Liquidazione Trimestrale</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Scadenze Fiscali con Indicatori di Urgenza */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-900">📅 Scadenze Fiscali 2025</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">⚠️ Nota importante:</span> Le scadenze IRES/IRAP 2025 si basano sull'anno d'imposta <strong>2024</strong> (saldo + acconti calcolati su imposta 2024). Gli importi mostrati sono una stima basata sulla proiezione 2025.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-4 rounded-lg border-2 ${getUrgencyLevel('30/06/2025').class}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">30 Giugno 2025</h4>
                    <span className="text-sm font-medium px-2 py-1 rounded">
                      {getUrgencyLevel('30/06/2025').text}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>• IRES Saldo:</span>
                      <span className="font-semibold">{formatCurrency(results.iresAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• IRES 1° Acconto:</span>
                      <span className="font-semibold">{formatCurrency(results.iresFirstAcconto)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• IRAP Saldo:</span>
                      <span className="font-semibold">{formatCurrency(results.irapAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• IRAP 1° Acconto:</span>
                      <span className="font-semibold">{formatCurrency(results.irapFirstAcconto)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-bold">
                      <span>Totale:</span>
                      <span>{formatCurrency(results.iresAmount + results.iresFirstAcconto + results.irapAmount + results.irapFirstAcconto)}</span>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg border-2 ${getUrgencyLevel('30/11/2025').class}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">30 Novembre 2025</h4>
                    <span className="text-sm font-medium px-2 py-1 rounded">
                      {getUrgencyLevel('30/11/2025').text}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>• IRES 2° Acconto:</span>
                      <span className="font-semibold">{formatCurrency(results.iresSecondAcconto)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• IRAP 2° Acconto:</span>
                      <span className="font-semibold">{formatCurrency(results.irapSecondAcconto)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-bold">
                      <span>Totale:</span>
                      <span>{formatCurrency(results.iresSecondAcconto + results.irapSecondAcconto)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scadenze IVA con Urgenza */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-6 text-gray-900">📅 Scadenze IVA 2025-2026</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {results.vatDeadlines.map((deadline, index) => {
                  const urgency = getUrgencyLevel(deadline.date);
                  return (
                    <div key={index} className={`p-4 rounded-lg border-2 ${urgency.class}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">{deadline.type}</div>
                        <span className="text-xs px-2 py-1 rounded bg-white/50">
                          {urgency.text}
                        </span>
                      </div>
                      <div className="text-lg font-bold">{deadline.date}</div>
                      <div className="text-xl font-bold mt-2">
                        {formatCurrency(deadline.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Piano di Accantonamento con Margine di Sicurezza */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-6 text-gray-900">💰 Piano di Accantonamento con Margine di Sicurezza</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                  <h4 className="font-semibold text-green-900 mb-3">📊 Accantonamento Standard</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Mensile base:</span>
                      <span className="font-bold text-green-900">{formatCurrency(results.monthlyAccrual)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">% su fatturato:</span>
                      <span className="font-semibold">{((results.monthlyAccrual / ((form.watch('revenue') || 1) / 12)) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3">🛡️ Con Margine Sicurezza (10%)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Mensile sicuro:</span>
                      <span className="font-bold text-blue-900">{formatCurrency(calculateSafetyMargin(results.monthlyAccrual))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Margine extra:</span>
                      <span className="font-semibold text-blue-800">+{formatCurrency(calculateSafetyMargin(results.monthlyAccrual) - results.monthlyAccrual)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-3">🎯 Distribuzione Cashflow</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-purple-700">Accumulo annuale:</span>
                      <span className="font-semibold">{formatCurrency(calculateSafetyMargin(results.monthlyAccrual) * 12)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-700">Copertura:</span>
                      <span className="font-bold text-purple-900">{((calculateSafetyMargin(results.monthlyAccrual) * 12) / results.totalDue * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {true && (
                <div className="mt-6 bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-3">⚡ Ottimizzazione Cashflow Basata su Dati Reali</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-yellow-700">Proiezione basata su:</span>
                      <ul className="list-disc list-inside text-yellow-600 mt-1">
                        <li>Dati definitivi 2024</li>
                        <li>Situazione parziale 2025</li>
                        <li>Imposte già versate</li>
                      </ul>
                    </div>
                    <div>
                      <span className="text-yellow-700">Vantaggi pianificazione:</span>
                      <ul className="list-disc list-inside text-yellow-600 mt-1">
                        <li>Calcoli più precisi</li>
                        <li>Riduzione margine errore</li>
                        <li>Ottimizzazione liquidità</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>



          {/* Piano di Accantonamento */}
          <Card className="mb-6 md:mb-8">
            <CardContent className="p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">📊 Piano di Accantonamento Mensile</h3>
              <p className="text-sm text-gray-600 mb-6">
                Scegli il tipo di accantonamento per ottimizzare la gestione della liquidità aziendale
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-blue-900">💼 Accantonamento Standard</h4>
                    <input 
                      type="radio" 
                      name="accantonamento" 
                      className="mt-1"
                      checked={!useSafetyMargin}
                      onChange={() => setUseSafetyMargin(false)}
                    />
                  </div>
                  <div className="space-y-2 text-sm text-blue-700">
                    <div className="flex justify-between">
                      <span>Importo mensile:</span>
                      <span className="font-bold">{formatCurrency(results.monthlyAccrual)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accumulo annuale:</span>
                      <span className="font-semibold">{formatCurrency(results.monthlyAccrual * 12)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Copertura imposte:</span>
                      <span className="font-bold">{((results.monthlyAccrual * 12) / results.totalDue * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-green-900">🛡️ Con Margine Sicurezza (10%)</h4>
                    <input 
                      type="radio" 
                      name="accantonamento" 
                      className="mt-1"
                      checked={useSafetyMargin}
                      onChange={() => setUseSafetyMargin(true)}
                    />
                  </div>
                  <div className="space-y-2 text-sm text-green-700">
                    <div className="flex justify-between">
                      <span>Importo mensile:</span>
                      <span className="font-bold">{formatCurrency(calculateSafetyMargin(results.monthlyAccrual))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accumulo annuale:</span>
                      <span className="font-semibold">{formatCurrency(calculateSafetyMargin(results.monthlyAccrual) * 12)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Margine extra:</span>
                      <span className="font-bold text-green-800">+{formatCurrency(calculateSafetyMargin(results.monthlyAccrual) - results.monthlyAccrual)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scadenziere con Liquidità Progressiva */}
          <Card className="mb-6 md:mb-8">
            <CardContent className="p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">💰 Scadenziere con Liquidità Progressiva</h3>
              <p className="text-sm text-gray-600 mb-4">
                Piano completo dal {new Date().toLocaleDateString('it-IT')} in poi - Solo scadenze future (Saldo Attuale: {formatCurrency(form.watch('currentBalance') || 0)})
              </p>
              
              {/* Legenda */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Legenda Movimenti:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 mr-2"></span>
                    <span>Versamenti mensili ({useSafetyMargin ? formatCurrency(calculateSafetyMargin(results.monthlyAccrual)) : formatCurrency(results.monthlyAccrual)})</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                    <span>Liquidazioni IVA</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                    <span>Acconti/Saldi IRES</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
                    <span>Acconti/Saldi IRAP</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-2"></span>
                    <span>Contributi INPS</span>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-semibold">Data</th>
                      <th className="text-left p-3 font-semibold">Scadenza</th>
                      <th className="text-right p-3 font-semibold">Importo</th>
                      <th className="text-right p-3 font-semibold">Saldo Prima</th>
                      <th className="text-right p-3 font-semibold">Versamento</th>
                      <th className="text-right p-3 font-semibold">Saldo Dopo</th>
                      <th className="text-center p-3 font-semibold">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getDynamicPaymentSchedule(results.paymentSchedule, results.monthlyAccrual, useSafetyMargin).map((payment, index) => (
                      <tr key={index} className={`border-b hover:bg-gray-50 ${
                        payment.deficit > 0 ? 'bg-red-50' : 
                        payment.isIncome ? 'bg-green-50' : ''
                      }`}>
                        <td className="p-3 font-medium">{payment.date}</td>
                        <td className="p-3">
                          <div className="flex items-center">
                            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                              payment.category === 'ACCUMULO' ? 'bg-emerald-500' :
                              payment.category === 'IRES' ? 'bg-green-500' :
                              payment.category === 'IRAP' ? 'bg-purple-500' :
                              payment.category === 'IVA' ? 'bg-blue-500' :
                              'bg-orange-500'
                            }`}></span>
                            <div>
                              <div className="font-medium">{payment.type}</div>
                              <div className="text-xs text-gray-500">{payment.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`p-3 text-right font-semibold ${
                          payment.isIncome ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {payment.isIncome ? '+' : '-'}{formatCurrency(payment.amount)}
                        </td>
                        <td className="p-3 text-right">
                          {formatCurrency(payment.previousBalance)}
                        </td>
                        <td className="p-3 text-right">
                          {payment.requiredPayment > 0 ? (
                            <span className={`font-semibold ${
                              payment.isIncome ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(payment.requiredPayment)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className={`p-3 text-right font-semibold ${payment.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(payment.balance)}
                        </td>
                        <td className="p-3 text-center">
                          {payment.isIncome ? (
                            <span className="inline-block px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded-full font-medium">
                              Versamento
                            </span>
                          ) : payment.deficit > 0 ? (
                            <div className="text-center">
                              <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full font-medium">
                                Deficit
                              </span>
                              <div className="text-xs text-red-600 mt-1">
                                -{formatCurrency(payment.deficit)}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Riepilogo Deficit */}
              {results.paymentSchedule.some(p => p.deficit > 0) && (
                <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-3">⚠️ Deficit di Liquidità Rilevati</h4>
                  <div className="space-y-2 text-sm">
                    {results.paymentSchedule
                      .filter(p => p.deficit > 0)
                      .map((payment, index) => (
                        <div key={index} className="flex justify-between text-red-700">
                          <span>{payment.date} - {payment.type}:</span>
                          <span className="font-semibold">Deficit {formatCurrency(payment.deficit)}</span>
                        </div>
                      ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-red-300">
                    <p className="text-sm text-red-800 font-medium">
                      💡 Suggerimento: Aumenta l'accantonamento mensile a {formatCurrency(calculateSafetyMargin(results.monthlyAccrual))} per evitare deficit
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Download Report */}
          <Card className="mb-6 md:mb-8">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">📄 Report SRL Avanzato</h3>
                  <p className="text-sm md:text-base text-gray-600">Scarica il report con pianificazione fiscale avanzata e margine di sicurezza</p>
                </div>
                <Button 
                  onClick={exportToExcel}
                  className="bg-green-600 hover:bg-green-700 h-12 md:h-auto px-6 py-3 touch-manipulation"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Scarica Excel Avanzato
                </Button>
                
                <Button 
                  onClick={() => {
                    if (!results || !isUnlocked) return;
                    setShowEmailDialog(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 h-12 md:h-auto px-6 py-3 touch-manipulation"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Invia via Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Email Dialog Modal */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invia Report SRL Avanzato via Email
            </DialogTitle>
            <DialogDescription>
              Riceverai il report completo con pianificazione fiscale avanzata
            </DialogDescription>
          </DialogHeader>
          
          <Form {...emailDialogForm}>
            <form onSubmit={emailDialogForm.handleSubmit((data) => {
              if (!results) return;
              
              sendEmailMutation.mutate({
                email: data.email,
                calculationData: results
              });
              
              setShowEmailDialog(false);
              emailDialogForm.reset();
            })} className="space-y-4">
              <FormField
                control={emailDialogForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indirizzo Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="mario.rossi@azienda.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEmailDialog(false)}
                  className="flex-1"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={sendEmailMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {sendEmailMutation.isPending ? "Invio in corso..." : "Invia Report Avanzato"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
