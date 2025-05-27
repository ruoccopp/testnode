import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsCards from "@/components/dashboard/stats-cards";
import RevenueChart from "@/components/dashboard/revenue-chart";
import QuickCalculator from "@/components/dashboard/quick-calculator";
import RecentActivity from "@/components/dashboard/recent-activity";
import RightSidebar from "@/components/dashboard/right-sidebar";

export default function Dashboard() {
  return (
    <div className="xl:pr-96">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                Dashboard
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Panoramica delle tue attività in regime forfettario
              </p>
            </div>
            <div className="mt-4 flex md:ml-4 md:mt-0">
              <Button className="inline-flex items-center gap-x-1.5">
                <Plus className="h-4 w-4" />
                Nuovo Calcolo
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <StatsCards />

        {/* Revenue Chart */}
        <RevenueChart />

        {/* Quick Calculator */}
        <QuickCalculator />

        {/* Recent Activity */}
        <RecentActivity />
      </div>

      {/* Right sidebar */}
      <RightSidebar />
    </div>
  );
}
