import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";

// Pages
import HomePage from "@/pages/home";
import Calculator from "@/pages/calculator";
import CalculatorSRL from "@/pages/calculator-srl";
import Leads from "@/pages/leads";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="px-4 py-10 sm:px-6 lg:px_8 lg:py-6">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/calculator" component={Calculator} />
          <Route path="/calculator-srl" component={CalculatorSRL} />
          <Route path="/leads" component={Leads} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function UnauthenticatedApp() {
  return <AuthenticatedApp />;
}

function Router() {
  // Skip authentication for demo - always show authenticated app
  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;