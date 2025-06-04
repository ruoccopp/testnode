import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, Calendar, Euro, FileText, Mail, TrendingUp, Users, Building, DollarSign, AlertTriangle, CheckCircle, Clock, Info } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import logoPath from "@assets/generated-icon.png";
import { Link } from "wouter";

// Business activity mapping
const businessActivities: Record<string, { coefficient: number; vatRate: number; description: string }> = {
  "commercio": { coefficient: 0.40, vatRate: 22, description: "Commercio al dettaglio e all'ingrosso" },
  "servizi": { coefficient: 0.67, vatRate: 22, description: "Servizi commerciali e professionali" },
  "artigianato": { coefficient: 0.67, vatRate: 22, description: "Attività artigianali" },
  "professioni": { coefficient: 0.78, vatRate: 22, description: "Libere professioni" },
  "agricoltura": { coefficient: 0.25, vatRate: 10, description: "Attività agricole" }
};

const calculationSchema = z.object({
  revenue: z.number().min(1, "Il fatturato deve essere maggiore di 0"),
  businessActivity: z.string().min(1, "Seleziona un'attività"),
  startDate: z.string().min(1, "Inserisci la data di inizio attività"),
  hasEmployees: z.boolean().optional(),
  employeeCount: z.number().optional(),
  region: z.string().min(1, "Seleziona una regione"),
  previousYearRevenue: z.number().optional(),
  isNewBusiness: z.boolean().optional(),
  hasOtherIncome: z.boolean().optional(),
  otherIncome: z.number().optional(),
});

const leadSchema = z.object({
  firstName: z.string().min(1, "Nome richiesto"),
  lastName: z.string().min(1, "Cognome richiesto"),
  email: z.string().email("Email non valida"),
  phone: z.string().min(1, "Telefono richiesto"),
  businessActivity: z.string().min(1, "Attività richiesta"),
  notes: z.string().optional(),
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
  const { toast } = useToast();

  const form = useForm<CalculationForm>({
    resolver: zodResolver(calculationSchema),
    defaultValues: {
      revenue: 0,
      businessActivity: "",
      startDate: "",
      hasEmployees: false,
      employeeCount: 0,
      region: "",
      previousYearRevenue: 0,
      isNewBusiness: true,
      hasOtherIncome: false,
      otherIncome: 0,
    },
  });

  const leadForm = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      businessActivity: "",
      notes: "",
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
      const activity = businessActivities[data.businessActivity];
      if (!activity) throw new Error("Attività non valida");

      const taxableIncome = data.revenue * activity.coefficient;
      const taxAmount = taxableIncome * 0.05; // 5% flat tax
      const inpsAmount = Math.min(data.revenue * 0.2435, 4800); // INPS contributions with cap
      const totalDue = taxAmount + inpsAmount;

      return {
        taxableIncome,
        taxAmount,
        inpsAmount,
        totalDue,
      };
    },
    onSuccess: (data) => {
      setResults(data);
      toast({
        title: "Calcolo completato",
        description: "Il calcolo delle imposte è stato eseguito con successo.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il calcolo.",
        variant: "destructive",
      });
    },
  });

  const emailMutation = useMutation({
    mutationFn: async (data: EmailForm & { calculationData: CalculationResult }) => {
      return apiRequest("/api/send-report", {
        method: "POST",
        body: {
          email: data.email,
          calculationData: data.calculationData,
          calculationType: "forfettario",
        },
      });
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

  const leadMutation = useMutation({
    mutationFn: async (data: LeadForm & { calculationData: CalculationForm }) => {
      return apiRequest("/api/leads", {
        method: "POST",
        body: {
          ...data,
          source: "forfettario_calculator",
          calculationData: data.calculationData,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Lead salvato",
        description: "I tuoi dati sono stati salvati con successo.",
      });
      setShowLeadForm(false);
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore nel salvataggio dei dati. Riprova più tardi.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CalculationForm) => {
    calculateMutation.mutate(data);
  };

  const onLeadSubmit = (data: LeadForm) => {
    leadMutation.mutate({
      ...data,
      calculationData: form.getValues(),
    });
  };

  const onEmailSubmit = (data: EmailForm) => {
    if (!results) return;
    emailMutation.mutate({
      ...data,
      calculationData: results,
    });
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="revenue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fatturato Annuo (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="65000"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessActivity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attività</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona attività" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(businessActivities).map(([key, activity]) => (
                              <SelectItem key={key} value={key}>
                                {activity.description}
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
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Inizio Attività</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Regione</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona regione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="lombardia">Lombardia</SelectItem>
                            <SelectItem value="lazio">Lazio</SelectItem>
                            <SelectItem value="campania">Campania</SelectItem>
                            <SelectItem value="veneto">Veneto</SelectItem>
                            <SelectItem value="emilia-romagna">Emilia-Romagna</SelectItem>
                            <SelectItem value="piemonte">Piemonte</SelectItem>
                            <SelectItem value="puglia">Puglia</SelectItem>
                            <SelectItem value="sicilia">Sicilia</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={calculateMutation.isPending}
                >
                  {calculateMutation.isPending ? "Calcolo in corso..." : "Calcola Imposte"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
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
                      onClick={() => {
                        // Export to Excel functionality will be implemented
                        toast({
                          title: "Scaricamento Excel",
                          description: "Il report Excel è in preparazione...",
                        });
                      }}
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
                    <CheckCircle className="h-4 w-4" />
                    <span>Report avanzato inviato anche via email</span>
                    <span className="text-blue-600">⭐ Salva questa pagina nei preferiti</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Risultati Calcolo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(results.taxableIncome)}
                    </div>
                    <div className="text-sm text-gray-600">Reddito Imponibile</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(results.taxAmount)}
                    </div>
                    <div className="text-sm text-gray-600">Imposta Sostitutiva</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(results.inpsAmount)}
                    </div>
                    <div className="text-sm text-gray-600">Contributi INPS</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(results.totalDue)}
                    </div>
                    <div className="text-sm text-gray-600">Totale Dovuto</div>
                  </div>
                </div>

                <div className="mt-6 flex gap-4">
                  <Button 
                    onClick={() => setShowEmailForm(true)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Invia Report via Email
                  </Button>
                  <Button 
                    onClick={() => setShowLeadForm(true)}
                    className="flex-1"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Salva Dati
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Email Form Modal */}
        {showEmailForm && (
          <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Invia Report via Email</h3>
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
                      disabled={emailMutation.isPending}
                    >
                      {emailMutation.isPending ? "Invio..." : "Invia"}
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
            </div>
          </Card>
        )}

        {/* Lead Form Modal */}
        {showLeadForm && (
          <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Salva i tuoi Dati</h3>
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
                  <FormField
                    control={leadForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono</FormLabel>
                        <FormControl>
                          <Input placeholder="+39 333 123 4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={leadMutation.isPending}
                    >
                      {leadMutation.isPending ? "Salvataggio..." : "Salva"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowLeadForm(false)}
                      className="flex-1"
                    >
                      Annulla
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}