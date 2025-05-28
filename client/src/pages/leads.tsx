import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Eye, MessageSquare, Download, Search, Filter, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import logoPath from "@assets/SmartRate - Colors.png";

interface Lead {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  businessSector: string;
  revenue: string;
  category: string;
  startDate: string;
  isStartup: boolean;
  contributionRegime: string;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-yellow-100 text-yellow-800", 
  CONVERTED: "bg-green-100 text-green-800",
  LOST: "bg-red-100 text-red-800"
};

const STATUS_LABELS = {
  NEW: "Nuovo",
  CONTACTED: "Contattato",
  CONVERTED: "Convertito",
  LOST: "Perso"
};

export default function Leads() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch leads
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['/api/leads'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/leads');
      return response.json();
    }
  });

  // Update lead status/notes
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Lead> }) => {
      const response = await apiRequest('PATCH', `/api/leads/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({
        title: "Lead aggiornato",
        description: "Le modifiche sono state salvate con successo",
      });
    }
  });

  // Filter leads
  const filteredLeads = leads.filter((lead: Lead) => {
    const matchesStatus = filterStatus === "ALL" || lead.status === filterStatus;
    const matchesSearch = searchTerm === "" || 
      lead.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.businessSector.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const formatCurrency = (amount: string) => {
    if (!amount) return "Non specificato";
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToExcel = () => {
    // Implementation for Excel export
    toast({
      title: "Export in corso",
      description: "Il file Excel verrà scaricato a breve",
    });
  };

  const updateStatus = (leadId: number, newStatus: string) => {
    updateLeadMutation.mutate({
      id: leadId,
      updates: { status: newStatus }
    });
  };

  const updateNotes = (leadId: number) => {
    updateLeadMutation.mutate({
      id: leadId,
      updates: { notes }
    });
    setNotes("");
  };

  // Statistics
  const stats = {
    total: leads.length,
    new: leads.filter((l: Lead) => l.status === 'NEW').length,
    contacted: leads.filter((l: Lead) => l.status === 'CONTACTED').length,
    converted: leads.filter((l: Lead) => l.status === 'CONVERTED').length,
    lost: leads.filter((l: Lead) => l.status === 'LOST').length,
  };

  return (
    <div className="container mx-auto py-4 md:py-8 px-4">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">← Torna al Calcolatore</Button>
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
                🎯 Dashboard Lead
              </h1>
              <p className="text-sm md:text-base text-gray-500 mt-1">
                Gestisci i potenziali clienti dal calcolatore fiscale
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <img 
              src={logoPath} 
              alt="SmartRate" 
              className="h-8 md:h-10 w-auto"
            />
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-blue-500" />
              <div className="ml-3">
                <p className="text-xs text-gray-500">Totali</p>
                <p className="text-lg font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-3"></div>
              <div>
                <p className="text-xs text-gray-500">Nuovi</p>
                <p className="text-lg font-bold">{stats.new}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-3"></div>
              <div>
                <p className="text-xs text-gray-500">Contattati</p>
                <p className="text-lg font-bold">{stats.contacted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-3"></div>
              <div>
                <p className="text-xs text-gray-500">Convertiti</p>
                <p className="text-lg font-bold">{stats.converted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-3"></div>
              <div>
                <p className="text-xs text-gray-500">Persi</p>
                <p className="text-lg font-bold">{stats.lost}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca per nome, email o settore..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
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

            <Button onClick={exportToExcel} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lead ({filteredLeads.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Caricamento lead...</div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {leads.length === 0 ? "Nessun lead trovato" : "Nessun lead corrisponde ai filtri"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Settore</th>
                    <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Fatturato</th>
                    <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
                    <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead: Lead) => (
                    <tr key={lead.id} className="border-b hover:bg-gray-50">
                      <td className="py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {lead.firstName} {lead.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{lead.email}</p>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-gray-900">
                        {lead.businessSector}
                      </td>
                      <td className="py-4 text-sm text-gray-900">
                        {formatCurrency(lead.revenue)}
                      </td>
                      <td className="py-4">
                        <Badge className={STATUS_COLORS[lead.status as keyof typeof STATUS_COLORS]}>
                          {STATUS_LABELS[lead.status as keyof typeof STATUS_LABELS]}
                        </Badge>
                      </td>
                      <td className="py-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(lead.createdAt)}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setNotes(lead.notes || "");
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>
                                  {selectedLead?.firstName} {selectedLead?.lastName}
                                </DialogTitle>
                                <DialogDescription>
                                  Dettagli lead e gestione contatto
                                </DialogDescription>
                              </DialogHeader>
                              
                              {selectedLead && (
                                <div className="space-y-6">
                                  {/* Lead Info */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium text-gray-700">Email</label>
                                      <p className="text-sm text-gray-900">{selectedLead.email}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-700">Settore</label>
                                      <p className="text-sm text-gray-900">{selectedLead.businessSector}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-700">Fatturato</label>
                                      <p className="text-sm text-gray-900">{formatCurrency(selectedLead.revenue)}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-700">Categoria</label>
                                      <p className="text-sm text-gray-900">{selectedLead.category}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-700">Regime Contributivo</label>
                                      <p className="text-sm text-gray-900">{selectedLead.contributionRegime}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-700">Startup</label>
                                      <p className="text-sm text-gray-900">{selectedLead.isStartup ? "Sì" : "No"}</p>
                                    </div>
                                  </div>

                                  {/* Status Update */}
                                  <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Aggiorna Stato
                                    </label>
                                    <div className="flex gap-2">
                                      {Object.entries(STATUS_LABELS).map(([status, label]) => (
                                        <Button
                                          key={status}
                                          variant={selectedLead.status === status ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => updateStatus(selectedLead.id, status)}
                                        >
                                          {label}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Notes */}
                                  <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Note
                                    </label>
                                    <Textarea
                                      value={notes}
                                      onChange={(e) => setNotes(e.target.value)}
                                      placeholder="Aggiungi note sul lead..."
                                      rows={3}
                                    />
                                    <Button
                                      className="mt-2"
                                      size="sm"
                                      onClick={() => updateNotes(selectedLead.id)}
                                    >
                                      <MessageSquare className="h-4 w-4 mr-2" />
                                      Salva Note
                                    </Button>
                                  </div>

                                  {selectedLead.notes && (
                                    <div>
                                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Note Salvate
                                      </label>
                                      <div className="bg-gray-50 p-3 rounded text-sm">
                                        {selectedLead.notes}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>

                          <Select
                            value={lead.status}
                            onValueChange={(value) => updateStatus(lead.id, value)}
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                                <SelectItem key={status} value={status}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}