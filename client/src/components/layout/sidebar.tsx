import { Link, useLocation } from "wouter";
import { BarChart3, Building, Calculator, Calendar, FileText, PieChart, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/hooks/use-auth";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Attività", href: "/businesses", icon: Building },
  { name: "Calcolatore", href: "/calculator", icon: Calculator },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Fatture", href: "/invoices", icon: FileText },
  { name: "Scadenze", href: "/calendar", icon: Calendar },
  { name: "Report", href: "/reports", icon: PieChart },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 shadow-xl">
        <div className="flex h-16 shrink-0 items-center">
          <Calculator className="h-8 w-8 text-primary mr-3" />
          <h1 className="text-xl font-bold text-gray-900">FiscaleForfait</h1>
        </div>

        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-700 hover:text-primary hover:bg-gray-50'
                        }`}
                      >
                        <item.icon
                          className={`h-5 w-5 shrink-0 ${
                            isActive ? 'text-primary' : 'text-gray-400 group-hover:text-primary'
                          }`}
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
            <li className="mt-auto">
              <Link
                href="/settings"
                className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 hover:text-primary hover:bg-gray-50"
              >
                <Settings className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-primary" />
                Impostazioni
              </Link>
              <button
                onClick={logout}
                className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 hover:text-primary hover:bg-gray-50 w-full text-left"
              >
                <LogOut className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-primary" />
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}