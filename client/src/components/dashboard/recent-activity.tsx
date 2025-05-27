import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calculator, AlertTriangle } from "lucide-react";

const activities = [
  {
    id: 1,
    type: "invoice",
    description: "Nuova fattura registrata",
    amount: "€ 2.500",
    date: "15 Gen",
    icon: FileText,
    iconColor: "bg-emerald-500",
  },
  {
    id: 2,
    type: "calculation",
    description: "Calcolo imposte completato per",
    period: "Q4 2024",
    date: "10 Gen",
    icon: Calculator,
    iconColor: "bg-blue-500",
  },
  {
    id: 3,
    type: "deadline",
    description: "Scadenza imminente:",
    deadline: "Saldo IRPEF",
    date: "5 Gen",
    icon: AlertTriangle,
    iconColor: "bg-amber-500",
  },
];

export default function RecentActivity() {
  return (
    <div className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold leading-6 text-gray-900">
            Attività Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flow-root">
            <ul role="list" className="-mb-8">
              {activities.map((activity, activityIdx) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {activityIdx !== activities.length - 1 ? (
                      <span
                        className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span
                          className={`h-8 w-8 rounded-full ${activity.iconColor} flex items-center justify-center ring-8 ring-white`}
                        >
                          <activity.icon className="h-4 w-4 text-white" aria-hidden="true" />
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <div>
                          <p className="text-sm text-gray-500">
                            {activity.description}{' '}
                            {activity.amount && (
                              <span className="font-medium text-gray-900">{activity.amount}</span>
                            )}
                            {activity.period && (
                              <span className="font-medium text-gray-900">{activity.period}</span>
                            )}
                            {activity.deadline && (
                              <span className="font-medium text-gray-900">{activity.deadline}</span>
                            )}
                          </p>
                        </div>
                        <div className="whitespace-nowrap text-right text-sm text-gray-500">
                          <time>{activity.date}</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
