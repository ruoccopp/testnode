import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TAX_COEFFICIENTS, CONTRIBUTION_REGIMES, CONTRIBUTION_REDUCTIONS } from "@/lib/constants";

const businessSchema = z.object({
  businessName: z.string().min(2, "Nome attività deve avere almeno 2 caratteri"),
  macroCategory: z.string().min(1, "Seleziona una macro-categoria"),
  atecoCode: z.string().optional(),
  startDate: z.string().min(1, "Data di inizio richiesta"),
  isStartup: z.boolean().default(false),
  contributionRegime: z.string().min(1, "Seleziona il regime contributivo"),
  contributionReduction: z.string().default("NONE"),
  hasOtherCoverage: z.boolean().default(false),
  currentBalance: z.number().min(0, "Il saldo deve essere positivo").default(0),
});

type BusinessForm = z.infer<typeof businessSchema>;

interface BusinessFormProps {
  business?: any;
  onSuccess: () => void;
}

export default function BusinessForm({ business, onSuccess }: BusinessFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<BusinessForm>({
    resolver: zodResolver(businessSchema),
    defaultValues: business ? {
      businessName: business.businessName,
      macroCategory: business.macroCategory,
      atecoCode: business.atecoCode || "",
      startDate: business.startDate,
      isStartup: business.isStartup || false,
      contributionRegime: business.contributionRegime,
      contributionReduction: business.contributionReduction || "NONE",
      hasOtherCoverage: business.hasOtherCoverage || false,
      currentBalance: parseFloat(business.currentBalance || "0"),
    } : {
      businessName: "",
      macroCategory: "",
      atecoCode: "",
      startDate: "",
      isStartup: false,
      contributionRegime: "",
      contributionReduction: "NONE",
      hasOtherCoverage: false,
      currentBalance: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: BusinessForm) => {
      const url = business ? `/api/businesses/${business.id}` : "/api/businesses";
      const method = business ? "PUT" : "POST";

      // Convert currentBalance to string for backend
      const formattedData = {
        ...data,
        currentBalance: data.currentBalance.toString()
      };

      const response = await apiRequest(method, url, formattedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      toast({
        title: business ? "Attività aggiornata" : "Attività creata",
        description: business ? "L'attività è stata aggiornata con successo" : "La nuova attività è stata creata con successo",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Errore durante il salvataggio",
      });
    },
  });

  const onSubmit = (data: BusinessForm) => {
    createMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Attività</FormLabel>
                  <FormControl>
                    <Input placeholder="Es. Consulenza IT" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="macroCategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Macro-categoria</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(TAX_COEFFICIENTS).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="cursor-pointer">
                        <div className="flex flex-col py-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">
                              {config.label}
                            </span>
                            <span className="ml-2 text-sm font-bold text-blue-600">
                              ({Math.round(config.value * 100)}%)
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {config.description}
                          </p>
                          <p className="text-xs text-blue-500 mt-1 font-medium">
                            Es: {config.examples}
                          </p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Il coefficiente di redditività determina il reddito imponibile
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="atecoCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Codice ATECO (opzionale)</FormLabel>
                <FormControl>
                  <Input placeholder="Es. 62.01.00" {...field} />
                </FormControl>
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
                    {Object.entries(CONTRIBUTION_REGIMES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
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
            name="contributionReduction"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Riduzione Contributiva</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona riduzione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(CONTRIBUTION_REDUCTIONS).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Agevolazioni per nuove attività o particolari categorie
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currentBalance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Saldo Attuale (€)</FormLabel>
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
                  L'importo attualmente accantonato per questa attività
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="sm:col-span-2 space-y-4">
            <FormField
              control={form.control}
              name="isStartup"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Regime Startup</FormLabel>
                    <FormDescription>
                      Attività avviata da meno di 5 anni (aliquota fiscale del 5%)
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

            <FormField
              control={form.control}
              name="hasOtherCoverage"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Altra Copertura Previdenziale</FormLabel>
                    <FormDescription>
                      Hai già una copertura previdenziale obbligatoria?
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

        <div className="flex justify-end space-x-3">
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full sm:w-auto"
          >
            {createMutation.isPending 
              ? "Salvataggio..." 
              : business 
                ? "Aggiorna Attività" 
                : "Crea Attività"
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}