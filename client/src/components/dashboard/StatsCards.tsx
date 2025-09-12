import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Calendar, TrendingUp, Clock } from "lucide-react";

export function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/stats'],
    refetchInterval: 5000, // Update every 5 seconds
  });

  const statsData = [
    {
      title: "Active Calls",
      value: stats?.activeCalls ?? 0,
      change: "+12%",
      changeText: "from yesterday",
      icon: Phone,
      iconBg: "bg-blue-100 dark:bg-blue-950",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
      title: "Scheduled Today", 
      value: stats?.scheduledToday ?? 0,
      change: "+8%",
      changeText: "from yesterday",
      icon: Calendar,
      iconBg: "bg-green-100 dark:bg-green-950",
      iconColor: "text-green-600 dark:text-green-400"
    },
    {
      title: "Success Rate",
      value: `${stats?.successRate ?? '0.0'}%`,
      change: "+5.2%", 
      changeText: "from last week",
      icon: TrendingUp,
      iconBg: "bg-purple-100 dark:bg-purple-950",
      iconColor: "text-purple-600 dark:text-purple-400"
    },
    {
      title: "Total Minutes",
      value: stats?.totalMinutes ?? 0,
      change: "+23%",
      changeText: "from last month",
      icon: Clock,
      iconBg: "bg-orange-100 dark:bg-orange-950", 
      iconColor: "text-orange-600 dark:text-orange-400"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">{stat.title}</p>
                  <p className="text-2xl font-bold" data-testid={`text-${stat.title.toLowerCase().replace(' ', '-')}`}>
                    {isLoading ? '...' : stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 dark:text-green-400 font-medium">{stat.change}</span>
                <span className="text-muted-foreground ml-2">{stat.changeText}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
