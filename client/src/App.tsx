import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";

// Pages
import Calculator from "@/pages/calculator";
import Leads from "@/pages/leads";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
        <Switch>
          <Route path="/" component={Calculator} />
          <Route path="/calculator" component={Calculator} />
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