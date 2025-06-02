import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Calendar, TrendingUp, Euro, FileText, HelpCircle, Building, Users, Calculator, DollarSign, PiggyBank, Clock } from "lucide-react";
import logoPath from "@assets/SmartRate - Colors.png";
import { Link } from "wouter";
import { calculateIndividualTaxes, IndividualTaxCalculationResult, CONTRIBUTION_RATES } from "@/lib/individual-tax-calculator";
import { apiRequest } from "@/lib/queryClient";

const calculationSchema = z.object({
  // Data inizio attività
  startDate: z.string().min(1, "Seleziona la data di inizio attività"),
  
  // Dati di attività
  atecoCode: z.string().min(1, "Seleziona il codice ATECO"),
  businessType: z.enum(["professional", "business", "artisan", "commercial"]),
  
  // Dati economici 2024 (anno di imposta)
  revenue2024: z.number().min(0, "I ricavi 2024 devono essere positivi"),
  documentedExpenses2024: z.number().min(0, "Le spese 2024 devono essere positive"),
  otherIncome2024: z.number().min(0).optional(),
  taxWithholdings2024: z.number().min(0).optional(),
  
  // Dati economici 2025 (per pianificazione 2026)
  revenue: z.number().min(0, "I ricavi devono essere positivi").optional(),
  documentedExpenses: z.number().min(0, "Le spese devono essere positive").optional(),
  
  // Altri redditi
  otherIncome: z.number().min(0).optional(),
  employmentIncome: z.number().min(0).optional(),
  
  // Ritenute e acconti
  taxWithholdings: z.number().min(0).optional(),
  
  // Contributi previdenziali
  contributionType: z.enum(["inps_gestione_separata", "cassa_forense", "inarcassa", "inps_artigiani", "inps_commercianti"]),
  hasOtherPension: z.boolean().default(false),
  isPensioner: z.boolean().default(false),
  rivalsa4Percent: z.boolean().default(false),
  
  // Dati anno precedente
  previousYearTaxableIncome: z.number().min(0).optional(),
  previousYearIrpef: z.number().min(0).optional(),
  
  // IVA
  vatRegime: z.string().min(1, "Seleziona il regime IVA"),
  vatOnSales: z.number().min(0).optional(),
  vatOnPurchases: z.number().min(0).optional(),
  hasVatDebt: z.boolean().default(false),
  vatDebt: z.number().min(0).optional(),
  
  // Liquidità
  currentBalance: z.number().min(0).optional(),
}).refine((data) => {
  // Se l'attività è iniziata nel 2024 o prima, i dati precedenti sono obbligatori
  const startYear = new Date(data.startDate).getFullYear();
  if (startYear <= 2024) {
    return data.previousYearTaxableIncome !== undefined && data.previousYearTaxableIncome >= 0;
  }
  return true;
}, {
  message: "Per attività iniziate nel 2024 o prima è obbligatorio inserire il reddito imponibile dell'anno precedente",
  path: ["previousYearTaxableIncome"]
});

const leadSchema = z.object({
  firstName: z.string().min(2, "Nome deve avere almeno 2 caratteri"),
  lastName: z.string().min(2, "Cognome deve avere almeno 2 caratteri"),
  email: z.string().email("Email non valida"),
  companyName: z.string().optional(),
  vatNumber: z.string().optional(),
  businessSector: z.string().min(2, "Settore aziendale richiesto"),
});

const emailSchema = z.object({
  email: z.string().email("Email non valida"),
});

type CalculationForm = z.infer<typeof calculationSchema>;
type LeadForm = z.infer<typeof leadSchema>;
type EmailForm = z.infer<typeof emailSchema>;

const ATECO_CODES = {
  '62': 'Produzione di software e consulenza informatica',
  '69': 'Attività legali e di contabilità',
  '70': 'Attività di direzione aziendale e di consulenza gestionale',
  '71': 'Attività degli studi di architettura e d\'ingegneria',
  '72': 'Ricerca scientifica e sviluppo',
  '73': 'Pubblicità e ricerche di mercato',
  '74': 'Altre attività professionali, scientifiche e tecniche',
  '86': 'Assistenza sanitaria',
  '85': 'Istruzione',
  '43': 'Lavori di costruzione specializzati',
  '47': 'Commercio al dettaglio',
  '46': 'Commercio all\'ingrosso',
  '45': 'Commercio e riparazione di autoveicoli'
};

const BUSINESS_TYPES = {
  professional: 'Attività Professionale',
  business: 'Attività d\'Impresa',
  artisan: 'Attività Artigianale',
  commercial: 'Attività Commerciale'
};

const CONTRIBUTION_TYPES = {
  inps_gestione_separata: 'INPS Gestione Separata',
  cassa_forense: 'Cassa Forense (Avvocati)',
  inarcassa: 'INARCASSA (Ingegneri/Architetti)',
  inps_artigiani: 'INPS Artigiani',
  inps_commercianti: 'INPS Commercianti'
};

const VAT_REGIMES = {
  'ordinario': 'Regime Ordinario',
  'semplificato': 'Regime Semplificato',
  'agricoltura': 'Regime Agricoltura'
};

export default function CalculatorIndividualPage() {
  const [results, setResults] = useState<IndividualTaxCalculationResult | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const { toast } = useToast();

  const form = useForm<CalculationForm>({
    resolver: zodResolver(calculationSchema),
    defaultValues: {
      startDate: "",
      atecoCode: "",
      businessType: "professional",
      // Dati 2024
      revenue2024: 0,
      documentedExpenses2024: 0,
      otherIncome2024: 0,
      taxWithholdings2024: 0,
      // Dati 2025
      revenue: 0,
      documentedExpenses: 0,
      otherIncome: 0,
      employmentIncome: 0,
      taxWithholdings: 0,
      contributionType: "inps_gestione_separata",
      hasOtherPension: false,
      isPensioner: false,
      rivalsa4Percent: false,
      previousYearTaxableIncome: 0,
      previousYearIrpef: 0,
      vatRegime: "ordinario",
      vatOnSales: 0,
      vatOnPurchases: 0,
      hasVatDebt: false,
      vatDebt: 0,
      currentBalance: 0,
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

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async (data: CalculationForm) => {
      const startYear = new Date(data.startDate).getFullYear();
      const result = calculateIndividualTaxes({
        startDate: data.startDate,
        startYear: startYear,
        atecoCode: data.atecoCode,
        businessType: data.businessType,
        // Usa i dati 2024 per il calcolo principale
        revenue: data.revenue2024 || 0,
        documentedExpenses: data.documentedExpenses2024 || 0,
        // Dati 2025 per pianificazione
        revenue2025: data.revenue,
        documentedExpenses2025: data.documentedExpenses,
        otherIncome: data.otherIncome2024,
        employmentIncome: data.employmentIncome,
        taxWithholdings: data.taxWithholdings2024,
        contributionType: data.contributionType,
        hasOtherPension: data.hasOtherPension,
        isPensioner: data.isPensioner,
        rivalsa4Percent: data.rivalsa4Percent,
        previousYearTaxableIncome: startYear <= 2024 ? data.previousYearTaxableIncome : undefined,
        previousYearIrpef: startYear <= 2024 ? data.previousYearIrpef : undefined,
        vatRegime: data.vatRegime,
        vatOnSales: data.vatOnSales,
        vatOnPurchases: data.vatOnPurchases,
        hasVatDebt: data.hasVatDebt,
        vatDebt: data.vatDebt || 0,
        currentBalance: data.currentBalance || 0,
        fiscalYear: 2025,
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
        description: error.message || "Errore durante il calcolo delle imposte",
      });
    },
  });

  const submitLeadMutation = useMutation({
    mutationFn: async (data: LeadForm) => {
      const response = await apiRequest('POST', '/api/leads', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        companyName: data.companyName || '',
        vatNumber: data.vatNumber || '',
        businessSector: data.businessSector,
        leadSource: 'individual-calculator',
        calculationType: 'individual-ordinario'
      });
      return response;
    },
    onSuccess: () => {
      setIsUnlocked(true);
      setShowLeadForm(false);
      toast({
        title: "Report sbloccato!",
        description: "Ora puoi visualizzare tutti i dettagli del calcolo",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore nell'invio dei dati",
        description: error.message || "Errore durante l'invio dei dati di contatto",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: EmailForm & { calculationData: IndividualTaxCalculationResult }) => {
      const response = await apiRequest('POST', '/api/send-report-individual', {
        email: data.email,
        calculationData: data.calculationData
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Report inviato!",
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

  const onLeadSubmit = (data: LeadForm) => {
    submitLeadMutation.mutate(data);
  };

  const onEmailSubmit = (data: EmailForm) => {
    if (results) {
      sendEmailMutation.mutate({ ...data, calculationData: results });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-md border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center">
              <img 
                src={logoPath} 
                alt="SmartRate" 
                className="h-10 md:h-12 w-auto"
              />
            </div>
            <div className="flex gap-2">
              <Link href="/calculator">
                <Button variant="outline" size="sm" className="text-xs">
                  📊 Forfettario
                </Button>
              </Link>
              <Link href="/calculator-srl">
                <Button variant="outline" size="sm" className="text-xs">
                  🏢 SRL
                </Button>
              </Link>
              <Button variant="default" size="sm" className="text-xs">
                👤 Ordinario
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

      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Calcolatore Tasse Ditte Individuali 
            <span className="text-blue-600"> Regime Ordinario</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Calcola con precisione IRPEF, contributi previdenziali, IVA e pianifica le scadenze fiscali 2025 
            per la tua ditta individuale in regime ordinario
          </p>
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
                    📅 Informazioni Attività
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                    Data di apertura della Partita IVA. Se iniziata nel 2024 o prima, 
                                    saranno richiesti i dati dell'anno precedente per calcoli precisi.
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
                      name="atecoCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>🏷️ Codice ATECO *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona il tuo settore" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(ATECO_CODES).map(([code, description]) => (
                                <SelectItem key={code} value={code}>
                                  {code} - {description}
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
                      name="businessType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>👨‍💼 Tipo Attività *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona il tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(BUSINESS_TYPES).map(([key, description]) => (
                                <SelectItem key={key} value={key}>
                                  {description}
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

                {/* Dati Economici 2024 - FONDAMENTALI PER CALCOLO IMPOSTE 2025 */}
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    📊 Dati Economici 2024 (Anno di Imposta)
                  </h3>
                  <p className="text-sm text-blue-700 mb-4">
                    <strong>Obbligatori:</strong> Questi dati del 2024 servono per calcolare le imposte da pagare nel 2025 (saldo + acconti).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="revenue2024"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>💰 Ricavi/Compensi 2024 (€) *</FormLabel>
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
                    
                    <FormField
                      control={form.control}
                      name="documentedExpenses2024"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>📋 Spese Documentate 2024 (€) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="es: 25000"
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
                      name="otherIncome2024"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>💼 Altri Redditi 2024 (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="es: 5000"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              value={field.value || ""}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="taxWithholdings2024"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>💳 Ritenute Subite 2024 (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="es: 8000"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              value={field.value || ""}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Dati Economici 2025 - PER PIANIFICAZIONE 2026 */}
                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                  <h3 className="font-semibold text-green-900 mb-4 flex items-center">
                    <Euro className="h-5 w-5 mr-2" />
                    💼 Dati Economici 2025 (Per Pianificazione 2026)
                  </h3>
                  <p className="text-sm text-green-700 mb-4">
                    <strong>Opzionali:</strong> Questi dati 2025 servono per calcolare gli acconti da versare nel 2026 e pianificare il futuro.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="revenue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            💰 Ricavi/Compensi 2025 (€) *
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs text-sm">
                                    Entrate lorde previste per il 2025. Per professionisti sono i compensi,
                                    per imprese sono i ricavi di vendita.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="es: 80000"
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
                      name="documentedExpenses"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            📋 Spese Documentate 2025 (€) *
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs text-sm">
                                    Costi sostenuti e documentati per l'attività (materiali, servizi, 
                                    consulenze, affitti, utilities, ecc.)
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="es: 25000"
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
                      name="otherIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>🏠 Altri Redditi (€)</FormLabel>
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
                      name="employmentIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>👔 Reddito Lavoro Dipendente (€)</FormLabel>
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
                  </div>
                </div>

                {/* Dati Anno Precedente - mostrati solo se attività iniziata nel 2024 o prima */}
                {form.watch("startDate") && new Date(form.watch("startDate")).getFullYear() <= 2024 && (
                  <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
                    <h3 className="font-semibold text-orange-900 mb-4 flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      📊 Dati Anno Precedente
                    </h3>
                    <p className="text-sm text-orange-700 mb-4">
                      <strong>Campi obbligatori:</strong> I dati dell'anno precedente sono necessari per calcolare correttamente gli acconti 2025.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="previousYearTaxableIncome"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>📈 Reddito Imponibile Anno Precedente (€) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="es: 55000"
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
                        name="previousYearIrpef"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>💳 IRPEF Anno Precedente (€)</FormLabel>
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
                    </div>
                  </div>
                )}

                {/* Contributi Previdenziali */}
                <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-4 flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    🛡️ Contributi Previdenziali
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contributionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>🏛️ Gestione Previdenziale *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona la gestione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(CONTRIBUTION_TYPES).map(([key, description]) => (
                                <SelectItem key={key} value={key}>
                                  {description}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-2">
                      <FormField
                        control={form.control}
                        name="hasOtherPension"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Hai altra copertura previdenziale
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="isPensioner"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Sei pensionato
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      {form.watch("contributionType") === "inps_gestione_separata" && (
                        <FormField
                          control={form.control}
                          name="rivalsa4Percent"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  Applichi rivalsa 4% INPS
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* IVA e Ritenute */}
                <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
                  <h3 className="font-semibold text-yellow-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    📄 IVA 2025 e Ritenute 2024
                  </h3>
                  <p className="text-sm text-yellow-700 mb-4">
                    <strong>IVA 2025:</strong> Dati previsionali per liquidazioni trimestrali 2025 | <strong>Ritenute 2024:</strong> Ritenute subite nell'anno di imposta
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="vatRegime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>📋 Regime IVA *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona regime" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(VAT_REGIMES).map(([key, description]) => (
                                <SelectItem key={key} value={key}>
                                  {description}
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
                      name="vatOnSales"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>💸 IVA sui Ricavi 2025 (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="es: 17600"
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
                      name="vatOnPurchases"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>💰 IVA sugli Acquisti 2025 (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="es: 5500"
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
                      name="taxWithholdings"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>🏦 Ritenute Subite (€)</FormLabel>
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
                    
                    <FormField
                      control={form.control}
                      name="currentBalance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>💳 Saldo Attuale (€)</FormLabel>
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
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-6">
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="px-8 py-3 text-lg font-semibold"
                    disabled={calculateMutation.isPending}
                  >
                    {calculateMutation.isPending ? (
                      <>
                        <Calculator className="mr-2 h-5 w-5 animate-spin" />
                        Calcolo in corso...
                      </>
                    ) : (
                      <>
                        <Calculator className="mr-2 h-5 w-5" />
                        Calcola Tasse e Pianifica Scadenze
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Results Preview */}
        {results && !isUnlocked && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Anteprima Calcolo Ditte Individuali - Regime Ordinario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">€{results.totalTaxes.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">IRPEF e Addizionali</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">€{results.totalContributions.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Contributi Previdenziali</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">€{results.totalDue.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Totale Annuo</div>
                </div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <p className="text-orange-800 text-center font-medium">
                  🔒 Inserisci i tuoi dati per sbloccare il report completo con pianificazione dettagliata, 
                  scadenziere fiscale 2025 e analisi liquidità
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lead Form */}
        {showLeadForm && !isUnlocked && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Sblocca il Report Completo</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...leadForm}>
                <form onSubmit={leadForm.handleSubmit(onLeadSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={leadForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome *</FormLabel>
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
                          <FormLabel>Cognome *</FormLabel>
                          <FormControl>
                            <Input placeholder="Rossi" {...field} />
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
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input placeholder="mario.rossi@email.com" {...field} />
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
                          <FormLabel>Settore di Attività *</FormLabel>
                          <FormControl>
                            <Input placeholder="es: Consulenza informatica" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={leadForm.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Attività (opzionale)</FormLabel>
                          <FormControl>
                            <Input placeholder="Studio Tecnico Rossi" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={leadForm.control}
                      name="vatNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Partita IVA (opzionale)</FormLabel>
                          <FormControl>
                            <Input placeholder="12345678901" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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

        {/* Full Results */}
        {results && isUnlocked && (
          <div className="space-y-6">
            {/* Piano di Accantonamento con Margine di Sicurezza */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PiggyBank className="mr-2 h-5 w-5 text-yellow-600" />
                  Piano di Accantonamento con Margine di Sicurezza
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                    <div className="flex items-center justify-center mb-2">
                      <Calculator className="h-5 w-5 text-blue-600 mr-1" />
                      <span className="text-sm font-medium text-blue-900">Accantonamento Standard</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-gray-600">Mensile base:</div>
                      <div className="text-xl font-bold text-blue-600">€{results.monthlyAccrual.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">% su fatturato: {((results.monthlyAccrual * 12 / (results.businessRevenue || 1)) * 100).toFixed(1)}%</div>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg text-center border border-orange-200">
                    <div className="flex items-center justify-center mb-2">
                      <TrendingUp className="h-5 w-5 text-orange-600 mr-1" />
                      <span className="text-sm font-medium text-orange-900">Con Margine Sicurezza (10%)</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-gray-600">Mensile sicuro:</div>
                      <div className="text-xl font-bold text-orange-600">€{Math.round(results.monthlyAccrual * 1.1).toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Margine extra: +€{Math.round(results.monthlyAccrual * 0.1).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg text-center border border-purple-200">
                    <div className="flex items-center justify-center mb-2">
                      <Euro className="h-5 w-5 text-purple-600 mr-1" />
                      <span className="text-sm font-medium text-purple-900">Distribuzione Cashflow</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-gray-600">Accumulo annuale:</div>
                      <div className="text-xl font-bold text-purple-600">€{results.totalDue.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Copertura: 100%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Breakdown Imposte e Contributi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5 text-purple-600" />
                    Dettaglio Imposte e Contributi 2025
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Reddito imponibile:</span>
                      <span className="font-medium">€{results.totalTaxableIncome.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IRPEF ({results.irpefRate.toFixed(1)}%):</span>
                      <span className="font-medium">€{results.irpefNetAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Add. Regionale:</span>
                      <span className="font-medium">€{results.regionalSurcharge.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Add. Comunale:</span>
                      <span className="font-medium">€{results.municipalSurcharge.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Totale Imposte:</span>
                      <span>€{results.totalTaxes.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5 text-orange-600" />
                    Contributi e Altri Oneri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>{CONTRIBUTION_TYPES[results.contributionDetails.type as keyof typeof CONTRIBUTION_TYPES]}:</span>
                      <span className="font-medium">€{results.contributionDetails.calculatedAmount.toLocaleString()}</span>
                    </div>
                    {results.contributionDetails.integrative && results.contributionDetails.integrative > 0 && (
                      <div className="flex justify-between">
                        <span>Contributi Integrativi:</span>
                        <span className="font-medium">€{results.contributionDetails.integrative.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>IVA Stimata:</span>
                      <span className="font-medium">€{results.vatAmount.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Totale Altri Oneri:</span>
                      <span>€{(results.totalContributions + results.vatAmount).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Anno Fiscale di Riferimento */}
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <Calendar className="mr-2 h-5 w-5" />
                  Anno Fiscale di Riferimento: 2025
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-green-700">IRPEF ({results.irpefRate.toFixed(1)}%): Anno fiscale 2025</div>
                  </div>
                  <div>
                    <div className="text-sm text-green-700">IVA (TRIMESTRALE): Liquidazioni anno 2025</div>
                  </div>
                  <div>
                    <div className="text-sm text-green-700">INPS: Contributi anno 2025</div>
                  </div>
                  <div>
                    <div className="text-sm text-green-700">IVA a Debito: €{results.vatAmount.toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-green-600">
                  <strong>Scadenze di pagamento:</strong> Calendario fiscale 2025<br/>
                  Le imposte calcolate per il 2025 sono da versare nell'anno successivo secondo il calendario fiscale inviato sotto.
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards con icone */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="text-center">
                <CardContent className="p-4">
                  <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-blue-600">€{results.businessIncome.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">Utile Lordo</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-4">
                  <Euro className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-green-600">€{results.irpefNetAmount.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">IRPEF ({results.irpefRate.toFixed(1)}%)</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-4">
                  <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-purple-600">€{results.totalContributions.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">INPS Totale</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-4">
                  <TrendingUp className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-orange-600">€{results.vatAmount.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">IVA Totale</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-4">
                  <PiggyBank className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-red-600">€{results.totalDue.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">Totale Dovuto</div>
                </CardContent>
              </Card>
            </div>

            {/* Report Avanzato Sbloccato */}
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  🎉 Report Ordinario Avanzato Sbloccato!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-green-700">Pianificazione fiscale completa con tutti i calcoli avanzati per la tua attività.</div>
                </div>
                
                <div className="flex justify-center gap-4">
                  <Button 
                    onClick={() => onEmailSubmit({ email: 'test@example.com' })}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={sendEmailMutation.isPending}
                  >
                    📥 Scarica Excel Avanzato
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="border-green-600 text-green-600 hover:bg-green-50"
                    onClick={() => onEmailSubmit({ email: 'test@example.com' })}
                    disabled={sendEmailMutation.isPending}
                  >
                    📧 Invia via Email
                  </Button>
                </div>
                
                <div className="mt-4 flex items-center justify-center text-sm text-green-600">
                  ✅ Report avanzato inviato anche via email: 📧 Salva questa pagina nei preferiti
                </div>
              </CardContent>
            </Card>

            {/* Email Report */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Ricevi Report Dettagliato via Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="flex gap-4">
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input 
                              placeholder="La tua email per ricevere il report Excel"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit"
                      disabled={sendEmailMutation.isPending}
                    >
                      {sendEmailMutation.isPending ? "Invio..." : "Invia Report"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Detailed Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Dettaglio Imposte e Contributi 2025</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">IRPEF e Addizionali</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>IRPEF Netta:</span>
                          <span>€{results.irpefNetAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Addizionale Regionale:</span>
                          <span>€{results.regionalSurcharge.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Addizionale Comunale:</span>
                          <span>€{results.municipalSurcharge.toLocaleString()}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Totale Imposte:</span>
                          <span>€{results.totalTaxes.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Contributi Previdenziali</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Gestione:</span>
                          <span>{CONTRIBUTION_TYPES[results.contributionDetails.type as keyof typeof CONTRIBUTION_TYPES]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Aliquota:</span>
                          <span>{(results.contributionDetails.rate * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Contributo Soggettivo:</span>
                          <span>€{results.contributionDetails.calculatedAmount.toLocaleString()}</span>
                        </div>
                        {results.contributionDetails.integrative && results.contributionDetails.integrative > 0 && (
                          <div className="flex justify-between">
                            <span>Contributo Integrativo:</span>
                            <span>€{results.contributionDetails.integrative.toLocaleString()}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Totale Contributi:</span>
                          <span>€{results.totalContributions.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pianificazione 2026 (se presenti dati 2025) */}
            {results.planning2026 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5 text-green-600" />
                    Dettaglio Imposte e Contributi 2026
                  </CardTitle>
                  <p className="text-sm text-green-700">
                    Acconti da versare nel 2026 basati sui dati 2025 previsionali
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-2">IRPEF e Addizionali 2026</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>IRPEF Netta:</span>
                            <span>€{results.planning2026.irpefNetAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Addizionale Regionale:</span>
                            <span>€{results.planning2026.regionalSurcharge.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Addizionale Comunale:</span>
                            <span>€{results.planning2026.municipalSurcharge.toLocaleString()}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-semibold">
                            <span>Totale Imposte:</span>
                            <span>€{results.planning2026.totalTaxes.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2">Contributi Previdenziali 2026</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Contributi Totali:</span>
                            <span>€{results.planning2026.contributionAmount.toLocaleString()}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-semibold">
                            <span>Totale Contributi:</span>
                            <span>€{results.planning2026.totalContributions.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Acconti 2026 */}
                    <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                      <h4 className="font-semibold mb-3 text-green-900">📅 Acconti da Versare nel 2026</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">€{results.planning2026.irpefFirstAcconto.toLocaleString()}</div>
                          <div className="text-sm text-green-700">I Acconto - 16 Giugno 2026</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">€{results.planning2026.irpefSecondAcconto.toLocaleString()}</div>
                          <div className="text-sm text-green-700">II Acconto - 30 Novembre 2026</div>
                        </div>
                      </div>
                    </div>

                    {/* Totale annuo 2026 */}
                    <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 text-center">
                      <div className="text-2xl font-bold text-blue-600">€{results.planning2026.totalDue.toLocaleString()}</div>
                      <div className="text-sm text-blue-700">Totale Imposte e Contributi Previsti 2026</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Liquidity Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PiggyBank className="mr-2 h-5 w-5" />
                  Analisi Liquidità e Scadenze 2025
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <div className="text-lg font-bold text-blue-600">
                        €{results.paymentSchedule
                          .filter(p => p.deficit > 0)
                          .reduce((sum, p) => sum + p.deficit, 0)
                          .toLocaleString()}
                      </div>
                      <div className="text-sm text-blue-700">Deficit Totale</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <div className="text-lg font-bold text-green-600">
                        {results.paymentSchedule.filter(p => p.deficit > 0).length}
                      </div>
                      <div className="text-sm text-green-700">Scadenze Critiche</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg text-center">
                      <div className="text-lg font-bold text-orange-600">
                        €{Math.max(...results.paymentSchedule.map(p => p.requiredPayment)).toLocaleString()}
                      </div>
                      <div className="text-sm text-orange-700">Pagamento Max Richiesto</div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Legenda Movimenti:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span>Versamenti mensili</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <span>Liquidazioni IVA</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                        <span>Acconti/Saldi IRPEF</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                        <span>Contributi INPS</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Schedule Table */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Scadenziere con Liquidità Progressiva</h4>
                    <div className="text-sm text-gray-600 mb-4">
                      Piano completo dal 02/06/2025 in poi - Solo scadenze future (Saldo Attuale: €{results.paymentSchedule[0]?.previousBalance.toLocaleString() || '0'})
                    </div>
                    
                    {results.paymentSchedule && results.paymentSchedule.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                          <thead>
                            <tr className="bg-gray-50 border-b">
                              <th className="text-left p-3 font-medium text-gray-900">Data</th>
                              <th className="text-left p-3 font-medium text-gray-900">Scadenza</th>
                              <th className="text-right p-3 font-medium text-gray-900">Importo</th>
                              <th className="text-right p-3 font-medium text-gray-900">Saldo Prima</th>
                              <th className="text-right p-3 font-medium text-gray-900">Versamento</th>
                              <th className="text-right p-3 font-medium text-gray-900">Saldo Dopo</th>
                              <th className="text-center p-3 font-medium text-gray-900">Stato</th>
                            </tr>
                          </thead>
                          <tbody>
                            {results.paymentSchedule.map((event, index) => {
                              const isPayment = !event.isIncome;
                              const hasDeficit = event.deficit > 0;
                              
                              // Color based on category
                              let dotColor = 'bg-gray-400';
                              if (event.category === 'ACCUMULO') dotColor = 'bg-green-500';
                              else if (event.category === 'IVA') dotColor = 'bg-blue-500';
                              else if (event.category === 'IRPEF') dotColor = 'bg-purple-500';
                              else if (event.category === 'CONTRIBUTI') dotColor = 'bg-orange-500';
                              
                              return (
                                <tr key={index} className={`border-b hover:bg-gray-50 ${hasDeficit ? 'bg-red-50' : ''}`}>
                                  <td className="p-3 text-sm">{event.date}</td>
                                  <td className="p-3 text-sm">
                                    <div className="flex items-center">
                                      <div className={`w-2 h-2 rounded-full mr-2 ${dotColor}`}></div>
                                      <div>
                                        <div className="font-medium">{event.type}</div>
                                        <div className="text-xs text-gray-500">{event.description}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className={`p-3 text-sm text-right font-medium ${
                                    isPayment ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {isPayment ? '-' : '+'}€{event.amount.toLocaleString()}
                                  </td>
                                  <td className="p-3 text-sm text-right">
                                    €{event.previousBalance.toLocaleString()}
                                  </td>
                                  <td className="p-3 text-sm text-right">
                                    {hasDeficit ? (
                                      <span className="text-red-600 font-medium">
                                        €{event.requiredPayment.toLocaleString()}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-sm text-right font-medium">
                                    €{event.newBalance.toLocaleString()}
                                  </td>
                                  <td className="p-3 text-center">
                                    {hasDeficit ? (
                                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                        ATTENZIONE
                                      </span>
                                    ) : event.isIncome ? (
                                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                        Versamento
                                      </span>
                                    ) : (
                                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                        OK
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-lg mb-2">📊 Scadenziere non disponibile</div>
                        <div className="text-sm mb-4">
                          Per generare l'analisi liquidità completa, assicurati di aver compilato:
                        </div>
                        <div className="text-left max-w-md mx-auto space-y-2 text-sm">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                            <span>Ricavi annuali previsti</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span>Spese documentate</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                            <span>Saldo conto corrente attuale</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                            <span>Regime contributivo</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Piano di Accantonamento Mensile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="mr-2 h-5 w-5 text-blue-600" />
                  Piano di Accantonamento Mensile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 mb-4">
                  Scegli il tipo di accantonamento per ottimizzare la gestione della liquidità aziendale
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center mb-3">
                      <Calculator className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="font-medium text-blue-900">Accantonamento Standard</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Importo mensile:</span>
                        <span className="font-bold text-blue-600">€{results.monthlyAccrual.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Accumulo annuale:</span>
                        <span className="font-medium">€{(results.monthlyAccrual * 12).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Copertura imposte:</span>
                        <span className="font-medium text-green-600">100%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="flex items-center mb-3">
                      <TrendingUp className="h-5 w-5 text-orange-600 mr-2" />
                      <span className="font-medium text-orange-900">Con Margine Sicurezza (10%)</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Importo mensile:</span>
                        <span className="font-bold text-orange-600">€{Math.round(results.monthlyAccrual * 1.1).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Margine extra:</span>
                        <span className="font-medium">+€{Math.round(results.monthlyAccrual * 0.1).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Copertura imposte:</span>
                        <span className="font-medium text-green-600">110%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scadenze Fiscali 2025 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  📅 Scadenze Fiscali 2025
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center text-yellow-800">
                    <span className="text-sm font-medium">⚠️ Nota importante:</span>
                  </div>
                  <div className="text-sm text-yellow-700 mt-1">
                    Le scadenze IRPEF/IRAP 2025 si basano sull'imposta 2024 (saldi + acconti calcolati su imposta 2024). 
                    Gli importi mostrati sono una stima basata sulla proiezione 2025.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Scadenze 30 Giugno */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-red-800">30 Giugno 2025</span>
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">28 giorni</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>• IRPEF Saldo:</span>
                        <span className="font-medium">€{Math.round(results.irpefNetAmount * 0.4).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• IRPEF 1° Acconto:</span>
                        <span className="font-medium">€{results.irpefFirstAcconto.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• IRAP Saldo:</span>
                        <span className="font-medium">€{Math.round(results.regionalSurcharge * 0.5).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• IRAP 1° Acconto:</span>
                        <span className="font-medium">€{Math.round(results.regionalSurcharge * 0.4).toLocaleString()}</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between font-semibold">
                        <span>Totale:</span>
                        <span>€{Math.round(results.irpefNetAmount * 0.4 + results.irpefFirstAcconto + results.regionalSurcharge * 0.9).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Scadenze 30 Novembre */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-green-800">30 Novembre 2025</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">181 giorni</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>• IRPEF 2° Acconto:</span>
                        <span className="font-medium">€{results.irpefSecondAcconto.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• IRAP 2° Acconto:</span>
                        <span className="font-medium">€{Math.round(results.regionalSurcharge * 0.6).toLocaleString()}</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between font-semibold">
                        <span>Totale:</span>
                        <span>€{Math.round(results.irpefSecondAcconto + results.regionalSurcharge * 0.6).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scadenze IVA 2026 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  📅 Scadenze IVA 2026
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">⏰ Scaduto</span>
                    </div>
                    <div className="text-sm font-medium">IVA Q1 2025</div>
                    <div className="text-lg font-bold text-red-600">16/04/2025</div>
                    <div className="text-sm text-gray-600">€{Math.round(results.vatAmount / 4).toLocaleString()}</div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">⚠️ 44 giorni</span>
                    </div>
                    <div className="text-sm font-medium">IVA Q2 2025</div>
                    <div className="text-lg font-bold text-yellow-600">16/07/2025</div>
                    <div className="text-sm text-gray-600">€{Math.round(results.vatAmount / 4).toLocaleString()}</div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">✅ 136 giorni</span>
                    </div>
                    <div className="text-sm font-medium">IVA Q3 2025</div>
                    <div className="text-lg font-bold text-green-600">16/10/2025</div>
                    <div className="text-sm text-gray-600">€{Math.round(results.vatAmount / 4).toLocaleString()}</div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">✅ 228 giorni</span>
                    </div>
                    <div className="text-sm font-medium">IVA Q4 2025</div>
                    <div className="text-lg font-bold text-green-600">16/01/2026</div>
                    <div className="text-sm text-gray-600">€{Math.round(results.vatAmount / 4).toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}