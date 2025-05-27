import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MONTHS } from "@/lib/constants";

const invoiceSchema = z.object({
  businessId: z.string().min(1, "Seleziona un'attività"),
  year: z.number().int().min(2020).max(2030),
  month: z.number().int().min(1).max(12),
  amount: z.number().min(0.01, "L'importo deve essere superiore a zero"),
  description: z.string().optional(),
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  invoice?: any;
  onSuccess: () => void;
}

export default function InvoiceForm({ invoice, onSuccess }: InvoiceFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: businesses, isLoading: businessesLoading } = useQuery({
    queryKey: ["/api/businesses"],
  });

  const form = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: invoice ? {
      businessId: invoice.businessId.toString(),
      year: invoice.year,
      month: invoice.month,
      amount: parseFloat(invoice.amount),
      description: invoice.description || "",
    } : {
      businessId: "",
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      amount: 0,
      description: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: InvoiceForm) => {
      if (invoice) {
        // Update existing invoice
        const response = await apiRequest('PUT', `/api/invoices/${invoice.id}`, {
          year: data.year,
          month: data.month,
          amount: data.amount.toString(),
          description: data.description,
        });
        return response.json();
      } else {
        // Create new invoice
        const response = await apiRequest('POST', `/api/businesses/${data.businessId}/invoices`, {
          year: data.year,
          month: data.month,
          amount: data.amount.toString(),
          description: data.description,
        });
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      // Invalidate invoices for all businesses
      businesses?.forEach((business: any) => {
        queryClient.invalidateQueries({ queryKey: [`/api/businesses/${business.id}/invoices`] });
      });
      toast({
        title: invoice ? "Fattura aggiornata" : "Fattura registrata",
        description: invoice ? "La fattura è stata aggiornata con successo" : "La nuova fattura è stata registrata con successo",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Errore durante il salvataggio della fattura",
      });
    },
  });

  const onSubmit = (data: InvoiceForm) => {
    saveMutation.mutate(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {!invoice && (
            <div className="sm:col-span-2">
              <FormField
                control={form.control}
                name="businessId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attività</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un'attività" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {businesses?.map((business: any) => (
                          <SelectItem key={business.id} value={business.id.toString()}>
                            {business.businessName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Anno</FormLabel>
                <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Array.from({ length: 11 }, (_, i) => {
                      const year = new Date().getFullYear() - 5 + i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="month"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mese</FormLabel>
                <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={index + 1} value={(index + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="sm:col-span-2">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Importo (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value > 0 && `Importo: ${formatCurrency(field.value)}`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="sm:col-span-2">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrizione della fattura o del servizio..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Aggiungi una descrizione per identificare facilmente la fattura
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="submit"
            disabled={saveMutation.isPending || businessesLoading}
            className="w-full sm:w-auto"
          >
            {saveMutation.isPending 
              ? "Salvataggio..." 
              : invoice 
                ? "Aggiorna Fattura" 
                : "Registra Fattura"
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
