import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calculator, Euro, Receipt, Building, Calendar, PiggyBank, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const calculationSchema = z.object({
  revenue: z.number().min(0, "Il fatturato deve essere positivo").optional(),
  category: z.string().min(1, "Seleziona una categoria"),
  atecoCode: z.string().optional(),
  year: z.number().int().min(2020).max(2030),
  isStartup: z.boolean().default(false),
  contributionRegime: z.string().min(1, "Seleziona il regime contributivo"),
  currentBalance: z.number().min(0, "Il saldo deve essere positivo").optional(),
});

type CalculationForm = z.infer<typeof calculationSchema>;

interface CalculationResult {
  taxableIncome: number;
  taxAmount: number;
  inpsAmount: number;
  totalDue: number;
}

export default function CalculatorPage() {
  const [results, setResults] = useState<CalculationResult | null>(null);
  const { toast } = useToast();

  const form = useForm<CalculationForm>({
    resolver: zodResolver(calculationSchema),
    defaultValues: {
      revenue: undefined,
      category: "",
      atecoCode: "",
      year: 2024,
      isStartup: false,
      contributionRegime: "",
      currentBalance: undefined,
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async (data: CalculationForm) => {
      const response = await apiRequest('POST', '/api/calculations/tax', {
        businessId: 1, // Demo business ID
        revenue: data.revenue,
        year: data.year,
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
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              💰 Calcolatore Imposte 2024
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Calcola imposte e contributi per il regime forfettario italiano
            </p>
          </div>
        </div>
      </div>

      {/* Calculator Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Inserisci i tuoi dati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Dati Principali */}
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-blue-900 mb-4">📊 Dati Attività</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="revenue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-700 font-medium">💼 Fatturato Totale 2024 (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="es: 50000"
                            className="text-lg font-medium border-blue-200"
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
                    name="atecoCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>📋 Codice ATECO</FormLabel>
                        <FormControl>
                          <Input placeholder="es: 62.01.00" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Categoria e Regime */}
              <div className="bg-amber-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-amber-900 mb-4">⚖️ Regime Fiscale</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria Attività</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PROFESSIONAL">Consulenza/Servizi Professionali (78%)</SelectItem>
                            <SelectItem value="OTHER_ACTIVITIES">Altre Attività (67%)</SelectItem>
                            <SelectItem value="INTERMEDIARIES">Intermediazione (62%)</SelectItem>
                            <SelectItem value="STREET_COMMERCE">Commercio Ambulante (54%)</SelectItem>
                            <SelectItem value="FOOD_COMMERCE">Commercio Alimentare (40%)</SelectItem>
                            <SelectItem value="CONSTRUCTION">Costruzioni (86%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isStartup"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>🚀 Regime Startup</FormLabel>
                          <div className="text-sm text-gray-500">
                            Tasse al 5% per i primi 5 anni
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

              {/* Contributi INPS */}
              <div className="bg-green-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-green-900 mb-4">🏥 Contributi INPS</h3>
                <FormField
                  control={form.control}
                  name="contributionRegime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regime Contributivo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona regime" />
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
                  <Receipt className="h-8 w-8 text-amber-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Imposte Sostitutive</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(results.taxAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Euro className="h-8 w-8 text-red-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Contributi INPS</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(results.inpsAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calculator className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">Totale da Accantonare</p>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(results.totalDue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Situazione Finanziaria e Scadenze */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
            {/* Piano di Accantonamento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PiggyBank className="h-5 w-5 text-green-600" />
                  Piano di Accantonamento Intelligente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Situazione Attuale */}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">💰 Saldo Attuale:</span>
                      <span className="text-lg font-bold text-blue-700">{formatCurrency(form.getValues('currentBalance') || 0)}</span>
                    </div>
                  </div>

                  {/* Prossima Scadenza - 30 Giugno 2025 */}
                  {(() => {
                    const now = new Date();
                    const prossima = new Date('2025-06-30');
                    const mesiMancanti = Math.max(1, Math.ceil((prossima.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                    const importoProssimo = results.taxAmount + results.inpsAmount * 0.4;
                    const servePerProssimo = Math.max(0, importoProssimo - (form.getValues('currentBalance') || 0));
                    const rataMessileProssimo = servePerProssimo / mesiMancanti;

                    return (
                      <div className="bg-red-50 p-3 rounded-lg border-2 border-red-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-red-800">🚨 Prossima: 30 Giugno 2025</span>
                          <span className="text-lg font-bold text-red-700">{formatCurrency(importoProssimo)}</span>
                        </div>
                        {servePerProssimo > 0 && (
                          <div className="bg-white p-2 rounded border">
                            <div className="flex justify-between text-sm">
                              <span>Ti serve ancora:</span>
                              <span className="font-bold text-red-600">{formatCurrency(servePerProssimo)}</span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                              <span>Mesi rimanenti: {mesiMancanti}</span>
                              <span className="font-bold text-green-600">{formatCurrency(rataMessileProssimo)}/mese</span>
                            </div>
                          </div>
                        )}
                        {servePerProssimo <= 0 && (
                          <div className="bg-green-100 p-2 rounded border">
                            <span className="text-sm text-green-800">✅ Hai già abbastanza per questa scadenza!</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Seconda Scadenza - 30 Novembre 2025 */}
                  {(() => {
                    const now = new Date();
                    const seconda = new Date('2025-11-30');
                    const mesiDaGiugno = Math.ceil((seconda.getTime() - new Date('2025-06-30').getTime()) / (1000 * 60 * 60 * 24 * 30));
                    const importoSecondo = results.taxAmount * 0.4;
                    const rataMessileSecondo = importoSecondo / mesiDaGiugno;

                    return (
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-orange-800">📅 30 Novembre 2025</span>
                          <span className="text-lg font-bold text-orange-700">{formatCurrency(importoSecondo)}</span>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <div className="flex justify-between text-sm">
                            <span>Da Luglio a Novembre ({mesiDaGiugno} mesi):</span>
                            <span className="font-bold text-orange-600">{formatCurrency(rataMessileSecondo)}/mese</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Rate INPS Trimestrali */}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-blue-800">🏥 Rate INPS Trimestrali</span>
                      <span className="text-lg font-bold text-blue-700">{formatCurrency(results.inpsAmount / 4)}</span>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>16 Gennaio: ogni 3 mesi</span>
                          <span className="font-bold">{formatCurrency(results.inpsAmount / 4 / 3)}/mese</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Totale Accantonamento Mensile Consigliato */}
                  {(() => {
                    const now = new Date();
                    const prossima = new Date('2025-06-30');
                    const mesiMancanti = Math.max(1, Math.ceil((prossima.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                    const importoProssimo = results.taxAmount + results.inpsAmount * 0.4;
                    const servePerProssimo = Math.max(0, importoProssimo - (form.getValues('currentBalance') || 0));
                    const rataMessileProssimo = servePerProssimo / mesiMancanti;
                    const rataMessileSecondo = (results.taxAmount * 0.4) / 5; // 5 mesi da luglio a novembre
                    const rataMessileINPS = (results.inpsAmount / 4) / 3; // ogni 3 mesi
                    const totaleMessile = rataMessileProssimo + rataMessileSecondo + rataMessileINPS;

                    return (
                      <div className="bg-gradient-to-r from-green-100 to-blue-100 p-4 rounded-lg border-2 border-green-300">
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-700 mb-1">💡 Accantonamento Mensile Consigliato</div>
                          <div className="text-3xl font-bold text-green-700">{formatCurrency(totaleMessile)}</div>
                          <div className="text-xs text-gray-600 mt-1">per coprire tutte le scadenze future</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Scadenze Fiscali */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-red-600" />
                  Prossime Scadenze 2025
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-red-900">30 Giugno 2025</p>
                      <p className="text-sm text-red-700">Saldo 2024 + 1° Acconto 2025</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-900">
                        {formatCurrency(results.taxAmount + results.inpsAmount * 0.4)}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium text-orange-900">30 Novembre 2025</p>
                      <p className="text-sm text-orange-700">2° Acconto 2025</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-900">
                        {formatCurrency(results.taxAmount * 0.4)}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-blue-900">Trimestrali INPS</p>
                      <p className="text-sm text-blue-700">16 Gen, 16 Mag, 20 Ago, 16 Nov</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-900">
                        {formatCurrency(results.inpsAmount / 4)}
                      </p>
                      <p className="text-xs text-blue-700">per rata</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
