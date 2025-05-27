import { useQuery } from "@tanstack/react-query";
import { Euro, Receipt, PiggyBank, CalendarCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="mb-8">
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </dl>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="mb-8">
      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="relative overflow-hidden p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Fatturato 2024</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {formatCurrency(stats?.currentRevenue || 0)}
            </dd>
            <div className="absolute bottom-0 right-0 p-4">
              <Euro className="h-6 w-6 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="relative overflow-hidden p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Imposte Dovute</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {formatCurrency(stats?.taxesDue || 0)}
            </dd>
            <div className="absolute bottom-0 right-0 p-4">
              <Receipt className="h-6 w-6 text-amber-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="relative overflow-hidden p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Saldo Disponibile</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-emerald-600">
              {formatCurrency(stats?.availableBalance || 0)}
            </dd>
            <div className="absolute bottom-0 right-0 p-4">
              <PiggyBank className="h-6 w-6 text-emerald-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="relative overflow-hidden p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Prossima Scadenza</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {stats?.nextDeadline || "N/A"}
            </dd>
            <div className="absolute bottom-0 right-0 p-4">
              <CalendarCheck className="h-6 w-6 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </dl>
    </div>
  );
}
