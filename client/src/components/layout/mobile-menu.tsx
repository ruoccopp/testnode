import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Calculator, BarChart3, Building, FileText, Calendar, PieChart, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Attività", href: "/businesses", icon: Building },
  { name: "Calcolatore", href: "/calculator", icon: Calculator },
  { name: "Fatture", href: "/invoices", icon: FileText },
  { name: "Scadenze", href: "/calendar", icon: Calendar },
  { name: "Report", href: "/reports", icon: PieChart },
];

export default function MobileMenu() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile header bar */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="-m-2.5 p-2.5">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex h-full flex-col">
              <div className="flex h-16 shrink-0 items-center px-6">
                <Calculator className="h-8 w-8 text-primary mr-3" />
                <h1 className="text-xl font-bold text-gray-900">FiscaleForfait</h1>
              </div>
              
              <nav className="flex flex-1 flex-col px-6">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul role="list" className="-mx-2 space-y-1">
                      {navigation.map((item) => {
                        const isActive = location === item.href;
                        return (
                          <li key={item.name}>
                            <Link
                              href={item.href}
                              onClick={() => setOpen(false)}
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
                  <li className="mt-auto pb-4">
                    <Link
                      href="/settings"
                      onClick={() => setOpen(false)}
                      className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 hover:text-primary hover:bg-gray-50"
                    >
                      <Settings className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-primary" />
                      Impostazioni
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setOpen(false);
                      }}
                      className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 hover:text-primary hover:bg-gray-50 w-full text-left"
                    >
                      <LogOut className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-primary" />
                      Logout
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </SheetContent>
        </Sheet>
        
        <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">Dashboard</div>
        
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </span>
        </div>
      </div>
    </>
  );
}
