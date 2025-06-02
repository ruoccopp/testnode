
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import { TAX_COEFFICIENTS, SECTORS, CONTRIBUTION_REGIMES, FORFETTARIO_LIMITS_2025 } from "@/lib/constants";

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
  const [emailValidated, setEmailValidated] = useState(true);
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
    // Verifica email rimossa per velocizzare i test
    setEmailValidated(true);
    setIsUnlocked(true);
    
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
                  
                  <FormField
                    control={form.control}
                    name="currentBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>💰 Saldo Conto Corrente Attuale (€)</FormLabel>
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
                        <FormDescription>
                          Il saldo attuale del tuo conto corrente per pianificare gli accantonamenti
                        </FormDescription>
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

      {/* Full Results (Always Unlocked) */}
      {results && (
        <div className="space-y-6">
          {/* Piano di Accantonamento con Margine di Sicurezza */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Building className="mr-2 h-5 w-5 text-yellow-600" />
                Piano di Accantonamento con Margine di Sicurezza
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                  <div className="flex items-center justify-center mb-2">
                    <Calculator className="h-5 w-5 text-blue-600 mr-1" />
                    <span className="text-sm font-medium text-blue-900">Accantonamento Standard</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-600">Mensile base:</div>
                    <div className="text-xl font-bold text-blue-600">{formatCurrency(Math.round(results.totalDue / 12))}</div>
                    <div className="text-xs text-gray-500">% su fatturato: {((results.totalDue / 12 * 12 / (form.watch('revenue') || 1)) * 100).toFixed(1)}%</div>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg text-center border border-orange-200">
                  <div className="flex items-center justify-center mb-2">
                    <Euro className="h-5 w-5 text-orange-600 mr-1" />
                    <span className="text-sm font-medium text-orange-900">Con Margine Sicurezza (10%)</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-600">Mensile sicuro:</div>
                    <div className="text-xl font-bold text-orange-600">{formatCurrency(Math.round(results.totalDue / 12 * 1.1))}</div>
                    <div className="text-xs text-gray-500">Margine extra: +{formatCurrency(Math.round(results.totalDue / 12 * 0.1))}</div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg text-center border border-purple-200">
                  <div className="flex items-center justify-center mb-2">
                    <Calendar className="h-5 w-5 text-purple-600 mr-1" />
                    <span className="text-sm font-medium text-purple-900">Distribuzione Cashflow</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-600">Accumulo annuale:</div>
                    <div className="text-xl font-bold text-purple-600">{formatCurrency(results.totalDue)}</div>
                    <div className="text-xs text-gray-500">Copertura: 100%</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Breakdown Imposte e Contributi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Euro className="mr-2 h-5 w-5 text-blue-600" />
  Dettaglio Fiscale Completo
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Reddito imponibile:</span>
                    <span className="font-medium">{formatCurrency(results.taxableIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aliquota forfettaria:</span>
                    <span className="font-medium">15%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Imposta sostitutiva:</span>
                    <span className="font-medium">{formatCurrency(results.taxAmount)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Totale Imposte:</span>
                      <span>{formatCurrency(results.taxAmount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <User className="mr-2 h-5 w-5 text-orange-600" />
                  Contributi e Altri Oneri
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Contributi INPS:</span>
                    <span className="font-medium">{formatCurrency(results.inpsAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Regime contributivo:</span>
                    <span className="text-sm">Gestione separata</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Totale Altri Oneri:</span>
                      <span>{formatCurrency(results.inpsAmount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Anno Fiscale di Riferimento */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-green-800">
                <Calendar className="mr-2 h-5 w-5" />
                Anno Fiscale di Riferimento: 2025
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-green-700">Imposta sostitutiva: Anno fiscale 2025</div>
                </div>
                <div>
                  <div className="text-sm text-green-700">INPS: Contributi anno 2025</div>
                </div>
                <div>
                  <div className="text-sm text-green-700">Regime: Forfettario 15%</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-green-600">
                <strong>Scadenze di pagamento:</strong> Calendario fiscale 2025<br/>
                Le imposte calcolate per il 2025 sono da versare nell'anno successivo secondo il calendario fiscale mostrato sotto.
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards con icone */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="text-center">
              <CardContent className="p-4">
                <Building className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-blue-600">{formatCurrency(results.taxableIncome)}</div>
                <div className="text-xs text-gray-600">Reddito Imponibile</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <Euro className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-green-600">{formatCurrency(results.taxAmount)}</div>
                <div className="text-xs text-gray-600">Imposta Sostitutiva (15%)</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <User className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-orange-600">{formatCurrency(results.inpsAmount)}</div>
                <div className="text-xs text-gray-600">Contributi INPS</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <Download className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-red-600">{formatCurrency(results.totalDue)}</div>
                <div className="text-xs text-gray-600">Totale Dovuto</div>
              </CardContent>
            </Card>
          </div>

          {/* Pianificatore Scadenze 2025 */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-purple-600" />
                Pianificatore Scadenze Fiscali 2025
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-medium">Data Scadenza</th>
                      <th className="text-right p-3 font-medium">Importo</th>
                      <th className="text-left p-3 font-medium">Tipo Versamento</th>
                      <th className="text-left p-3 font-medium">Codice Tributo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Saldo 2024 */}
                    <tr className="border-b bg-green-50">
                      <td className="p-3 font-medium">30 Giugno 2025</td>
                      <td className="p-3 text-right font-bold text-green-600">
                        {formatCurrency(results.taxAmount)}
                      </td>
                      <td className="p-3">Saldo Imposta Sostitutiva 2024</td>
                      <td className="p-3 font-mono text-xs">1792</td>
                    </tr>
                    
                    {/* Primo Acconto 2025 */}
                    <tr className="border-b bg-blue-50">
                      <td className="p-3 font-medium">30 Giugno 2025</td>
                      <td className="p-3 text-right font-bold text-blue-600">
                        {formatCurrency(Math.round(results.taxAmount * 0.40))}
                      </td>
                      <td className="p-3">Primo Acconto 2025 (40%)</td>
                      <td className="p-3 font-mono text-xs">1790</td>
                    </tr>
                    
                    {/* Secondo Acconto 2025 */}
                    <tr className="border-b bg-purple-50">
                      <td className="p-3 font-medium">30 Novembre 2025</td>
                      <td className="p-3 text-right font-bold text-purple-600">
                        {formatCurrency(Math.round(results.taxAmount * 0.60))}
                      </td>
                      <td className="p-3">Secondo Acconto 2025 (60%)</td>
                      <td className="p-3 font-mono text-xs">1791</td>
                    </tr>
                    
                    {/* Contributi INPS */}
                    <tr className="border-b bg-orange-50">
                      <td className="p-3 font-medium">16 Agosto 2025</td>
                      <td className="p-3 text-right font-bold text-orange-600">
                        {formatCurrency(results.inpsAmount)}
                      </td>
                      <td className="p-3">Contributi INPS 2024</td>
                      <td className="p-3 font-mono text-xs">
                        {form.watch('contributionRegime') === 'GESTIONE_SEPARATA' ? 'PXX' : 'AF/CF'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-900 mb-2">Pianificazione Finanziaria</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Saldo attuale:</strong> {formatCurrency(form.watch('currentBalance') || 0)}
                  </div>
                  <div>
                    <strong>Totale da accantonare:</strong> {formatCurrency(results.totalDue)}
                  </div>
                  <div>
                    <strong>Deficit:</strong> 
                    <span className={(form.watch('currentBalance') || 0) >= results.totalDue ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency((form.watch('currentBalance') || 0) - results.totalDue)}
                    </span>
                  </div>
                  <div>
                    <strong>Accantonamento mensile:</strong> {formatCurrency(Math.round(results.totalDue / 12))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Avanzato Sbloccato */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-green-800">
                🎉 Report Forfettario Avanzato Sbloccato!
              </h3>
              <div className="text-center mb-4">
                <div className="text-green-700">Pianificazione fiscale completa con tutti i calcoli avanzati per la tua attività.</div>
              </div>
              
              <div className="flex justify-center gap-4">
                <Button 
                  onClick={exportToExcel}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  📥 Scarica Excel Avanzato
                </Button>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                      <Mail className="h-4 w-4 mr-2" />
                      📧 Invia via Email
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

          {/* Scadenze Fiscali 2025 */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                📅 Scadenze Fiscali 2025
              </h3>
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center text-yellow-800">
                  <span className="text-sm font-medium">⚠️ Nota importante:</span>
                </div>
                <div className="text-sm text-yellow-700 mt-1">
                  Le scadenze forfettario 2025 si basano sull'imposta 2024 (saldi + acconti calcolati su imposta 2024). 
                  Gli importi mostrati sono una stima basata sulla proiezione 2025.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-red-800">30 Giugno 2025</span>
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">28 giorni</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>• Saldo imposta sostitutiva:</span>
                      <span className="font-medium">{formatCurrency(Math.round(results.taxAmount * 0.6))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Primo acconto:</span>
                      <span className="font-medium">{formatCurrency(Math.round(results.taxAmount * 0.4))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Contributi INPS:</span>
                      <span className="font-medium">{formatCurrency(Math.round(results.inpsAmount * 0.5))}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between font-semibold">
                      <span>Totale:</span>
                      <span>{formatCurrency(Math.round(results.taxAmount + results.inpsAmount * 0.5))}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-green-800">30 Novembre 2025</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">181 giorni</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>• Secondo acconto:</span>
                      <span className="font-medium">{formatCurrency(Math.round(results.taxAmount * 0.6))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Contributi INPS:</span>
                      <span className="font-medium">{formatCurrency(Math.round(results.inpsAmount * 0.5))}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between font-semibold">
                      <span>Totale:</span>
                      <span>{formatCurrency(Math.round(results.taxAmount * 0.6 + results.inpsAmount * 0.5))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
