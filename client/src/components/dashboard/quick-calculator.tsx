import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const calculationSchema = z.object({
  businessId: z.string().min(1, "Seleziona un'attività"),
  revenue: z.number().min(0, "Il fatturato deve essere positivo"),
  year: z.number().int().min(2020).max(2030),
});

type CalculationForm = z.infer<typeof calculationSchema>;

interface CalculationResult {
  taxableIncome: number;
  taxAmount: number;
  inpsAmount: number;
  totalDue: number;
}

export default function QuickCalculator() {
  const [results, setResults] = useState<CalculationResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: businesses, isLoading: businessesLoading } = useQuery({
    queryKey: ["/api/businesses"],
  });

  const form = useForm<CalculationForm>({
    resolver: zodResolver(calculationSchema),
    defaultValues: {
      businessId: "",
      revenue: 0,
      year: new Date().getFullYear(),
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async (data: CalculationForm) => {
      const response = await apiRequest('POST', '/api/calculations/tax', {
        businessId: parseInt(data.businessId),
        revenue: data.revenue,
        year: data.year,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setResults(data);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
    <div className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold leading-6 text-gray-900">
            💰 Calcola le Imposte 2024
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Inserisci il tuo fatturato totale del 2024 per calcolare imposte e contributi da versare
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="businessId"
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
                          {businesses && Array.isArray(businesses) ? businesses.map((business: any) => (
                            <SelectItem key={business.id} value={business.id.toString()}>
                              {business.businessName}
                            </SelectItem>
                          )) : (
                            <SelectItem value="no-business" disabled>
                              Nessuna attività trovata
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="revenue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-blue-700 font-medium">💼 Fatturato Totale 2024 (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Es: 45.000"
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
                <div className="flex items-end">
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={calculateMutation.isPending || businessesLoading}
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    {calculateMutation.isPending ? "Calcolo..." : "Calcola"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>

          {/* Calculation Results */}
          {results && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-900">Reddito Imponibile</div>
                  <div className="text-lg font-semibold text-blue-900">
                    {formatCurrency(results.taxableIncome)}
                  </div>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-amber-900">Imposte (15%)</div>
                  <div className="text-lg font-semibold text-amber-900">
                    {formatCurrency(results.taxAmount)}
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-red-900">Contributi INPS</div>
                  <div className="text-lg font-semibold text-red-900">
                    {formatCurrency(results.inpsAmount)}
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">Totale da Accantonare:</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(results.totalDue)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
