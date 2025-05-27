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
import { Calculator, Euro, Receipt, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const calculationSchema = z.object({
  revenue: z.number().min(0, "Il fatturato deve essere positivo"),
  category: z.string().min(1, "Seleziona una categoria"),
  year: z.number().int().min(2020).max(2030),
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
      revenue: 0,
      category: "",
      year: 2024,
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
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="revenue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-blue-700 font-medium">💼 Fatturato Totale (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="50000"
                          className="text-lg font-medium border-blue-200 focus:border-blue-500"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
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
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anno Fiscale</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                        </SelectContent>
                      </Select>
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
      )}
    </div>
  );
}
