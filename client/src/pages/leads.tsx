
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Mail, Building, Calendar, Edit, Trash, Download, Eye, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const BUSINESS_SECTORS = {
  RETAIL: "Commercio al dettaglio",
  WHOLESALE: "Commercio all'ingrosso", 
  SERVICES: "Servizi",
  PROFESSIONAL: "Servizi professionali",
  MANUFACTURING: "Produzione",
  CONSTRUCTION: "Edilizia",
  TRANSPORT: "Trasporti",
  HOSPITALITY: "Ristorazione/Ospitalità",
  TECHNOLOGY: "Tecnologia/IT",
  HEALTHCARE: "Sanità/Benessere",
  EDUCATION: "Istruzione/Formazione",
  AGRICULTURE: "Agricoltura",
  REAL_ESTATE: "Immobiliare",
  FINANCE: "Finanza/Assicurazioni",
  OTHER: "Altro"
};

const STATUS_COLORS = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-yellow-100 text-yellow-800",
  CONVERTED: "bg-green-100 text-green-800",
  LOST: "bg-red-100 text-red-800",
};

const STATUS_LABELS = {
  NEW: "Nuovo",
  CONTACTED: "Contattato",
  CONVERTED: "Convertito",
  LOST: "Perso",
};

export default function LeadsPage() {
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["/api/leads"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/leads/stats"],
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PUT', `/api/leads/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      setEditDialogOpen(false);
      toast({
        title: "Lead aggiornato",
        description: "Il lead è stato aggiornato con successo",
      });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/leads/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      toast({
        title: "Lead eliminato",
        description: "Il lead è stato eliminato con successo",
      });
    },
  });

  const handleExport = async () => {
    try {
      const response = await apiRequest('GET', '/api/leads/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export completato",
        description: "Il file CSV è stato scaricato",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore nell'export",
        description: "Impossibile scaricare il file",
      });
    }
  };

  const filteredLeads = leads?.filter((lead: any) => {
    const matchesStatus = statusFilter === "ALL" || lead.status === statusFilter;
    const matchesSearch = searchTerm === "" || 
      lead.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg text-gray-600">Caricamento leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Leads</h1>
          <p className="text-gray-600">Gestisci e monitora i tuoi potenziali clienti</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Esporta CSV
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Totale Leads</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Questo Mese</p>
                  <p className="text-2xl font-bold">{stats.thisMonth}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-600">Nuovi</p>
                  <p className="text-2xl font-bold">{stats.new}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-600">Contattati</p>
                  <p className="text-2xl font-bold">{stats.contacted}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-600">Convertiti</p>
                  <p className="text-2xl font-bold">{stats.converted}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Cerca</Label>
              <Input
                id="search"
                placeholder="Cerca per nome, cognome o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="status">Stato</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtra per stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tutti</SelectItem>
                  <SelectItem value="NEW">Nuovi</SelectItem>
                  <SelectItem value="CONTACTED">Contattati</SelectItem>
                  <SelectItem value="CONVERTED">Convertiti</SelectItem>
                  <SelectItem value="LOST">Persi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leads ({filteredLeads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Settore</TableHead>
                  <TableHead>Fatturato</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead: any) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      {lead.firstName} {lead.lastName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{lead.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {BUSINESS_SECTORS[lead.businessSector as keyof typeof BUSINESS_SECTORS]}
                    </TableCell>
                    <TableCell>
                      {lead.revenue ? formatCurrency(lead.revenue) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[lead.status as keyof typeof STATUS_COLORS]}>
                        {STATUS_LABELS[lead.status as keyof typeof STATUS_LABELS]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(lead.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLead(lead);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLead(lead);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Sei sicuro di voler eliminare questo lead?")) {
                              deleteLeadMutation.mutate(lead.id);
                            }
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Lead Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dettagli Lead</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome Completo</Label>
                  <p className="font-medium">{selectedLead.firstName} {selectedLead.lastName}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="font-medium">{selectedLead.email}</p>
                </div>
                <div>
                  <Label>Settore</Label>
                  <p className="font-medium">
                    {BUSINESS_SECTORS[selectedLead.businessSector as keyof typeof BUSINESS_SECTORS]}
                  </p>
                </div>
                <div>
                  <Label>Fatturato</Label>
                  <p className="font-medium">
                    {selectedLead.revenue ? formatCurrency(selectedLead.revenue) : "-"}
                  </p>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <p className="font-medium">{selectedLead.category || "-"}</p>
                </div>
                <div>
                  <Label>Data Creazione</Label>
                  <p className="font-medium">{formatDate(selectedLead.createdAt)}</p>
                </div>
              </div>
              {selectedLead.notes && (
                <div>
                  <Label>Note</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-md">{selectedLead.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Lead</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const data = {
                  status: formData.get('status') as string,
                  notes: formData.get('notes') as string,
                };
                updateLeadMutation.mutate({ id: selectedLead.id, data });
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="status">Stato</Label>
                <Select name="status" defaultValue={selectedLead.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">Nuovo</SelectItem>
                    <SelectItem value="CONTACTED">Contattato</SelectItem>
                    <SelectItem value="CONVERTED">Convertito</SelectItem>
                    <SelectItem value="LOST">Perso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Note</Label>
                <Textarea
                  name="notes"
                  placeholder="Aggiungi note sul lead..."
                  defaultValue={selectedLead.notes || ""}
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={updateLeadMutation.isPending}>
                  {updateLeadMutation.isPending ? "Salvataggio..." : "Salva"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
