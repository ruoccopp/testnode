
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
import { Building2, Euro, Users, Calculator, Download, Lock, Mail, User, MapPin, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import * as XLSX from 'xlsx';
import logoPath from "@assets/SmartRate - Colors.png";
import { Link } from "wouter";
import { calculateSRLTaxes, IRAP_RATES, VAT_REGIMES, SRLTaxCalculationResult } from "@/lib/srl-tax-calculator";

const calculationSchema = z.object({
  revenue: z.number().min(0, "Il fatturato deve essere positivo"),
  costs: z.number().min(0, "I costi devono essere positivi"),
  employees: z.number().min(0, "Il numero dipendenti deve essere positivo").int(),
  employeeCosts: z.number().min(0, "I costi dipendenti devono essere positivi"),
  adminSalary: z.number().min(0, "Il compenso amministratore deve essere positivo"),
  region: z.string().min(1, "Seleziona una regione"),
  vatRegime: z.string().min(1, "Seleziona il regime IVA"),
  hasVatDebt: z.boolean().default(false),
  vatDebt: z.number().min(0).optional(),
  currentBalance: z.number().min(0, "Il saldo deve essere positivo").optional(),
});

const leadSchema = z.object({
  firstName: z.string().min(2, "Nome deve avere almeno 2 caratteri"),
  lastName: z.string().min(2, "Cognome deve avere almeno 2 caratteri"),
  email: z.string().email("Email non valida"),
  companyName: z.string().min(2, "Ragione sociale deve avere almeno 2 caratteri"),
  vatNumber: z.string().optional(),
});

const emailSchema = z.object({
  email: z.string().email("Email non valida"),
});

type CalculationForm = z.infer<typeof calculationSchema>;
type LeadForm = z.infer<typeof leadSchema>;
type EmailForm = z.infer<typeof emailSchema>;

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
  const { toast } = useToast();

  const form = useForm<CalculationForm>({
    resolver: zodResolver(calculationSchema),
    defaultValues: {
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
      // Calcolo diretto senza API per semplicità
      const result = calculateSRLTaxes({
        ...data,
        vatDebt: data.vatDebt || 0,
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
    if (verificationCode === sentCode) {
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

    const formData = form.getValues();
    const currentBalance = formData.currentBalance || 0;
    
    const worksheetData = [
      ['PIANIFICATORE IMPOSTE SRL - REPORT COMPLETO'],
      ['Data:', new Date().toLocaleDateString('it-IT')],
      [''],
      
      // Dati società
      ['DATI SOCIETA\''],
      ['Fatturato Annuo:', formData.revenue || 0],
      ['Costi Operativi:', formData.costs || 0],
      ['Numero Dipendenti:', formData.employees],
      ['Costi Dipendenti:', formData.employeeCosts || 0],
      ['Compenso Amministratore:', formData.adminSalary || 0],
      ['Regione:', ITALIAN_REGIONS[formData.region as keyof typeof ITALIAN_REGIONS] || ''],
      ['Regime IVA:', VAT_REGIMES[formData.vatRegime as keyof typeof VAT_REGIMES]?.label || ''],
      ['Saldo Accantonato:', currentBalance],
      [''],
      
      // Calcoli fiscali
      ['CALCOLI FISCALI 2024'],
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
      
      // Scadenze fiscali
      ['SCADENZE FISCALI'],
      ['30 Giugno 2025 - IRES Saldo:', results.iresAmount],
      ['30 Giugno 2025 - IRES 1° Acconto:', results.iresFirstAcconto],
      ['30 Novembre 2025 - IRES 2° Acconto:', results.iresSecondAcconto],
      ['30 Giugno 2025 - IRAP Saldo:', results.irapAmount],
      ['30 Giugno 2025 - IRAP 1° Acconto:', results.irapFirstAcconto],
      ['30 Novembre 2025 - IRAP 2° Acconto:', results.irapSecondAcconto],
      [''],
      
      // Scadenze IVA
      ['SCADENZE IVA (' + (VAT_REGIMES[formData.vatRegime as keyof typeof VAT_REGIMES]?.label || '') + ')'],
      ['Importo per Periodo:', results.vatQuarterly],
      ['Frequenza:', VAT_REGIMES[formData.vatRegime as keyof typeof VAT_REGIMES]?.frequency + ' volte/anno'],
      [''],
      
      // Piano accantonamento
      ['PIANO ACCANTONAMENTO'],
      ['Accantonamento Mensile Totale:', results.monthlyAccrual],
      ['Pagamenti Trimestrali (IVA+INPS):', results.quarterlyPayments],
      ['% su Fatturato Mensile:', ((results.monthlyAccrual / ((formData.revenue || 1) / 12)) * 100).toFixed(1) + '%'],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    ws['!cols'] = [
      { width: 35 },
      { width: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Report Imposte SRL');
    
    const fileName = `Report_Imposte_SRL_${new Date().getFullYear()}_${new Date().getMonth() + 1}_${new Date().getDate()}.xlsx`;
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
              🏢 Calcolatore Imposte SRL GRATUITO
            </h2>
            <div className="mt-2">
              <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
                Calcola IRES, IRAP, IVA e Contributi INPS per società a responsabilità limitata
              </p>
              <span className="text-xs text-blue-600 font-medium">Powered by SmartRate</span>
            </div>
          </div>
          <div className="flex-shrink-0 mt-4 md:mt-0 md:ml-6 flex flex-col items-center md:items-end gap-2">
            <div className="flex gap-2">
              <Link href="/calculator">
                <Button variant="outline" size="sm" className="text-xs">
                  💰 Calcolatore Forfettari
                </Button>
              </Link>
              <Link href="/leads">
                <Button variant="outline" size="sm" className="text-xs">
                  🎯 Dashboard Lead
                </Button>
              </Link>
            </div>
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
              
              {/* Dati Economici */}
              <div className="bg-blue-50 p-3 md:p-4 rounded-lg mb-4 md:mb-6">
                <h3 className="font-medium text-blue-900 mb-3 md:mb-4 text-sm md:text-base">📊 Dati Economici</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="revenue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm md:text-base">💼 Fatturato Annuo (€)</FormLabel>
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
                        <FormLabel>🏭 Costi Operativi (€)</FormLabel>
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
                        <FormLabel>👨‍💼 Numero Dipendenti</FormLabel>
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
                {calculateMutation.isPending ? "Calcolo in corso..." : "🎯 CALCOLA IMPOSTE SRL"}
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
                    <Building2 className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
                    <div className="ml-3 md:ml-4">
                      <p className="text-xs md:text-sm font-medium text-gray-500">Utile Lordo</p>
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
                      <p className="text-xs md:text-sm font-medium text-gray-500">IRES (24%)</p>
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
                🔓 Sblocca il Report Completo GRATIS
              </h4>
              <p className="text-yellow-700 mb-4">
                Ottieni calcoli dettagliati IRES, IRAP, IVA, INPS e piano di accantonamento completo!
              </p>
              <ul className="text-left text-yellow-700 text-sm mb-4 max-w-md mx-auto">
                <li>• ✅ Calcolo IRES e IRAP dettagliato</li>
                <li>• ✅ Pianificazione IVA mensile/trimestrale</li>
                <li>• ✅ Contributi INPS amministratori e dipendenti</li>
                <li>• ✅ Calendar scadenze fiscali complete</li>
                <li>• ✅ Report Excel professionale</li>
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
                Inserisci i dati della tua società per sbloccare tutti i dettagli del calcolo
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
                            placeholder="mario.rossi@azienda.com" 
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    name="vatNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>📋 Partita IVA (opzionale)</FormLabel>
                        <FormControl>
                          <Input placeholder="12345678901" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Euro className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">IRES (24%)</p>
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
                🎉 Report SRL Completo Sbloccato!
              </h3>
              <p className="text-green-700 mb-4">
                Grazie! Ora hai accesso ai calcoli fiscali completi per la tua SRL.
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
                      <DialogTitle>📧 Invia Report SRL via Email</DialogTitle>
                      <DialogDescription>
                        Riceverai il report completo con calcoli IRES, IRAP, IVA e INPS
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
                          {sendEmailMutation.isPending ? "Invio in corso..." : "📧 Invia Report"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Breakdown Dettagliato */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-900">💰 Breakdown Imposte</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reddito Imponibile:</span>
                    <span className="font-semibold">{formatCurrency(results.taxableIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">IRES (24%):</span>
                    <span className="font-semibold">{formatCurrency(results.iresAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base IRAP:</span>
                    <span className="font-semibold">{formatCurrency(results.irapBase)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">IRAP ({((IRAP_RATES[form.watch('region') as keyof typeof IRAP_RATES] || 3.9))}%):</span>
                    <span className="font-semibold">{formatCurrency(results.irapAmount)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Totale Imposte:</span>
                    <span className="font-bold text-lg">{formatCurrency(results.totalTaxes)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-900">👥 Contributi INPS</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">INPS Amministratore:</span>
                    <span className="font-semibold">{formatCurrency(results.inpsAdmin)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">INPS Dipendenti:</span>
                    <span className="font-semibold">{formatCurrency(results.inpsEmployees)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">IVA Stimata:</span>
                    <span className="font-semibold">{formatCurrency(results.vatAmount)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Totale Altri Oneri:</span>
                    <span className="font-bold text-lg">{formatCurrency(results.inpsTotalAmount + results.vatAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scadenze Fiscali */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-6 text-gray-900">📅 Scadenze Fiscali 2025</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-900 mb-2">30 Giugno 2025</h4>
                  <div className="space-y-2 text-sm text-red-700">
                    <div>• IRES Saldo: {formatCurrency(results.iresAmount)}</div>
                    <div>• IRES 1° Acconto: {formatCurrency(results.iresFirstAcconto)}</div>
                    <div>• IRAP Saldo: {formatCurrency(results.irapAmount)}</div>
                    <div>• IRAP 1° Acconto: {formatCurrency(results.irapFirstAcconto)}</div>
                    <div className="font-semibold pt-2 border-t border-red-200">
                      Totale: {formatCurrency(results.iresAmount + results.iresFirstAcconto + results.irapAmount + results.irapFirstAcconto)}
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-900 mb-2">30 Novembre 2025</h4>
                  <div className="space-y-2 text-sm text-orange-700">
                    <div>• IRES 2° Acconto: {formatCurrency(results.iresSecondAcconto)}</div>
                    <div>• IRAP 2° Acconto: {formatCurrency(results.irapSecondAcconto)}</div>
                    <div className="font-semibold pt-2 border-t border-orange-200">
                      Totale: {formatCurrency(results.iresSecondAcconto + results.irapSecondAcconto)}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">IVA {VAT_REGIMES[form.watch('vatRegime') as keyof typeof VAT_REGIMES]?.label}</h4>
                  <div className="space-y-2 text-sm text-blue-700">
                    <div>• Per periodo: {formatCurrency(results.vatQuarterly)}</div>
                    <div>• Frequenza: {VAT_REGIMES[form.watch('vatRegime') as keyof typeof VAT_REGIMES]?.frequency} volte/anno</div>
                    <div className="font-semibold pt-2 border-t border-blue-200">
                      Anno: {formatCurrency(results.vatAmount)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scadenze IVA */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-6 text-gray-900">📅 Scadenze IVA {new Date().getFullYear() + 1}</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {results.vatDeadlines && results.vatDeadlines.map((deadline, index) => (
                  <div key={index} className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="text-sm text-orange-600 font-medium">{deadline.type}</div>
                    <div className="text-lg font-bold text-orange-900">{deadline.date}</div>
                    <div className="text-xl font-bold text-orange-700 mt-2">
                      {formatCurrency(deadline.amount)}
                    </div>
                  </div>
                ))}
              </div>
              
              {results.vatDeadlines && results.vatDeadlines.length > 0 && (
                <div className="mt-4 p-4 bg-orange-100 rounded-lg">
                  <div className="text-sm text-orange-700">
                    <strong>Totale IVA annuale:</strong> {formatCurrency(results.vatAmount)}
                  </div>
                  <div className="text-xs text-orange-600 mt-1">
                    Regime: {VAT_REGIMES[form.watch('vatRegime') as keyof typeof VAT_REGIMES]?.label}
                  </div>
                </div>
              )}
              
              {(!results.vatDeadlines || results.vatDeadlines.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Compila il form per visualizzare le scadenze IVA</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Piano di Accantonamento */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-6 text-gray-900">💰 Piano di Accantonamento Mensile</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-3">📊 Accantonamento Generale</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Mensile totale:</span>
                      <span className="font-bold text-green-900">{formatCurrency(results.monthlyAccrual)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">% su fatturato:</span>
                      <span className="font-semibold">{((results.monthlyAccrual / ((form.watch('revenue') || 1) / 12)) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3">📅 Pagamenti Trimestrali</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">IVA + INPS:</span>
                      <span className="font-bold text-blue-900">{formatCurrency(results.quarterlyPayments)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Solo INPS:</span>
                      <span className="font-semibold">{formatCurrency(results.inpsTotalAmount / 4)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-3">🎯 Breakdown Imposte</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-purple-700">IRES mensile:</span>
                      <span className="font-semibold">{formatCurrency(results.iresAmount / 12)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-700">IRAP mensile:</span>
                      <span className="font-semibold">{formatCurrency(results.irapAmount / 12)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Download Report */}
          <Card className="mb-6 md:mb-8">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">📄 Report SRL Completo</h3>
                  <p className="text-sm md:text-base text-gray-600">Scarica il report dettagliato con tutti i calcoli fiscali per SRL</p>
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
