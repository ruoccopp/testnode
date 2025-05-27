import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";

// Pages
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Businesses from "@/pages/businesses";
import Calculator from "@/pages/calculator";
import Invoices from "@/pages/invoices";
import Calendar from "@/pages/calendar";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";

// Layout components
import Sidebar from "@/components/layout/sidebar";
import MobileMenu from "@/components/layout/mobile-menu";

function AuthenticatedApp() {
  return (
    <div className="min-h-full">
      <Sidebar />
      <MobileMenu />
      
      <div className="lg:pl-72">
        <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/businesses" component={Businesses} />
            <Route path="/calculator" component={Calculator} />
            <Route path="/invoices" component={Invoices} />
            <Route path="/calendar" component={Calendar} />
            <Route path="/reports" component={Reports} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </div>
    </div>
  );
}

function UnauthenticatedApp() {
  return (
    <Switch>
      <Route path="/register" component={Register} />
      <Route path="/" component={Login} />
      <Route component={Login} />
    </Switch>
  );
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
