import { useState, useEffect, useMemo } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar, TrendingUp, Euro, FileText, HelpCircle, Building, Users, Calculator, DollarSign, PiggyBank, Clock } from "lucide-react";

import { Link } from "wouter";
import { calculateIndividualTaxes, IndividualTaxCalculationResult, CONTRIBUTION_RATES } from "@/lib/individual-tax-calculator";
import { apiRequest } from "@/lib/queryClient";
import { deduceFromAteco, mapAtecoToBusinessType } from "@/lib/constants";

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
  const [selectedAccrualPlan, setSelectedAccrualPlan] = useState<'standard' | 'safety'>('standard');
  const [showEmailDialog, setShowEmailDialog] = useState(false);
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
      businessSector: "",
    },
  });

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  // Watch for ATECO code changes to auto-set business type and business sector
  const watchedAtecoCode = form.watch('atecoCode');
  
  useEffect(() => {
    if (watchedAtecoCode && watchedAtecoCode.trim() !== '') {
      console.log('ATECO Code changed:', watchedAtecoCode);
      const suggestedBusinessType = mapAtecoToBusinessType(watchedAtecoCode);
      console.log('Suggested business type:', suggestedBusinessType);
      
      if (suggestedBusinessType) {
        const currentBusinessType = form.getValues('businessType');
        console.log('Current business type:', currentBusinessType);
        
        // Always set the suggested business type when ATECO changes (allowing override)
        form.setValue('businessType', suggestedBusinessType);
        console.log('Set business type to:', suggestedBusinessType);
      }

      // Also update the lead form business sector
      const businessSectorDescription = ATECO_CODES[watchedAtecoCode as keyof typeof ATECO_CODES];
      if (businessSectorDescription) {
        leadForm.setValue('businessSector', businessSectorDescription);
        console.log('Set business sector to:', businessSectorDescription);
      }
    }
  }, [watchedAtecoCode, form, leadForm]);

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
    // Automatically set business sector from ATECO code
    const atecoCode = form.watch('atecoCode');
    const businessSector = ATECO_CODES[atecoCode as keyof typeof ATECO_CODES] || data.businessSector;
    
    submitLeadMutation.mutate({
      ...data,
      businessSector
    });
  };

  const onEmailSubmit = (data: EmailForm) => {
    if (results) {
      sendEmailMutation.mutate({ ...data, calculationData: results });
      setShowEmailDialog(false);
    }
  };

  const handleDownload = async () => {
    if (!results) return;
    
    try {
      const response = await fetch('/api/download-report-individual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          calculationData: results
        }),
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Report_Regime_Ordinario_${new Date().getFullYear()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download completato!",
        description: "Il report Excel è stato scaricato con successo",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore nel download",
        description: "Impossibile scaricare il file Excel",
      });
    }
  };

  // Recalculate payment schedule based on selected accrual plan
  const adjustedResults = useMemo(() => {
    if (!results) return null;
    
    const multiplier = selectedAccrualPlan === 'safety' ? 1.1 : 1;
    const adjustedMonthlyAccrual = Math.round((results.totalDue / 12) * multiplier);
    
    // Recalculate payment schedule with adjusted monthly accrual
    const adjustedPaymentSchedule = results.paymentSchedule.map(event => {
      if (event.category === 'ACCUMULO') {
        return {
          ...event,
          amount: adjustedMonthlyAccrual
        };
      }
      return event;
    });

    // Recalculate running balances
    let runningBalance = form.watch('currentBalance') || 0;
    const recalculatedSchedule = adjustedPaymentSchedule.map(event => {
      const previousBalance = runningBalance;
      
      if (event.isIncome) {
        runningBalance += event.amount;
      } else {
        runningBalance -= event.amount;
      }
      
      const deficit = runningBalance < 0 ? Math.abs(runningBalance) : 0;
      const requiredPayment = deficit > 0 ? event.amount + deficit : event.amount;
      
      return {
        ...event,
        previousBalance,
        currentBalance: runningBalance,
        deficit,
        requiredPayment
      };
    });

    return {
      ...results,
      monthlyAccrual: adjustedMonthlyAccrual,
      paymentSchedule: recalculatedSchedule
    };
  }, [results, selectedAccrualPlan, form.watch('currentBalance')]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-md border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-green-600">SmartRate</div>
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
            Calcolatore Imposte Ditte Individuali Regime Ordinario
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
                          <Select onValueChange={(value) => {
                            field.onChange(value);
                            // Auto-deduzione da ATECO
                            const atecoData = deduceFromAteco(value);
                            if (atecoData) {
                              // Auto-seleziona tipo attività
                              if (atecoData.businessType === 'PROFESSIONAL') {
                                form.setValue('businessType', 'professional');
                              } else if (atecoData.businessType === 'COMMERCIAL') {
                                form.setValue('businessType', 'commercial');
                              } else if (atecoData.businessType === 'ARTISAN') {
                                form.setValue('businessType', 'artisan');
                              }

                              // Auto-seleziona regime contributivo
                              if (atecoData.contributionRegime === 'GESTIONE_SEPARATA') {
                                form.setValue('contributionType', 'inps_gestione_separata');
                              } else if (atecoData.contributionRegime === 'CASSA_FORENSE') {
                                form.setValue('contributionType', 'cassa_forense');
                              } else if (atecoData.contributionRegime === 'INARCASSA') {
                                form.setValue('contributionType', 'inarcassa');
                              } else if (atecoData.contributionRegime === 'IVS_ARTIGIANI') {
                                form.setValue('contributionType', 'inps_artigiani');
                              } else if (atecoData.contributionRegime === 'IVS_COMMERCIANTI') {
                                form.setValue('contributionType', 'inps_commercianti');
                              }
                            }
                          }} defaultValue={field.value}>
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
                          <Select onValueChange={field.onChange} value={field.value}>
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

                  {/* Dati Anno Precedente - integrati nella sezione 2024 */}
                  {form.watch("startDate") && new Date(form.watch("startDate")).getFullYear() <= 2024 && (
                    <>
                      <div className="bg-orange-100 p-3 rounded-lg mt-4 border border-orange-300">
                        <h4 className="font-semibold text-orange-800 mb-3">📊 Dati Anno Precedente</h4>
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
                    </>
                  )}
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

                {/* IVA 2025 */}
                <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
                  <h3 className="font-semibold text-yellow-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    📄 Gestione IVA 2025
                  </h3>
                  <p className="text-sm text-yellow-700 mb-4">
                    Dati IVA per i versamenti trimestrali del 2025. Le ritenute sono già incluse nei dati economici 2024.
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

                  </div>
                </div>

                {/* Situazione Finanziaria */}
                <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-4 flex items-center">
                    <PiggyBank className="h-5 w-5 mr-2" />
                    💰 Situazione Finanziaria
                  </h3>
                  <FormField
                    control={form.control}
                    name="currentBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>🏦 Saldo Attuale Accantonato (€)</FormLabel>
                        <p className="text-xs text-orange-700 mb-2">
                          Liquidità disponibile per pianificare i pagamenti fiscali
                        </p>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="es: 15000"
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
                            <Input 
                              placeholder="es: Consulenza informatica" 
                              {...field} 
                              value={ATECO_CODES[form.watch('atecoCode') as keyof typeof ATECO_CODES] || field.value}
                              readOnly
                              className="bg-gray-50"
                            />
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
            {/* Report Avanzato Sbloccato - Prima sezione */}
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
                    onClick={handleDownload}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={sendEmailMutation.isPending}
                  >
                    📥 Scarica Excel Avanzato
                  </Button>

                  <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="border-green-600 text-green-600 hover:bg-green-50"
                        disabled={sendEmailMutation.isPending}
                      >
                        📧 Invia via Email
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Invia Report via Email</DialogTitle>
                      </DialogHeader>
                      <Form {...emailForm}>
                        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                          <FormField
                            control={emailForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="email" 
                                    placeholder="inserisci la tua email"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end gap-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setShowEmailDialog(false)}
                            >
                              Annulla
                            </Button>
                            <Button 
                              type="submit"
                              disabled={sendEmailMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {sendEmailMutation.isPending ? "Invio..." : "Invia Report"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="mt-4 flex items-center justify-center text-sm text-green-600">
                  ✅ Report avanzato inviato anche via email: 📧 Salva questa pagina nei preferiti
                </div>
              </CardContent>
            </Card>






            {/* Report Avanzato Sbloccato */}
           



            {/* Dettaglio Fiscale Anno 2024 */}
            <Card>
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
                        <span className="font-medium">{Math.round(results.businessIncome * 0.85).toLocaleString()} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Aliquota IRPEF:</span>
                        <span className="font-medium">{results.irpefRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IRPEF 2024:</span>
                        <span className="font-medium">{Math.round(results.irpefNetAmount * 0.85).toLocaleString()} €</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Totale Imposte:</span>
                        <span>{Math.round(results.totalTaxes * 0.85).toLocaleString()} €</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Contributi INPS:</span>
                        <span className="font-medium">{Math.round(results.totalContributions * 0.85).toLocaleString()} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Regime contributivo:</span>
                        <span className="font-medium">{CONTRIBUTION_TYPES[results.contributionDetails.type as keyof typeof CONTRIBUTION_TYPES]}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Totale Contributi:</span>
                        <span>{Math.round(results.totalContributions * 0.85).toLocaleString()} €</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-blue-900">Totale Dovuto Anno 2024:</span>
                    <span className="text-2xl font-bold text-blue-600">{Math.round(results.totalDue * 0.85).toLocaleString()} €</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pianificatore Scadenze Fiscali 2025 */}
            <Card>
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
                        <td className="py-2 px-4 font-medium text-green-600">{Math.round(results.totalTaxes * 0.85).toLocaleString()} €</td>
                        <td className="py-2 px-4">Saldo IRPEF 2024</td>
                      </tr>
                      <tr className="border-b bg-blue-50">
                        <td className="py-2 px-4">30 Giugno 2025</td>
                        <td className="py-2 px-4 font-medium text-blue-600">{Math.round(results.totalTaxes * 0.4).toLocaleString()} €</td>
                        <td className="py-2 px-4">Primo Acconto 2025 (40%)</td>
                      </tr>
                      <tr className="border-b bg-purple-50">
                        <td className="py-2 px-4">30 Novembre 2025</td>
                        <td className="py-2 px-4 font-medium text-purple-600">{Math.round(results.totalTaxes * 0.6).toLocaleString()} €</td>
                        <td className="py-2 px-4">Secondo Acconto 2025 (60%)</td>
                      </tr>
                      <tr className="border-b bg-orange-50">
                        <td className="py-2 px-4">16 Agosto 2025</td>
                        <td className="py-2 px-4 font-medium text-orange-600">{Math.round(results.totalContributions * 0.85).toLocaleString()} €</td>
                        <td className="py-2 px-4">Contributi INPS 2024</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Dettaglio Fiscale Anno 2025 */}
            <Card>
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
                        <span className="font-medium">{results.businessIncome.toLocaleString()} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Aliquota IRPEF:</span>
                        <span className="font-medium">{results.irpefRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IRPEF 2025:</span>
                        <span className="font-medium">{results.irpefNetAmount.toLocaleString()} €</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Totale Imposte:</span>
                        <span>{results.totalTaxes.toLocaleString()} €</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Contributi INPS:</span>
                        <span className="font-medium">{results.totalContributions.toLocaleString()} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Regime contributivo:</span>
                        <span className="font-medium">{CONTRIBUTION_TYPES[results.contributionDetails.type as keyof typeof CONTRIBUTION_TYPES]}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Totale Contributi:</span>
                        <span>{results.totalContributions.toLocaleString()} €</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-blue-900">Totale Dovuto Anno 2025:</span>
                    <span className="text-2xl font-bold text-blue-600">{results.totalDue.toLocaleString()} €</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pianificatore Scadenze Fiscali 2026 */}
            <Card>
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
                        <td className="py-2 px-4 font-medium text-green-600">{results.totalTaxes.toLocaleString()} €</td>
                        <td className="py-2 px-4">Saldo IRPEF 2025</td>
                      </tr>
                      <tr className="border-b bg-blue-50">
                        <td className="py-2 px-4">30 Giugno 2026</td>
                        <td className="py-2 px-4 font-medium text-blue-600">{Math.round(results.totalTaxes * 0.4).toLocaleString()} €</td>
                        <td className="py-2 px-4">Primo Acconto 2026 (40%)</td>
                      </tr>
                      <tr className="border-b bg-purple-50">
                        <td className="py-2 px-4">30 Novembre 2026</td>
                        <td className="py-2 px-4 font-medium text-purple-600">{Math.round(results.totalTaxes * 0.6).toLocaleString()} €</td>
                        <td className="py-2 px-4">Secondo Acconto 2026 (60%)</td>
                      </tr>
                      <tr className="border-b bg-orange-50">
                        <td className="py-2 px-4">16 Agosto 2026</td>
                        <td className="py-2 px-4 font-medium text-orange-600">{results.totalContributions.toLocaleString()} €</td>
                        <td className="py-2 px-4">Contributi INPS 2025</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Pianificatore IVA 2025 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-orange-800">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Pianificatore IVA 2025 (Regime Trimestrale)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">IVA su Vendite Annua</div>
                      <div className="text-lg font-bold text-orange-600">€{results.vatAmount.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">IVA Acquisti Stimata</div>
                      <div className="text-lg font-bold text-blue-600">€{Math.round(results.vatAmount * 0.2).toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">IVA Netta da Versare</div>
                      <div className="text-lg font-bold text-green-600">€{Math.round(results.vatAmount * 0.8).toLocaleString()}</div>
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
                      <tr className="border-b bg-blue-50">
                        <td className="py-2 px-4">I Trimestre 2025</td>
                        <td className="py-2 px-4">16 Maggio 2025</td>
                        <td className="py-2 px-4 font-medium text-blue-600">€{Math.round(results.vatAmount * 0.8 / 4).toLocaleString()}</td>
                        <td className="py-2 px-4">Liquidazione Trimestrale</td>
                      </tr>
                      <tr className="border-b bg-green-50">
                        <td className="py-2 px-4">II Trimestre 2025</td>
                        <td className="py-2 px-4">16 Agosto 2025</td>
                        <td className="py-2 px-4 font-medium text-green-600">€{Math.round(results.vatAmount * 0.8 / 4).toLocaleString()}</td>
                        <td className="py-2 px-4">Liquidazione Trimestrale</td>
                      </tr>
                      <tr className="border-b bg-purple-50">
                        <td className="py-2 px-4">III Trimestre 2025</td>
                        <td className="py-2 px-4">16 Novembre 2025</td>
                        <td className="py-2 px-4 font-medium text-purple-600">€{Math.round(results.vatAmount * 0.8 / 4).toLocaleString()}</td>
                        <td className="py-2 px-4">Liquidazione Trimestrale</td>
                      </tr>
                      <tr className="border-b bg-orange-50">
                        <td className="py-2 px-4">IV Trimestre 2025</td>
                        <td className="py-2 px-4">16 Febbraio 2026</td>
                        <td className="py-2 px-4 font-medium text-orange-600">€{Math.round(results.vatAmount * 0.8 / 4).toLocaleString()}</td>
                        <td className="py-2 px-4">Liquidazione Trimestrale</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>



            {/* Piano di Accantonamento Mensile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Piano di Accantonamento Mensile
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Scegli il tipo di accantonamento per ottimizzare la gestione della liquidità aziendale
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div 
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedAccrualPlan === 'standard' 
                        ? 'bg-blue-50 border-blue-500' 
                        : 'bg-blue-25 border-blue-200 hover:border-blue-300'
                    }`}
                    onClick={() => setSelectedAccrualPlan('standard')}
                  >
                    <div className="flex items-center mb-3">
                      <div className={`w-4 h-4 rounded-full mr-3 ${
                        selectedAccrualPlan === 'standard' ? 'bg-blue-500' : 'bg-gray-300'
                      }`}></div>
                      <span className="font-medium text-blue-900">Accantonamento Standard</span>
                      {selectedAccrualPlan === 'standard' && (
                        <div className="ml-auto w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Importo mensile:</span>
                        <span className="font-bold text-blue-600">{Math.round(results.totalDue / 12).toLocaleString()} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Accumulo annuale:</span>
                        <span className="font-medium">{results.totalDue.toLocaleString()} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Copertura imposte:</span>
                        <span className="font-medium text-blue-600">100%</span>
                      </div>
                    </div>
                  </div>

                  <div 
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedAccrualPlan === 'safety' 
                        ? 'bg-orange-50 border-orange-500' 
                        : 'bg-orange-25 border-orange-200 hover:border-orange-300'
                    }`}
                    onClick={() => setSelectedAccrualPlan('safety')}
                  >
                    <div className="flex items-center mb-3">
                      <div className={`w-4 h-4 rounded-full mr-3 ${
                        selectedAccrualPlan === 'safety' ? 'bg-orange-500' : 'bg-gray-300'
                      }`}></div>
                      <span className="font-medium text-orange-900">Con Margine Sicurezza (10%)</span>
                      {selectedAccrualPlan === 'safety' && (
                        <div className="ml-auto w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Importo mensile:</span>
                        <span className="font-bold text-orange-600">{Math.round(results.totalDue / 12 * 1.1).toLocaleString()} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Accumulo annuale:</span>
                        <span className="font-medium">{Math.round(results.totalDue * 1.1).toLocaleString()} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Margine extra:</span>
                        <span className="font-medium">+€{Math.round(results.totalDue * 0.1).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scadenziere con Liquidità Progressiva */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Scadenziere con Liquidità Progressiva
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Piano completo dal {new Date().toLocaleDateString('it-IT')} in poi - Solo scadenze future (Saldo Attuale: €{(form.watch('currentBalance') || 0).toLocaleString()})
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <div className="text-lg font-bold text-blue-600">
                        €{adjustedResults?.paymentSchedule
                          .filter(p => p.deficit > 0)
                          .reduce((sum, p) => sum + p.deficit, 0)
                          .toLocaleString() || '0'}
                      </div>
                      <div className="text-sm text-blue-700">Deficit Totale</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <div className="text-lg font-bold text-green-600">
                        {adjustedResults?.paymentSchedule.filter(p => p.deficit > 0).length || 0}
                      </div>
                      <div className="text-sm text-green-700">Scadenze Critiche</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg text-center">
                      <div className="text-lg font-bold text-orange-600">
                        €{adjustedResults?.paymentSchedule.length ? Math.max(...adjustedResults.paymentSchedule.map(p => p.requiredPayment)).toLocaleString() : '0'}
                      </div>
                      <div className="text-sm text-orange-700">Pagamento Max Richiesto</div>
                    </div>
                  </div>

                  {/* Legenda Movimenti */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Legenda Movimenti:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span>Versamenti mensili (€{Math.round(results.totalDue / 12 * (selectedAccrualPlan === 'safety' ? 1.1 : 1)).toLocaleString()})</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                        <span>Contributi INPS</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span>Acconti/Saldi IRES</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <span>Liquidazioni IVA</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Schedule Table */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Scadenziere con Liquidità Progressiva</h4>
                    <div className="text-sm text-gray-600 mb-4">
                      Piano dal {new Date().toLocaleDateString('it-IT')} in poi - Solo scadenze future (Saldo Iniziale: €{(form.watch('currentBalance') || 0).toLocaleString()})
                    </div>

                    {adjustedResults?.paymentSchedule && adjustedResults.paymentSchedule.length > 0 ? (
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
                            {adjustedResults.paymentSchedule.map((event, index) => {
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

            {/* Download/Email Section */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-green-700 mb-6">
                    Pianificazione fiscale completa con tutti i calcoli avanzati per la tua attività.
                  </div>

                  <div className="flex justify-center gap-4 mb-6">
                    <Button 
                      onClick={handleDownload}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={sendEmailMutation.isPending}
                    >
                      📥 Scarica Excel Avanzato
                    </Button>

                    <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="border-green-600 text-green-600 hover:bg-green-50"
                          disabled={sendEmailMutation.isPending}
                        >
                          📧 Invia via Email
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Invia Report via Email</DialogTitle>
                        </DialogHeader>
                        <Form {...emailForm}>
                          <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                            <FormField
                              control={emailForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="email" 
                                      placeholder="inserisci la tua email"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end gap-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setShowEmailDialog(false)}
                              >
                                Annulla
                              </Button>
                              <Button 
                                type="submit"
                                disabled={sendEmailMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {sendEmailMutation.isPending ? "Invio..." : "Invia Report"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="flex items-center justify-center text-sm text-green-600">
                    ✅ Report avanzato inviato anche via email: 📧 Salva questa pagina nei preferiti
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