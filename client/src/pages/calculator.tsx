import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calculator, Building, Euro, Calendar, Download } from "lucide-react";

const calculationSchema = z.object({
  revenue: z.number().min(0, "Il fatturato deve essere positivo").optional(),
  revenue2025: z.number().min(0, "Il fatturato presunto deve essere positivo").optional(),
  category: z.string().min(1, "Seleziona una categoria"),
  startDate: z.string().min(1, "Inserisci la data di inizio attività"),
  isStartup: z.boolean().default(false),
  contributionRegime: z.string().min(1, "Seleziona il regime contributivo"),
  contributionReduction: z.string().default("NONE"),
  currentBalance: z.number().min(0, "Il saldo deve essere positivo").optional(),
});

type CalculationForm = z.infer<typeof calculationSchema>;

interface CalculationResult {
  taxableIncome: number;
  taxAmount: number;
  inpsAmount: number;
  totalDue: number;
}

const CATEGORIES = {
  FOOD_COMMERCE: {
    label: "Commercio Alimentare",
    value: 0.40,
    description: "Commercio di prodotti alimentari e bevande",
    examples: "Bar, ristorante, alimentari",
  },
  MANUFACTURING: {
    label: "Produzione Beni",
    value: 0.86,
    description: "Produzione di beni materiali",
    examples: "Produzione artigianale, manifattura",
  },
  PROFESSIONAL: {
    label: "Consulenza/Servizi Professionali",
    value: 0.78,
    description: "Attività professionali, consulenze, servizi (es. avvocati, commercialisti, web developer)",
    examples: "Avvocato, commercialista, web developer, consulente marketing",
  },
  OTHER_ACTIVITIES: {
    label: "Altre Attività",
    value: 0.67,
    description: "Attività non specificate in altre categorie (es. artigiani senza cassa specifica)",
    examples: "Sarto, calzolaio, restauratore",
  },
  INTERMEDIARIES: {
    label: "Intermediazione",
    value: 0.62,
    description: "Attività di intermediazione commerciale (es. agenti, rappresentanti)",
    examples: "Agente di commercio, rappresentante",
  },
  STREET_COMMERCE: {
    label: "Commercio Ambulante",
    value: 0.54,
    description: "Commercio su aree pubbliche e ambulante",
    examples: "Venditore ambulante, mercatini",
  },
  TRANSPORT: {
    label: "Trasporto Merci/Persone",
    value: 0.78,
    description: "Servizi di trasporto e logistica",
    examples: "Corriere, taxi, noleggio con conducente",
  },
  ENTERTAINMENT: {
    label: "Spettacolo/Sport",
    value: 0.78,
    description: "Attività di intrattenimento e sportive",
    examples: "Musicista, personal trainer, animatore",
  },
  CONSTRUCTION: {
    label: "Costruzioni",
    value: 0.86,
    description: "Attività di costruzione e ristrutturazione edile",
    examples: "Imbianchino, elettricista, idraulico",
  },
  GENERAL_COMMERCE: {
    label: "Commercio Generale",
    value: 0.40,
    description: "Commercio al dettaglio e all'ingrosso",
    examples: "Negozio abbigliamento, ferramenta, libreria",
  },
};

export default function CalculatorPage() {
  const [results, setResults] = useState<CalculationResult | null>(null);
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
      toast({
        title: "Calcolo completato",
        description: "Le imposte sono state calcolate con successo",
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

  const onSubmit = (data: CalculationForm) => {
    calculateMutation.mutate(data);
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
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              💰 Pianificatore Imposte Forfettari
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Calcola imposte e contributi per il regime forfettario italiano
            </p>
          </div>
        </div>
      </div>

      {/* Calculator Form */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Fatturato */}
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-blue-900 mb-4">📊 Fatturato</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="revenue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>💼 Fatturato 2024 (€)</FormLabel>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona la tua categoria di attività" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(CATEGORIES).map(([key, category]) => (
                            <SelectItem key={key} value={key}>
                              {category.label} ({(category.value * 100).toFixed(0)}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

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

              {/* Contributi INPS */}
              <div className="bg-green-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-green-900 mb-4">🏥 Contributi INPS</h3>
                <FormField
                  control={form.control}
                  name="contributionRegime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>💼 Regime Contributivo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona il tuo regime contributivo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="GESTIONE_SEPARATA">Gestione Separata INPS (26%)</SelectItem>
                          <SelectItem value="IVS_ARTIGIANI">IVS Artigiani</SelectItem>
                          <SelectItem value="IVS_COMMERCIANTI">IVS Commercianti</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {/* Riduzioni Contributive */}
                {(form.watch('contributionRegime') === 'IVS_ARTIGIANI' || form.watch('contributionRegime') === 'IVS_COMMERCIANTI') && (
                  <FormField
                    control={form.control}
                    name="contributionReduction"
                    render={({ field }) => {
                      const startDate = form.watch('startDate');
                      const isNewIn2025 = startDate ? new Date(startDate).getFullYear() === 2025 : false;
                      
                      return (
                        <FormItem className="mt-4">
                          <FormLabel>🎯 Riduzioni Contributive INPS</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona riduzione contributiva" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NONE">Nessuna riduzione</SelectItem>
                              <SelectItem value="REDUCTION_35">
                                🔸 Riduzione 35% (Art. 1, comma 77, L. 190/2014)
                              </SelectItem>
                              {isNewIn2025 && (
                                <SelectItem value="REDUCTION_50">
                                  🔹 Riduzione 50% (Nuovi iscritti 2025 - 36 mesi)
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <div className="text-sm text-gray-500 mt-2">
                            {field.value === 'REDUCTION_35' && (
                              <p>✅ Riduzione del 35% su quota fissa ed eccedente.</p>
                            )}
                            {field.value === 'REDUCTION_50' && (
                              <p>✅ Riduzione del 50% per nuovi iscritti 2025 (primi 36 mesi).</p>
                            )}
                            {field.value === 'NONE' && (
                              <p>💡 Le riduzioni contributive possono ridurre i contributi INPS.</p>
                            )}
                          </div>
                        </FormItem>
                      );
                    }}
                  />
                )}
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
                className="w-full text-lg py-3"
                disabled={calculateMutation.isPending}
              >
                <Calculator className="mr-2 h-5 w-5" />
                {calculateMutation.isPending ? "Calcolo in corso..." : "Calcola Imposte"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardContent className="p-6">
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

          {/* Piano di Accantonamento */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-6 text-gray-900">💰 Piano di Accantonamento Mensile</h3>
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-4">Accantonamenti Consigliati</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-blue-200">
                        <span className="text-blue-700">Imposte (mensile):</span>
                        <span className="font-semibold text-blue-900">{formatCurrency(results.totalDue / 12)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-blue-200">
                        <span className="text-blue-700">Solo Tasse:</span>
                        <span className="font-semibold text-blue-900">{formatCurrency(results.taxAmount / 12)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-blue-200">
                        <span className="text-blue-700">Solo INPS:</span>
                        <span className="font-semibold text-blue-900">{formatCurrency(results.inpsAmount / 12)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-4">Percentuali di Ricavo</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-blue-700">% Tasse su fatturato:</span>
                        <span className="font-semibold text-blue-900">{((results.taxAmount / (form.watch('revenue') || 1)) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-blue-700">% INPS su fatturato:</span>
                        <span className="font-semibold text-blue-900">{((results.inpsAmount / (form.watch('revenue') || 1)) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-t border-blue-200">
                        <span className="text-blue-700 font-semibold">% Totale da accantonare:</span>
                        <span className="font-bold text-blue-900">{((results.totalDue / (form.watch('revenue') || 1)) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Download Report */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">📄 Report Completo</h3>
                  <p className="text-gray-600">Scarica il report dettagliato con tutti i calcoli e le scadenze</p>
                </div>
                <Button 
                  onClick={() => {
                    // Funzionalità di download (placeholder)
                    toast({
                      title: "Download avviato",
                      description: "Il report Excel verrà scaricato a breve",
                    });
                  }}
                  className="bg-green-600 hover:bg-green-700"
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