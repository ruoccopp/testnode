import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Clock, CheckCircle, Plus, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function RightSidebar() {
  const { data: deadlines } = useQuery({
    queryKey: ["/api/deadlines/upcoming"],
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getDeadlineStatus = (deadline: any) => {
    const dueDate = new Date(deadline.dueDate);
    const today = new Date();
    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) {
      return { color: "red", label: "Scaduto", icon: AlertCircle };
    } else if (daysUntil <= 30) {
      return { color: "red", label: "Saldo insufficiente", icon: AlertCircle };
    } else if (daysUntil <= 60) {
      return { color: "amber", label: "In arrivo", icon: Clock };
    } else {
      return { color: "emerald", label: "Coperto", icon: CheckCircle };
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 hidden w-96 overflow-y-auto border-l border-gray-200 px-4 py-6 sm:px-6 lg:px-8 xl:block bg-white">
      <div className="space-y-6">
        {/* Upcoming Deadlines */}
        <div>
          <h2 className="text-base font-semibold leading-6 text-gray-900">Prossime Scadenze</h2>
          <div className="mt-4 space-y-4">
            {deadlines?.slice(0, 3).map((deadline: any) => {
              const status = getDeadlineStatus(deadline);
              return (
                <div
                  key={deadline.id}
                  className={`relative rounded-lg border border-${status.color}-200 bg-${status.color}-50 p-4`}
                >
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <status.icon className={`h-5 w-5 text-${status.color}-400`} />
                    </div>
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium text-${status.color}-800`}>
                        {deadline.paymentType}
                      </h3>
                      <div className={`mt-1 text-sm text-${status.color}-700`}>
                        <p>Scadenza: {formatDate(deadline.dueDate)}</p>
                        <p className="font-semibold">
                          Importo: {formatCurrency(deadline.amount)}
                        </p>
                      </div>
                      <div className="mt-2">
                        <span className={`inline-flex items-center rounded-md bg-${status.color}-100 px-2 py-1 text-xs font-medium text-${status.color}-700`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {!deadlines?.length && (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Nessuna scadenza imminente</p>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Goals */}
        <div>
          <h2 className="text-base font-semibold leading-6 text-gray-900">Obiettivi Accantonamento</h2>
          <div className="mt-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-sm text-gray-500">€ 850 / € 1.200</p>
                  </div>
                  <div className="text-sm font-medium text-gray-900">71%</div>
                </div>
                <div className="mt-3">
                  <Progress value={71} className="h-2" />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Rimangono € 350 da accantonare questo mese
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-base font-semibold leading-6 text-gray-900">Azioni Rapide</h2>
          <div className="mt-4 space-y-3">
            <Button className="w-full justify-center gap-x-2">
              <Plus className="h-4 w-4" />
              Registra Fattura
            </Button>
            <Button variant="outline" className="w-full justify-center gap-x-2">
              <Download className="h-4 w-4" />
              Esporta Dati
            </Button>
            <Button variant="outline" className="w-full justify-center gap-x-2">
              <Calendar className="h-4 w-4" />
              Calendario Completo
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
