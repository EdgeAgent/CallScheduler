import { Sidebar } from "@/components/dashboard/Sidebar";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { QuickCallPanel } from "@/components/dashboard/QuickCallPanel";
import { ActiveCalls } from "@/components/dashboard/ActiveCalls";
import { TodaySchedule } from "@/components/dashboard/TodaySchedule";
import { CallHistory } from "@/components/dashboard/CallHistory";
import { VoiceConfiguration } from "@/components/dashboard/VoiceConfiguration";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">AI Phone Agent Dashboard</h2>
              <p className="text-muted-foreground">Manage your automated outreach campaigns</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-lg border border-green-200 dark:border-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Twilio Connected</span>
              </div>
              <Button data-testid="button-new-campaign">
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Stats Cards */}
          <StatsCards />

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Call Panel */}
            <div className="lg:col-span-1">
              <QuickCallPanel />
            </div>

            {/* Active Calls & Live Status */}
            <div className="lg:col-span-2">
              <ActiveCalls />
            </div>
          </div>

          {/* Calendar Integration & Call History */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar Scheduler */}
            <TodaySchedule />

            {/* Recent Call History */}
            <CallHistory />
          </div>

          {/* Voice Settings & Configuration */}
          <VoiceConfiguration />
        </div>
      </main>
    </div>
  );
}
