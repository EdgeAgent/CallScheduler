import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export function TodaySchedule() {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['/api/appointments/today'],
    refetchInterval: 60000, // Refetch every minute
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300';
      case 'scheduled':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300';
      default:
        return 'bg-gray-100 dark:bg-gray-950 text-gray-700 dark:text-gray-300';
    }
  };

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getBarColor = (index: number) => {
    const colors = [
      'bg-primary',
      'bg-orange-500',
      'bg-purple-500',
      'bg-green-500',
      'bg-blue-500'
    ];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Today's Schedule</CardTitle>
            <Button variant="ghost" size="sm">
              View Calendar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                <div className="w-2 h-8 bg-muted rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-20 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-32"></div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Today's Schedule</CardTitle>
          <Button variant="ghost" size="sm" data-testid="button-view-calendar">
            View Calendar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!appointments || (appointments as any[])?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No appointments scheduled for today</p>
            <p className="text-sm">Scheduled calls will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(appointments as any[]).map((appointment: any, index: number) => (
              <div 
                key={appointment.id} 
                className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg"
                data-testid={`card-appointment-${appointment.id}`}
              >
                <div className={`w-2 h-8 ${getBarColor(index)} rounded`}></div>
                <div className="flex-1">
                  <p className="font-medium" data-testid={`text-appointment-time-${appointment.id}`}>
                    {formatTime(appointment.scheduledTime)}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid={`text-appointment-contact-${appointment.id}`}>
                    {appointment.purpose === 'follow_up' ? 'Follow-up: ' : 'Call with '}
                    {appointment.contactName}
                  </p>
                </div>
                <span 
                  className={`text-xs px-2 py-1 rounded-full ${getStatusColor(appointment.status)}`}
                  data-testid={`status-appointment-${appointment.id}`}
                >
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
