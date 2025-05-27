import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function Invoices() {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Gestione Fatture
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Registra e gestisci le tue fatture
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Gestione Fatture</h3>
        <p className="mt-1 text-sm text-gray-500">
          Questa funzionalità sarà disponibile a breve.
        </p>
      </div>
    </div>
  );
}
