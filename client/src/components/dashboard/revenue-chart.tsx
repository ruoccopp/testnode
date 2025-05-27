import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function RevenueChart() {
  return (
    <div className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold leading-6 text-gray-900">
            Andamento Fatturato 2024
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">Grafico Fatturato Mensile</p>
              <p className="text-sm text-gray-400 mt-2">Chart.js implementation required</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
