import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building, Edit, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import BusinessForm from "@/components/forms/business-form";
import { TAX_COEFFICIENTS, CONTRIBUTION_REGIMES } from "@/lib/constants";

export default function Businesses() {
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["/api/businesses"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/businesses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      toast({
        title: "Attività eliminata",
        description: "L'attività è stata eliminata con successo",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Errore durante l'eliminazione",
      });
    },
  });

  const handleEdit = (business: any) => {
    setSelectedBusiness(business);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedBusiness(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Sei sicuro di voler eliminare questa attività?")) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Le Tue Attività
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Gestisci le tue attività in regime forfettario
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Le Tue Attività
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Gestisci le tue attività in regime forfettario
            </p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAdd} className="inline-flex items-center gap-x-1.5">
                  <Plus className="h-4 w-4" />
                  Nuova Attività
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {selectedBusiness ? "Modifica Attività" : "Nuova Attività"}
                  </DialogTitle>
                </DialogHeader>
                <BusinessForm
                  business={selectedBusiness}
                  onSuccess={() => setDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Businesses Grid */}
      {businesses?.length === 0 ? (
        <div className="text-center py-12">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nessuna attività</h3>
          <p className="mt-1 text-sm text-gray-500">
            Inizia aggiungendo la tua prima attività in regime forfettario.
          </p>
          <div className="mt-6">
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Nuova Attività
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {businesses?.map((business: any) => (
            <Card key={business.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{business.businessName}</CardTitle>
                    <CardDescription>
                      {TAX_COEFFICIENTS[business.macroCategory as keyof typeof TAX_COEFFICIENTS]?.label}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(business)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(business.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Codice ATECO:</span>
                    <span className="font-medium">{business.atecoCode || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Data inizio:</span>
                    <span className="font-medium">{formatDate(business.startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Regime contributivo:</span>
                    <span className="font-medium">
                      {CONTRIBUTION_REGIMES[business.contributionRegime as keyof typeof CONTRIBUTION_REGIMES]}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Saldo attuale:</span>
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(business.currentBalance || "0")}
                    </span>
                  </div>
                  {business.isStartup && (
                    <div className="mt-3">
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        Regime startup (5%)
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
