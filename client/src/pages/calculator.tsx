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
import { Calculator, Euro, Receipt, Building, Calendar, PiggyBank, AlertTriangle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import * as XLSX from 'xlsx';

const calculationSchema = z.object({
  revenue: z.number().min(0, "Il fatturato deve essere positivo").optional(),
  revenue2025: z.number().min(0, "Il fatturato presunto deve essere positivo").optional(),
  category: z.string().min(1, "Seleziona una categoria"),
  atecoCode: z.string().optional(),
  startDate: z.string().min(1, "Inserisci la data di inizio attività"),
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
      revenue2025: undefined,
      category: "",
      atecoCode: "",
      startDate: "",
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
        macroCategory: data.category,
        isStartup: data.isStartup,
        startDate: data.startDate,
        contributionRegime: data.contributionRegime,
        hasOtherCoverage: false,
        year: 2024, // Fixed to 2024 for consistency
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

  const exportToExcel = () => {
    if (!results) {
      toast({
        title: "Errore",
        description: "Effettua prima un calcolo per esportare i dati",
        variant: "destructive",
      });
      return;
    }

    const formData = form.getValues();
    const revenue2025 = formData.revenue2025 || 0;
    const startDate = formData.startDate;
    const isStartup2025 = startDate ? (2025 - new Date(startDate).getFullYear()) < 5 : false;
    
    // Calcola tasse 2025 per scadenze 2026
    const taxableIncome2025 = revenue2025 * 0.78;
    const taxRate2025 = isStartup2025 ? 0.05 : 0.15;
    const taxAmount2025 = taxableIncome2025 * taxRate2025;
    const inpsAmount2025 = taxableIncome2025 * 0.26;

    // Dati di input
    const inputData = [
      ['DATI ATTIVITÀ', ''],
      ['Fatturato 2024', formatCurrency(formData.revenue || 0)],
      ['Fatturato Presunto 2025', formatCurrency(revenue2025)],
      ['Codice ATECO', formData.atecoCode || 'Non specificato'],
      ['Data Inizio Attività', formData.startDate || 'Non specificata'],
      ['Categoria Attività', formData.category],
      ['Regime Startup', formData.isStartup ? 'Sì (5%)' : 'No (15%)'],
      ['Regime Contributivo', formData.contributionRegime],
      ['Saldo Attuale', formatCurrency(formData.currentBalance || 0)],
      ['', ''],
    ];

    // Risultati calcoli 2024
    const resultsData = [
      ['CALCOLI 2024', ''],
      ['Reddito Imponibile', formatCurrency(results.taxableIncome)],
      ['Imposte Sostitutive', formatCurrency(results.taxAmount)],
      ['Contributi INPS', formatCurrency(results.inpsAmount)],
      ['Totale da Accantonare', formatCurrency(results.totalDue)],
      ['', ''],
    ];

    // Scadenze 2025
    const scadenze2025 = [
      ['SCADENZE 2025', ''],
      ['30 Giugno 2025', formatCurrency(results.taxAmount + results.inpsAmount * 0.4), 'Saldo 2024 + 1° Acconto 2025'],
      ['30 Novembre 2025', formatCurrency(results.taxAmount * 0.4), '2° Acconto 2025'],
      ['Rate INPS Trimestrali', formatCurrency(results.inpsAmount / 4), 'Per rata (16 Gen, 16 Mag, 20 Ago, 16 Nov)'],
      ['', ''],
    ];

    // Scadenze 2026 (se disponibili)
    const scadenze2026 = revenue2025 > 0 ? [
      ['SCADENZE 2026 PREVISTE', ''],
      ['30 Giugno 2026', formatCurrency(taxAmount2025 + inpsAmount2025 * 0.4), 'Saldo 2025 + 1° Acconto 2026'],
      ['30 Novembre 2026', formatCurrency(taxAmount2025 * 0.4), '2° Acconto 2026'],
      ['', ''],
    ] : [];

    // Piano di accantonamento
    const now = new Date();
    const prossima = new Date('2025-06-30');
    const mesiMancanti = Math.max(1, Math.ceil((prossima.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    const importoProssimo = results.taxAmount + results.inpsAmount * 0.4;
    const servePerProssimo = Math.max(0, importoProssimo - (formData.currentBalance || 0));
    const rataMessileProssimo = servePerProssimo / mesiMancanti;
    const rataMessileSecondo = (results.taxAmount * 0.4) / 5;
    const rataMessileINPS = (results.inpsAmount / 4) / 3;
    const totaleMessile = rataMessileProssimo + rataMessileSecondo + rataMessileINPS;

    const pianoAccantonamento = [
      ['PIANO ACCANTONAMENTO MENSILE', ''],
      ['Per prossima scadenza (30 Giu 2025)', formatCurrency(rataMessileProssimo), `${mesiMancanti} mesi rimanenti`],
      ['Per seconda scadenza (30 Nov 2025)', formatCurrency(rataMessileSecondo), '5 mesi (Lug-Nov)'],
      ['Per rate INPS', formatCurrency(rataMessileINPS), 'Distribuite nei mesi'],
      ['TOTALE MENSILE CONSIGLIATO', formatCurrency(totaleMessile), 'Da accantonare ogni mese'],
    ];

    // Combina tutti i dati
    const allData = [
      ...inputData,
      ...resultsData,
      ...scadenze2025,
      ...scadenze2026,
      ...pianoAccantonamento
    ];

    // Crea il workbook
    const ws = XLSX.utils.aoa_to_sheet(allData);
    const wb = XLSX.utils.book_new();
    
    // Imposta larghezza colonne
    ws['!cols'] = [
      { width: 30 },
      { width: 20 },
      { width: 30 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Calcolo Tasse');
    
    // Esporta il file
    const fileName = `calcolo-tasse-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Esportazione completata!",
      description: `File ${fileName} scaricato con successo`,
    });
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
          {results && (
            <div className="mt-4 flex md:mt-0">
              <Button
                onClick={exportToExcel}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Esporta in Excel
              </Button>
            </div>
          )}
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
                    name="revenue2025"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-green-700 font-medium">🎯 Fatturato Presunto 2025 (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="es: 55000"
                            className="text-lg font-medium border-green-200"
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
                        <FormLabel>📋 Codice ATECO (facoltativo)</FormLabel>
                        <FormControl>
                          <Input placeholder="es: 62.01.00" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>📅 Data Inizio Attività</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            className="text-lg"
                          />
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
                    render={({ field }) => {
                      const startDate = form.watch('startDate');
                      const isEligibleForStartup = startDate ? 
                        (new Date().getFullYear() - new Date(startDate).getFullYear()) < 5 : false;
                      
                      return (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>🚀 Regime Startup</FormLabel>
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
                  Calendario Scadenze Fiscali
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Scadenze 2025 */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">📅 Scadenze 2025</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-red-50 rounded-lg text-sm">
                        <div>
                          <p className="font-medium text-red-900">30 Giugno 2025</p>
                          <p className="text-xs text-red-700">Saldo 2024 + 1° Acconto 2025</p>
                        </div>
                        <p className="font-bold text-red-900">
                          {formatCurrency(results.taxAmount + results.inpsAmount * 0.4)}
                        </p>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded-lg text-sm">
                        <div>
                          <p className="font-medium text-orange-900">30 Novembre 2025</p>
                          <p className="text-xs text-orange-700">2° Acconto 2025</p>
                        </div>
                        <p className="font-bold text-orange-900">
                          {formatCurrency(results.taxAmount * 0.6)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Scadenze 2026 - se c'è fatturato 2025 */}
                  {form.getValues('revenue2025') && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">📅 Scadenze 2026 Previste</h4>
                      {(() => {
                        const revenue2025 = form.getValues('revenue2025') || 0;
                        const startDate = form.getValues('startDate');
                        const isStartup2025 = startDate ? 
                          (2025 - new Date(startDate).getFullYear()) < 5 : false;
                        
                        // Calcola tasse 2025 per scadenze 2026
                        const taxableIncome2025 = revenue2025 * 0.78; // Assumendo stessa categoria
                        const taxRate2025 = isStartup2025 ? 0.05 : 0.15;
                        const taxAmount2025 = taxableIncome2025 * taxRate2025;
                        const inpsAmount2025 = taxableIncome2025 * 0.26;

                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg text-sm">
                              <div>
                                <p className="font-medium text-purple-900">30 Giugno 2026</p>
                                <p className="text-xs text-purple-700">Saldo 2025 + 1° Acconto 2026</p>
                              </div>
                              <p className="font-bold text-purple-900">
                                {formatCurrency(taxAmount2025 + inpsAmount2025 * 0.4)}
                              </p>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-indigo-50 rounded-lg text-sm">
                              <div>
                                <p className="font-medium text-indigo-900">30 Novembre 2026</p>
                                <p className="text-xs text-indigo-700">2° Acconto 2026</p>
                              </div>
                              <p className="font-bold text-indigo-900">
                                {formatCurrency(taxAmount2025 * 0.4)}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Rate INPS */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">🏥 Rate INPS Ricorrenti</h4>
                    <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg text-sm">
                      <div>
                        <p className="font-medium text-blue-900">Trimestrali 2025</p>
                        <p className="text-xs text-blue-700">16 Gen, 16 Mag, 20 Ago, 16 Nov</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-900">
                          {formatCurrency(results.inpsAmount / 4)}
                        </p>
                        <p className="text-xs text-blue-700">per rata</p>
                      </div>
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
