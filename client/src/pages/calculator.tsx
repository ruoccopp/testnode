
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calculator, Building, Euro, Calendar, Download, Lock, Mail, User, Briefcase } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import * as XLSX from 'xlsx';
import logoPath from "@assets/SmartRate - Colors.png";
import { Link } from "wouter";

const calculationSchema = z.object({
  revenue: z.number().min(0, "Il fatturato deve essere positivo").optional(),
  revenue2025: z.number().min(0, "Il fatturato presunto deve essere positivo").optional(),
  category: z.string().min(1, "Seleziona una categoria"),
  startDate: z.string().min(1, "Inserisci la data di inizio attività"),
  isStartup: z.boolean().default(false),
  contributionRegime: z.string().min(1, "Seleziona il regime contributivo"),
  contributionReduction: z.string().default("NONE"),
  hasOtherCoverage: z.boolean().default(false),
  currentBalance: z.number().min(0, "Il saldo deve essere positivo").optional(),
});

const leadSchema = z.object({
  firstName: z.string().min(2, "Nome deve avere almeno 2 caratteri"),
  lastName: z.string().min(2, "Cognome deve avere almeno 2 caratteri"),
  email: z.string().email("Email non valida"),
});

const emailSchema = z.object({
  email: z.string().email("Email non valida"),
});

type CalculationForm = z.infer<typeof calculationSchema>;
type LeadForm = z.infer<typeof leadSchema>;
type EmailForm = z.infer<typeof emailSchema>;

interface CalculationResult {
  taxableIncome: number;
  taxAmount: number;
  inpsAmount: number;
  totalDue: number;
}

// Importiamo le categorie dal file constants
import { TAX_COEFFICIENTS, SECTORS } from "@/lib/constants";

const BUSINESS_SECTORS = {
  RETAIL: "Commercio al dettaglio",
  WHOLESALE: "Commercio all'ingrosso",
  SERVICES: "Servizi",
  PROFESSIONAL: "Servizi professionali",
  MANUFACTURING: "Produzione",
  CONSTRUCTION: "Edilizia",
  TRANSPORT: "Trasporti",
  HOSPITALITY: "Ristorazione/Ospitalità",
  TECHNOLOGY: "Tecnologia/IT",
  HEALTHCARE: "Sanità/Benessere",
  EDUCATION: "Istruzione/Formazione",
  AGRICULTURE: "Agricoltura",
  REAL_ESTATE: "Immobiliare",
  FINANCE: "Finanza/Assicurazioni",
  OTHER: "Altro"
};

export default function CalculatorPage() {
  const [results, setResults] = useState<CalculationResult | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [emailValidated, setEmailValidated] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const { toast } = useToast();

  const form = useForm<CalculationForm>({
    resolver: zodResolver(calculationSchema),
    defaultValues: {
      revenue: undefined,
      revenue2025: undefined,
      category: "",
      startDate: "",
      isStartup: false,
      contributionRegime: "",
      contributionReduction: "NONE",
      currentBalance: undefined,
    },
  });

  const leadForm = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
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
      const response = await apiRequest('POST', '/api/calculations/tax', {
        businessId: 1,
        revenue: data.revenue,
        macroCategory: data.category,
        isStartup: data.isStartup,
        startDate: data.startDate,
        contributionRegime: data.contributionRegime,
        contributionReduction: data.contributionReduction,
        hasOtherCoverage: false,
        year: 2024,
      });
      return response.json();
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

  const sendVerificationMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('POST', '/api/send-verification', {
        email: email
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      console.log('Codice ricevuto dal server:', data.code);
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

  const sendEmailMutation = useMutation({
    mutationFn: async (data: EmailForm & { calculationData: CalculationResult }) => {
      const response = await apiRequest('POST', '/api/send-report', {
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

  const submitLeadMutation = useMutation({
    mutationFn: async (data: LeadForm & { calculationData: CalculationForm }) => {
      const response = await apiRequest('POST', '/api/leads/submit', data);
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

  const onSubmit = (data: CalculationForm) => {
    calculateMutation.mutate(data);
  };

  const handleEmailVerification = () => {
    if (verificationCode === sentCode) {
      setEmailValidated(true);
      setIsUnlocked(true); // Sblocca il report completo
      
      // Salva automaticamente il lead nel database
      const formData = leadForm.getValues();
      if (formData.firstName && formData.lastName && formData.email) {
        const selectedCategory = TAX_COEFFICIENTS[form.getValues().category as keyof typeof TAX_COEFFICIENTS];
        const leadData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          businessSector: selectedCategory?.sector || 'OTHER',
          calculationData: form.getValues(),
        };
        
        submitLeadMutation.mutate(leadData);
      }
      
      toast({
        title: "Email verificata con successo!",
        description: "I tuoi dati sono stati salvati e il report completo è disponibile",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Codice errato",
        description: "Il codice inserito non è corretto",
      });
    }
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

  const exportToExcel = () => {
    if (!results || !isUnlocked) return;

    const currentBalance = form.watch('currentBalance') || 0;
    const revenue2025 = form.watch('revenue2025') || form.watch('revenue') || 0;
    const formData = form.getValues();
    
    // Calcolo scadenze 2025
    const giugno2025 = results.taxAmount + (results.taxAmount * 0.40);
    const novembre2025 = results.taxAmount * 0.60;
    
    // Calcolo tasse 2026 (se c'è fatturato 2025)
    let taxAmount2026 = 0;
    if (revenue2025 > 0) {
      const selectedCategory = TAX_COEFFICIENTS[formData.category as keyof typeof TAX_COEFFICIENTS];
      const coefficient = selectedCategory?.value || 0.78;
      const taxableIncome2025 = revenue2025 * coefficient;
      const taxRate = formData.isStartup ? 0.05 : 0.15;
      taxAmount2026 = taxableIncome2025 * taxRate;
    }
    
    const giugno2026 = taxAmount2026 + (taxAmount2026 * 0.40);

    // Creazione dei dati per Excel
    const worksheetData = [
      // Intestazione
      ['PIANIFICATORE IMPOSTE FORFETTARI - REPORT COMPLETO'],
      ['Data:', new Date().toLocaleDateString('it-IT')],
      [''],
      
      // Dati dell'attività
      ['DATI ATTIVITA\''],
      ['Fatturato 2024:', formData.revenue || 0],
      ['Fatturato Presunto 2025:', revenue2025],
      ['Categoria:', TAX_COEFFICIENTS[formData.category as keyof typeof TAX_COEFFICIENTS]?.label || ''],
      ['Data Inizio Attività:', formData.startDate],
      ['Regime Startup:', formData.isStartup ? 'Sì' : 'No'],
      ['Regime Contributivo:', formData.contributionRegime],
      ['Riduzione Contributiva:', formData.contributionReduction],
      ['Saldo Accantonato:', currentBalance],
      [''],
      
      // Calcoli fiscali
      ['CALCOLI FISCALI 2024'],
      ['Reddito Imponibile:', results.taxableIncome],
      ['Imposta Sostitutiva:', results.taxAmount],
      ['Contributi INPS:', results.inpsAmount],
      ['Totale Dovuto:', results.totalDue],
      [''],
      
      // Scadenze
      ['SCADENZE FISCALI'],
      ['30 Giugno 2025 - Saldo 2024:', results.taxAmount],
      ['30 Giugno 2025 - 1° Acconto 2025:', results.taxAmount * 0.40],
      ['30 Giugno 2025 - TOTALE:', giugno2025],
      ['30 Novembre 2025 - 2° Acconto:', novembre2025],
      [''],
      
      // Scadenze 2026 (se applicabile)
      ...(revenue2025 > 0 ? [
        ['SCADENZE 2026'],
        ['Reddito Imponibile 2025:', revenue2025 * (TAX_COEFFICIENTS[formData.category as keyof typeof TAX_COEFFICIENTS]?.value || 0.78)],
        ['Imposta Sostitutiva 2025:', taxAmount2026],
        ['30 Giugno 2026 - Saldo 2025:', taxAmount2026],
        ['30 Giugno 2026 - 1° Acconto 2026:', taxAmount2026 * 0.40],
        ['30 Giugno 2026 - TOTALE:', giugno2026],
        ['']
      ] : []),
      
      // Piano accantonamento
      ['PIANO ACCANTONAMENTO'],
      ['Accantonamento Mensile Totale:', results.totalDue / 12],
      ['Solo Imposte (mensile):', results.taxAmount / 12],
      ['Solo INPS (mensile):', results.inpsAmount / 12],
      ['% su Fatturato Mensile:', ((results.totalDue / ((formData.revenue || 1) / 12)) * 100).toFixed(1) + '%'],
      [''],
      
      // Contributi INPS trimestrali
      ['CONTRIBUTI INPS TRIMESTRALI'],
      ['Importo per trimestre:', results.inpsAmount / 4],
      ['Scadenza 1° trimestre:', '16 Maggio'],
      ['Scadenza 2° trimestre:', '20 Agosto'], 
      ['Scadenza 3° trimestre:', '16 Novembre'],
      ['Scadenza 4° trimestre:', '16 Febbraio (anno successivo)'],
    ];

    // Creazione del workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Formattazione delle colonne
    ws['!cols'] = [
      { width: 35 },
      { width: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Report Imposte');
    
    // Download del file
    const fileName = `Report_Imposte_Forfettari_${new Date().getFullYear()}_${new Date().getMonth() + 1}_${new Date().getDate()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Report scaricato",
      description: `Il file ${fileName} è stato scaricato con successo`,
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold leading-tight text-gray-900">
              💰 Calcolatore Imposte Forfettari GRATUITO
            </h2>
            <div className="mt-2">
              <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
                Calcola imposte e contributi per il regime forfettario italiano - Risultati immediati
              </p>
              <span className="text-xs text-blue-600 font-medium">Powered by SmartRate</span>
            </div>
          </div>
          <div className="flex-shrink-0 mt-4 md:mt-0 md:ml-6 flex flex-col items-center md:items-end gap-2">
            <Link href="/leads">
              <Button variant="outline" size="sm" className="text-xs">
                🎯 Dashboard Lead
              </Button>
            </Link>
            <img 
              src={logoPath} 
              alt="SmartRate" 
              className="h-10 md:h-12 w-auto"
            />
          </div>
        </div>
      </div>

      {/* Calculator Form */}
      <Card className="mb-6 md:mb-8">
        <CardContent className="p-4 md:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
              {/* Fatturato */}
              <div className="bg-blue-50 p-3 md:p-4 rounded-lg mb-4 md:mb-6">
                <h3 className="font-medium text-blue-900 mb-3 md:mb-4 text-sm md:text-base">📊 Fatturato</h3>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="revenue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm md:text-base">💼 Fatturato 2024 (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="es: 50000"
                            className="text-base md:text-lg h-12 md:h-auto"
                            inputMode="numeric"
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
                    name="revenue2025"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>🔮 Fatturato Presunto 2025 (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="es: 60000"
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
              </div>

              {/* Categoria */}
              <div className="bg-amber-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-amber-900 mb-4">🏷️ Categoria di Attività</h3>
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>📋 Categoria Professionale</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        // Auto-selezione del regime contributivo basato sulla categoria
                        const selectedCategory = TAX_COEFFICIENTS[value as keyof typeof TAX_COEFFICIENTS];
                        if (selectedCategory) {
                          if (selectedCategory.sector === 'COMMERCIO') {
                            if (value === 'FOOD_COMMERCE' || value === 'STREET_COMMERCE' || value === 'OTHER_ACTIVITIES') {
                              form.setValue('contributionRegime', 'IVS_COMMERCIANTI');
                            }
                          } else if (selectedCategory.sector === 'ARTIGIANATO') {
                            form.setValue('contributionRegime', 'IVS_ARTIGIANI');
                          } else {
                            form.setValue('contributionRegime', 'GESTIONE_SEPARATA');
                          }
                        }
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona la tua categoria di attività" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Raggruppamento per settori con codici colore */}
                          {Object.entries(SECTORS).map(([sectorKey, sector]) => (
                            <div key={sectorKey}>
                              <div className={`px-3 py-2 text-sm font-semibold text-${sector.color}-700 bg-${sector.color}-50 border-b border-${sector.color}-200`}>
                                {sector.icon} {sector.label}
                              </div>
                              {Object.entries(TAX_COEFFICIENTS)
                                .filter(([, category]) => category.sector === sectorKey)
                                .map(([key, category]) => (
                                  <SelectItem key={key} value={key} className={`pl-6 border-l-2 border-${category.color}-300`}>
                                    <div className="flex flex-col items-start w-full">
                                      <span className="font-medium">{category.label}</span>
                                      <span className={`text-xs text-${category.color}-600 font-medium`}>
                                        ({(category.value * 100).toFixed(0)}%)
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              {/* Contributi INPS - Ora posizionato dopo la categoria */}
              {form.watch('category') && (
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <h3 className="font-medium text-blue-900 mb-4">🏛️ Contributi INPS</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="contributionRegime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>📋 Regime Contributivo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona regime contributivo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="IVS_ARTIGIANI">IVS Artigiani</SelectItem>
                              <SelectItem value="IVS_COMMERCIANTI">IVS Commercianti</SelectItem>
                              <SelectItem value="GESTIONE_SEPARATA">Gestione Separata</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contributionReduction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>💰 Riduzione Contributiva</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona riduzione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NONE">Nessuna riduzione</SelectItem>
                              <SelectItem value="35">35% - Forfettari generici</SelectItem>
                              <SelectItem value="50">50% - Nuovi iscritti 2025 (primi 36 mesi)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hasOtherCoverage"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">🏥 Altra Copertura Previdenziale</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Hai pensione o altro lavoro dipendente?
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
              )}

              {/* Regime Fiscale */}
              <div className="bg-orange-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-orange-900 mb-4">🎯 Regime Fiscale</h3>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>📅 Data di Inizio Attività</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isStartup"
                    render={({ field }) => {
                      const startDate = form.watch('startDate');
                      const isEligibleForStartup = startDate ? 
                        (new Date().getFullYear() - new Date(startDate).getFullYear()) < 5 : false;
                      
                      return (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>🚀 Conferma Regime Startup</FormLabel>
                            <div className="text-sm text-gray-500">
                              {startDate ? (
                                isEligibleForStartup ? 
                                  `✅ Attività entro i 5 anni (tasse al 5%)` : 
                                  `❌ Attività oltre i 5 anni (tasse al 15%)`
                              ) : (
                                'Tasse al 5% per i primi 5 anni'
                              )}
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value && isEligibleForStartup}
                              onCheckedChange={(checked) => {
                                if (isEligibleForStartup) {
                                  field.onChange(checked);
                                } else {
                                  field.onChange(false);
                                }
                              }}
                              disabled={!isEligibleForStartup}
                            />
                          </FormControl>
                        </FormItem>
                      );
                    }}
                  />
                </div>
              </div>



              {/* Situazione Finanziaria */}
              <div className="bg-purple-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-purple-900 mb-4">💰 Situazione Finanziaria</h3>
                <FormField
                  control={form.control}
                  name="currentBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>🏦 Saldo Attuale Accantonato (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="es: 5000"
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
                className="w-full text-base md:text-lg py-4 md:py-3 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 touch-manipulation"
                disabled={calculateMutation.isPending}
              >
                <Calculator className="mr-2 h-5 w-5" />
                {calculateMutation.isPending ? "Calcolo in corso..." : "🎯 CALCOLA IMPOSTE"}
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
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
              <Card className="opacity-100">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center">
                    <Building className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
                    <div className="ml-3 md:ml-4">
                      <p className="text-xs md:text-sm font-medium text-gray-500">Reddito Imponibile</p>
                      <p className="text-lg md:text-2xl font-bold text-gray-900">{formatCurrency(results.taxableIncome)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="opacity-100">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center">
                    <Euro className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
                    <div className="ml-3 md:ml-4">
                      <p className="text-xs md:text-sm font-medium text-gray-500">Imposta Sostitutiva</p>
                      <p className="text-lg md:text-2xl font-bold text-gray-900">{formatCurrency(results.taxAmount)}</p>
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
                    <Calendar className="h-8 w-8 text-orange-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Contributi INPS</p>
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
                    <Download className="h-8 w-8 text-red-500" />
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
                🔓 Sblocca il Report Completo GRATIS
              </h4>
              <p className="text-yellow-700 mb-4">
                Ottieni scadenze fiscali, piano di accantonamento, contributi INPS dettagliati e molto altro!
              </p>
              <ul className="text-left text-yellow-700 text-sm mb-4 max-w-md mx-auto">
                <li>• ✅ Calendario scadenze fiscali 2025-2026</li>
                <li>• ✅ Piano di accantonamento progressivo</li>
                <li>• ✅ Calcolo contributi INPS trimestrali</li>
                <li>• ✅ Report Excel scaricabile</li>
                <li>• ✅ Previsioni tasse 2026</li>
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
                🎯 Ottieni il Report Completo GRATIS
              </h3>
              <p className="text-sm md:text-base text-gray-600">
                Inserisci i tuoi dati per sbloccare tutti i dettagli del calcolo
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        Email * (per ricevere il report)
                      </FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="mario.rossi@email.com" 
                            {...field}
                            disabled={emailValidated}
                          />
                        </FormControl>
                        {!emailValidated && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => sendVerificationMutation.mutate(field.value)}
                            disabled={!field.value || sendVerificationMutation.isPending}
                          >
                            {sendVerificationMutation.isPending ? "Invio..." : "Verifica"}
                          </Button>
                        )}
                        {emailValidated && (
                          <div className="flex items-center text-green-600">
                            <span className="text-sm">✅ Verificata</span>
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {sentCode && !emailValidated && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-blue-900 mb-2">
                      Codice di verifica (inviato via email)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        maxLength={6}
                        className="h-12 text-center text-lg font-mono"
                        inputMode="numeric"
                      />
                      <Button
                        type="button"
                        onClick={handleEmailVerification}
                        disabled={!verificationCode}
                        className="h-12 px-8 touch-manipulation"
                      >
                        Verifica
                      </Button>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-lg">
                  <FormLabel className="flex items-center mb-2">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Categoria Selezionata
                  </FormLabel>
                  <div className="text-sm text-gray-700">
                    {form.watch('category') && TAX_COEFFICIENTS[form.watch('category') as keyof typeof TAX_COEFFICIENTS] ? (
                      <div>
                        <span className="font-medium">
                          {TAX_COEFFICIENTS[form.watch('category') as keyof typeof TAX_COEFFICIENTS].label}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          Settore: {SECTORS[TAX_COEFFICIENTS[form.watch('category') as keyof typeof TAX_COEFFICIENTS].sector]?.label}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500">Nessuna categoria selezionata</span>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <input type="checkbox" required className="mt-1" />
                    <div className="text-sm text-gray-600">
                      <p>
                        Accetto che i miei dati vengano utilizzati per ricevere il report richiesto e 
                        comunicazioni relative ai servizi fiscali. I dati non verranno ceduti a terzi.
                      </p>
                    </div>
                  </div>
                </div>

                {!emailValidated && (
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-blue-800 font-medium">
                      Compila tutti i campi e verifica l'email per salvare automaticamente i dati
                    </div>
                  </div>
                )}
                
                {emailValidated && (
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-green-800 font-medium">
                      ✅ Dati salvati automaticamente
                    </div>
                    <div className="text-sm text-green-600 mt-1">
                      I tuoi dati sono stati registrati nel nostro sistema
                    </div>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Full Results (Unlocked) */}
      {results && isUnlocked && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <Building className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Reddito Imponibile</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(results.taxableIncome)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Euro className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Imposta Sostitutiva</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(results.taxAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Contributi INPS</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(results.inpsAmount)}</p>
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
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(results.totalDue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Success Message */}
          <Card className="mb-8 bg-green-50 border-2 border-green-200">
            <CardContent className="p-6 text-center">
              <h3 className="text-2xl font-bold text-green-800 mb-2">
                🎉 Report Completo Sbloccato!
              </h3>
              <p className="text-green-700 mb-4">
                Grazie per i tuoi dati! Ora hai accesso a tutti i dettagli del calcolo.
              </p>
              <div className="text-green-600 text-sm mb-4">
                ✅ Report inviato anche via email • ✅ Salva questa pagina nei preferiti
              </div>
              
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={exportToExcel}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Scarica Excel
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
                      <DialogTitle>📧 Invia Report via Email</DialogTitle>
                      <DialogDescription>
                        Riceverai il report completo con allegato Excel direttamente nella tua casella di posta
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
                                  placeholder="mario.rossi@email.com" 
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-blue-900 mb-2">📄 Il report includerà:</h4>
                          <ul className="text-sm text-blue-700 space-y-1">
                            <li>• Calcoli fiscali completi</li>
                            <li>• Scadenze 2025 e 2026</li>
                            <li>• Piano di accantonamento mensile</li>
                            <li>• File Excel scaricabile</li>
                          </ul>
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={sendEmailMutation.isPending}
                        >
                          {sendEmailMutation.isPending ? "Invio in corso..." : "📧 Invia Report"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Scadenze Fiscali */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-6 text-gray-900">📅 Scadenze Fiscali 2025</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-900 mb-2">30 Giugno 2025</h4>
                  <div className="space-y-2 text-sm text-red-700">
                    <div>• Saldo 2024: {formatCurrency(results.taxAmount)}</div>
                    <div>• 1° Acconto 2025: {formatCurrency(results.taxAmount * 0.40)}</div>
                    <div className="font-semibold pt-2 border-t border-red-200">
                      Totale: {formatCurrency(results.taxAmount + (results.taxAmount * 0.40))}
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-900 mb-2">30 Novembre 2025</h4>
                  <div className="space-y-2 text-sm text-orange-700">
                    <div>• 2° Acconto 2025: {formatCurrency(results.taxAmount * 0.60)}</div>
                    <div className="font-semibold pt-2 border-t border-orange-200">
                      Totale: {formatCurrency(results.taxAmount * 0.60)}
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">INPS Trimestrale</h4>
                  <div className="space-y-2 text-sm text-green-700">
                    <div>• Ogni trimestre: {formatCurrency(results.inpsAmount / 4)}</div>
                    <div>• Scadenze: 16/5, 20/8, 16/11, 16/2</div>
                    <div className="font-semibold pt-2 border-t border-green-200">
                      Anno: {formatCurrency(results.inpsAmount)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Piano di Accantonamento Avanzato */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-6 text-gray-900">💰 Piano di Accantonamento Progressivo</h3>
              
              {(() => {
                const currentBalance = form.watch('currentBalance') || 0;
                const revenue2025 = form.watch('revenue2025') || form.watch('revenue') || 0;
                
                // Calcolo scadenze 2025
                const giugno2025 = results.taxAmount + (results.taxAmount * 0.40); // Saldo 2024 + 1° acconto 2025
                const novembre2025 = results.taxAmount * 0.60; // 2° acconto 2025
                
                // Calcolo tasse 2026 (se c'è fatturato 2025)
                let taxAmount2026 = 0;
                if (revenue2025 > 0) {
                  const selectedCategory = TAX_COEFFICIENTS[form.watch('category') as keyof typeof TAX_COEFFICIENTS];
                  const coefficient = selectedCategory?.value || 0.78;
                  const taxableIncome2025 = revenue2025 * coefficient;
                  const taxRate = form.watch('isStartup') ? 0.05 : 0.15;
                  taxAmount2026 = taxableIncome2025 * taxRate;
                }
                
                const giugno2026 = taxAmount2026 + (taxAmount2026 * 0.40); // Saldo 2025 + 1° acconto 2026
                
                // Calcolo mesi fino alle scadenze
                const now = new Date();
                const scadenzaGiugno2025 = new Date(2025, 5, 30); // 30 giugno 2025
                const scadenzaNovembre2025 = new Date(2025, 10, 30); // 30 novembre 2025
                const scadenzaGiugno2026 = new Date(2026, 5, 30); // 30 giugno 2026
                
                const mesiFinoGiugno2025 = Math.max(1, Math.ceil((scadenzaGiugno2025.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                const mesiFinoNovembre2025 = Math.max(1, Math.ceil((scadenzaNovembre2025.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                const mesiFinoGiugno2026 = Math.max(1, Math.ceil((scadenzaGiugno2026.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                
                // Calcolo fabbisogni progressivi
                let saldoAttuale = currentBalance;
                
                // Fabbisogno per giugno 2025
                const fabbisognoGiugno2025 = Math.max(0, giugno2025 - saldoAttuale);
                const accantonamentoMensileGiugno = fabbisognoGiugno2025 / mesiFinoGiugno2025;
                
                // Aggiornamento saldo dopo giugno 2025
                let saldoDopoGiugno = saldoAttuale + (accantonamentoMensileGiugno * mesiFinoGiugno2025) - giugno2025;
                saldoDopoGiugno = Math.max(0, saldoDopoGiugno);
                
                // Fabbisogno per novembre 2025
                const mesiTraScadenze = Math.max(1, Math.ceil((scadenzaNovembre2025.getTime() - scadenzaGiugno2025.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                const fabbisognoNovembre2025 = Math.max(0, novembre2025 - saldoDopoGiugno);
                const accantonamentoMensileNovembre = fabbisognoNovembre2025 / mesiTraScadenze;
                
                // Aggiornamento saldo dopo novembre 2025
                let saldoDopoNovembre = saldoDopoGiugno + (accantonamentoMensileNovembre * mesiTraScadenze) - novembre2025;
                saldoDopoNovembre = Math.max(0, saldoDopoNovembre);
                
                // Fabbisogno per giugno 2026 (solo se c'è fatturato 2025)
                let fabbisognoGiugno2026 = 0;
                let accantonamentoMensileGiugno2026 = 0;
                if (revenue2025 > 0) {
                  const mesiTraScadenze2026 = Math.max(1, Math.ceil((scadenzaGiugno2026.getTime() - scadenzaNovembre2025.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                  fabbisognoGiugno2026 = Math.max(0, giugno2026 - saldoDopoNovembre);
                  accantonamentoMensileGiugno2026 = fabbisognoGiugno2026 / mesiTraScadenze2026;
                }
                
                // Accantonamento immediato consigliato
                const accantonamentoImmediato = accantonamentoMensileGiugno + accantonamentoMensileNovembre + accantonamentoMensileGiugno2026;
                
                return (
                  <div className="space-y-6">
                    {/* Situazione Attuale */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">📊 Situazione Attuale</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Saldo accantonato:</span>
                          <span className="font-semibold">{formatCurrency(currentBalance)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Mesi a giugno 2025:</span>
                          <span className="font-semibold">{mesiFinoGiugno2025} mesi</span>
                        </div>
                      </div>
                    </div>

                    {/* Scadenze Progressive */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Giugno 2025 */}
                      <div className="bg-red-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-red-900 mb-3">🎯 30 Giugno 2025</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-red-700">Totale dovuto:</span>
                            <span className="font-semibold">{formatCurrency(giugno2025)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-700">Fabbisogno:</span>
                            <span className="font-semibold">{formatCurrency(fabbisognoGiugno2025)}</span>
                          </div>
                          <div className="flex justify-between border-t border-red-200 pt-2">
                            <span className="text-red-700">Mensile fino a scadenza:</span>
                            <span className="font-bold text-red-900">{formatCurrency(accantonamentoMensileGiugno)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Novembre 2025 */}
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-orange-900 mb-3">🎯 30 Novembre 2025</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-orange-700">Totale dovuto:</span>
                            <span className="font-semibold">{formatCurrency(novembre2025)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-orange-700">Saldo dopo giugno:</span>
                            <span className="font-semibold">{formatCurrency(saldoDopoGiugno)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-orange-700">Fabbisogno aggiuntivo:</span>
                            <span className="font-semibold">{formatCurrency(fabbisognoNovembre2025)}</span>
                          </div>
                          <div className="flex justify-between border-t border-orange-200 pt-2">
                            <span className="text-orange-700">Mensile aggiuntivo:</span>
                            <span className="font-bold text-orange-900">{formatCurrency(accantonamentoMensileNovembre)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Giugno 2026 (solo se c'è fatturato 2025) */}
                      {revenue2025 > 0 && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-blue-900 mb-3">🎯 30 Giugno 2026</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-blue-700">Totale dovuto:</span>
                              <span className="font-semibold">{formatCurrency(giugno2026)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-700">Saldo dopo nov 2025:</span>
                              <span className="font-semibold">{formatCurrency(saldoDopoNovembre)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-700">Fabbisogno aggiuntivo:</span>
                              <span className="font-semibold">{formatCurrency(fabbisognoGiugno2026)}</span>
                            </div>
                            <div className="flex justify-between border-t border-blue-200 pt-2">
                              <span className="text-blue-700">Mensile aggiuntivo:</span>
                              <span className="font-bold text-blue-900">{formatCurrency(accantonamentoMensileGiugno2026)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Raccomandazione Finale */}
                    <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
                      <h4 className="font-bold text-green-900 mb-4">💡 Raccomandazione di Accantonamento</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="text-2xl font-bold text-green-900 mb-2">
                            {formatCurrency(accantonamentoImmediato)}
                          </div>
                          <div className="text-green-700 text-sm">
                            Accantona questo importo ogni mese da adesso per coprire tutte le scadenze future
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-green-700">Per giugno 2025:</span>
                            <span className="font-semibold">{formatCurrency(accantonamentoMensileGiugno)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-700">Per novembre 2025:</span>
                            <span className="font-semibold">{formatCurrency(accantonamentoMensileNovembre)}</span>
                          </div>
                          {revenue2025 > 0 && (
                            <div className="flex justify-between">
                              <span className="text-green-700">Per giugno 2026:</span>
                              <span className="font-semibold">{formatCurrency(accantonamentoMensileGiugno2026)}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t border-green-300 pt-2">
                            <span className="text-green-700 font-semibold">% su fatturato mensile:</span>
                            <span className="font-bold">{((accantonamentoImmediato / ((form.watch('revenue') || 1) / 12)) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Download Report */}
          <Card className="mb-6 md:mb-8">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">📄 Report Completo</h3>
                  <p className="text-sm md:text-base text-gray-600">Scarica il report dettagliato con tutti i calcoli e le scadenze</p>
                </div>
                <Button 
                  onClick={exportToExcel}
                  className="bg-green-600 hover:bg-green-700 h-12 md:h-auto px-6 py-3 touch-manipulation"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Scarica Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
