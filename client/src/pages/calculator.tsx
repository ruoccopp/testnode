import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calculator, Building, Euro, Calendar, Download, Lock, Mail, User, Briefcase, TrendingUp, PiggyBank } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import * as XLSX from 'xlsx';
import { Link } from "wouter";

const logoPath = "/generated-icon.png";

// Importiamo le categorie dal file constants
import { TAX_COEFFICIENTS, SECTORS, CONTRIBUTION_REGIMES, FORFETTARIO_LIMITS_2025 } from "@/lib/constants";

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
  vatRegime: z.string().default("REGIME_ORDINARIO"),
  vatOnSales2025: z.number().min(0, "L'IVA sui ricavi deve essere positiva").optional(),
  vatOnPurchases2025: z.number().min(0, "L'IVA sugli acquisti deve essere positiva").optional(),
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

export default function CalculatorPage() {
  const [results, setResults] = useState<CalculationResult | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [emailValidated, setEmailValidated] = useState(true);
  const [useSafetyMargin, setUseSafetyMargin] = useState(false);
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
      hasOtherCoverage: false,
      currentBalance: undefined,
      vatRegime: "REGIME_ORDINARIO",
      vatOnSales2025: undefined,
      vatOnPurchases2025: undefined,
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
      const response = await fetch("/api/send-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          calculationData: data.calculationData,
          calculationType: "forfettario",
        }),
      });
      if (!response.ok) throw new Error("Failed to send email");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email inviata",
        description: "Il report è stato inviato alla tua email.",
      });
      setShowEmailForm(false);
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore nell'invio dell'email. Riprova più tardi.",
        variant: "destructive",
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

  const exportToExcel = () => {
    if (!results) return;
    
    const formData = form.getValues();
    const category = TAX_COEFFICIENTS[formData.category as keyof typeof TAX_COEFFICIENTS];
    
    const worksheetData = [
      ['REPORT FORFETTARIO AVANZATO', ''],
      ['Data Report', new Date().toLocaleDateString('it-IT')],
      ['', ''],
      ['DATI AZIENDALI', ''],
      ['Fatturato Annuo', formatCurrency(formData.revenue || 0)],
      ['Attività', category?.label || ''],
      ['Coefficiente Redditività', `${((category?.value || 0) * 100).toFixed(0)}%`],
      ['Data Inizio Attività', formData.startDate],
      ['', ''],
      ['CALCOLI FISCALI', ''],
      ['Reddito Imponibile', formatCurrency(results.taxableIncome)],
      ['Imposta Sostitutiva', formatCurrency(results.taxAmount)],
      ['Contributi INPS', formatCurrency(results.inpsAmount)],
      ['Totale Dovuto', formatCurrency(results.totalDue)],
      ['', ''],
      ['ANALISI PERCENTUALI', ''],
      ['Incidenza Imposte su Fatturato', `${((results.taxAmount / (formData.revenue || 1)) * 100).toFixed(2)}%`],
      ['Incidenza INPS su Fatturato', `${((results.inpsAmount / (formData.revenue || 1)) * 100).toFixed(2)}%`],
      ['Incidenza Totale su Fatturato', `${((results.totalDue / (formData.revenue || 1)) * 100).toFixed(2)}%`],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    ws['!cols'] = [
      { width: 35 },
      { width: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Report Imposte');
    
    const fileName = `Report_Imposte_Forfettari_${new Date().getFullYear()}_${new Date().getMonth() + 1}_${new Date().getDate()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Report scaricato",
      description: `Il file ${fileName} è stato scaricato con successo`,
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src={logoPath} 
                alt="SmartRate" 
                className="h-8 w-auto"
              />
              <span className="ml-2 text-xl font-bold text-gray-900">SmartRate</span>
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex gap-2">
              <Button variant="default" size="sm" className="text-xs bg-blue-600">
                🧾 Forfettario
              </Button>
              <Link href="/calculator-individual">
                <Button variant="outline" size="sm" className="text-xs">
                  🏢 Ordinario
                </Button>
              </Link>
              <Link href="/calculator-srl">
                <Button variant="outline" size="sm" className="text-xs">
                  🏢 SRL
                </Button>
              </Link>
              <Link href="/leads">
                <Button variant="outline" size="sm" className="text-xs">
                  📊 Dashboard Lead
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto py-8 px-4">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">
            Calcolatore Imposte Ditte Individuali Regime Forfettario
          </h1>
        </div>

      {/* Calculator Form */}
      <Card className="mb-6 md:mb-8">
        <CardContent className="p-4 md:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
              {/* Informazioni Attività - PRIMO BLOCCO */}
              <div className="bg-blue-50 p-3 md:p-4 rounded-lg mb-4 md:mb-6 border-2 border-blue-200">
                <h3 className="font-medium text-blue-900 mb-3 md:mb-4 text-sm md:text-base">📋 Informazioni Attività</h3>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm md:text-base">📅 Data di Inizio Attività</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            placeholder="gg/mm/aaaa"
                            className="text-base md:text-lg h-12 md:h-auto"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Inserisci la data di apertura della tua Partita IVA
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  
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
                            } else if (value === 'LEGAL_SERVICES') {
                              // Avvocati → Cassa Forense
                              form.setValue('contributionRegime', 'CASSA_FORENSE');
                            } else if (value === 'ENGINEERING_ARCHITECTURE') {
                              // Ingegneri e Architetti → Inarcassa
                              form.setValue('contributionRegime', 'INARCASSA');
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
                  
                  <FormField
                    control={form.control}
                    name="isStartup"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm md:text-base">🚀 Conferma Regime Startup</FormLabel>
                          <FormDescription className="text-xs">
                            Tasse al 5% per i primi 5 anni
                          </FormDescription>
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
                          <FormLabel>🏛️ Regime Contributivo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona il regime contributivo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(CONTRIBUTION_REGIMES).map(([key, regime]) => (
                                <SelectItem key={key} value={key}>
                                  <div className="flex flex-col items-start">
                                    <span className="font-medium">{regime.name}</span>
                                    <span className="text-xs text-gray-500">{regime.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Il regime viene automaticamente preselezionato in base alla tua categoria professionale
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Agevolazioni Contributive */}
                    <FormField
                      control={form.control}
                      name="contributionReduction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>🎯 Agevolazioni Contributive Disponibili</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona se hai agevolazioni" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NONE">Nessuna agevolazione</SelectItem>
                              <SelectItem value="YOUNG_ENTREPRENEUR">🌟 Giovane Imprenditore (under 35)</SelectItem>
                              <SelectItem value="WOMEN_ENTREPRENEUR">👩‍💼 Imprenditoria Femminile</SelectItem>
                              <SelectItem value="STARTUP_INNOVATIVE">🚀 Startup Innovativa</SelectItem>
                              <SelectItem value="SOUTH_ITALY">🏛️ Agevolazioni Sud Italia</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Le agevolazioni riducono i contributi INPS fino al 50% per periodi limitati
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Gestione IVA Avanzata */}
              <div className="bg-orange-50 p-4 rounded-lg mb-6 border-2 border-orange-200">
                <h3 className="font-medium text-orange-900 mb-4">⚖️ Gestione IVA</h3>
                <div className="grid grid-cols-1 gap-4">
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
                            <SelectItem value="REGIME_ORDINARIO">Regime Ordinario</SelectItem>
                            <SelectItem value="REGIME_AGEVOLATO">Regime Agevolato</SelectItem>
                            <SelectItem value="REGIME_SPECIALE">Regime Speciale</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Il regime IVA influisce sulle liquidazioni trimestrali e sulla pianificazione fiscale
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vatOnSales2025"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>📈 IVA sui Ricavi 2025 (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="es: 12000"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          IVA che dovrai versare sui ricavi previsti per il 2025
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vatOnPurchases2025"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>📉 IVA Detraibile su Acquisti 2025 (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="es: 3000"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          IVA che potrai detrarre sugli acquisti aziendali del 2025
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Pianificazione Liquidità */}
              <div className="bg-green-50 p-4 rounded-lg mb-6 border-2 border-green-200">
                <h3 className="font-medium text-green-900 mb-4">💰 Pianificazione Liquidità</h3>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="currentBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>🏦 Liquidità Attuale (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="es: 15000"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Denaro attualmente disponibile per pagare tasse e contributi
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-lg" 
                disabled={calculateMutation.isPending}
              >
                {calculateMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Calcolo in corso...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-5 w-5" />
                    Calcola Imposte e Contributi
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

        {/* Results */}
        {results && isUnlocked && (
          <div className="space-y-6">
            {/* Advanced Report Unlocked Section */}
            <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-blue-50">
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-purple-700 mb-2 flex items-center justify-center gap-2">
                    🎉 Report Forfettario Avanzato Sbloccato!
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Pianificazione fiscale completa con tutti i calcoli avanzati per la tua attività.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={exportToExcel}
                    >
                      📊 Scarica Excel Avanzato
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                      onClick={() => setShowEmailForm(true)}
                    >
                      ✉️ Invia via Email
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                    <span>✓ Report avanzato inviato anche via email</span>
                    <span className="text-blue-600">⭐ Salva questa pagina nei preferiti</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Esportazione Report */}
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <Download className="mr-2 h-5 w-5" />
                  Esportazione Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-green-700">Scarica il report completo con tutti i calcoli fiscali dettagliati</div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={exportToExcel}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Scarica Excel
                  </Button>
                  <Button 
                    onClick={() => setShowEmailForm(true)}
                    variant="outline"
                    className="border-blue-500 text-blue-600 hover:bg-blue-50"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Invia via Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lead Form */}
        {showLeadForm && !isUnlocked && (
          <Card>
            <CardHeader>
              <CardTitle>Inserisci i tuoi dati per sbloccare il report completo</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...leadForm}>
                <form onSubmit={leadForm.handleSubmit(onLeadSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={leadForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
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
                          <FormLabel>Cognome</FormLabel>
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="mario@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={submitLeadMutation.isPending}>
                    {submitLeadMutation.isPending ? "Salvataggio..." : "Sblocca Report Completo"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Email Form Modal */}
        {showEmailForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <Card className="max-w-md w-full mx-4">
              <CardHeader>
                <CardTitle>Invia Report via Email</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="tua@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={sendEmailMutation.isPending}
                      >
                        {sendEmailMutation.isPending ? "Invio..." : "Invia"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowEmailForm(false)}
                        className="flex-1"
                      >
                        Annulla
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}