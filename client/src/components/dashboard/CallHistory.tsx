import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Info } from "lucide-react";

export function CallHistory() {
  const { data: calls, isLoading } = useQuery({
    queryKey: ['/api/calls'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get recent completed calls
  const recentCalls = (calls as any[])?.filter((call: any) => call.status === 'completed')
    .slice(0, 5) || [];

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'appointment_booked':
        return <Phone className="text-green-600 dark:text-green-400 text-xs" />;
      case 'no_answer':
        return <PhoneOff className="text-red-600 dark:text-red-400 text-xs" />;
      case 'callback_requested':
        return <Info className="text-blue-600 dark:text-blue-400 text-xs" />;
      default:
        return <Phone className="text-gray-600 dark:text-gray-400 text-xs" />;
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'appointment_booked':
        return 'bg-green-100 dark:bg-green-950';
      case 'no_answer':
        return 'bg-red-100 dark:bg-red-950';
      case 'callback_requested':
        return 'bg-blue-100 dark:bg-blue-950';
      default:
        return 'bg-gray-100 dark:bg-gray-950';
    }
  };

  const formatResult = (result: string) => {
    switch (result) {
      case 'appointment_booked':
        return 'Appointment booked';
      case 'no_answer':
        return 'No answer';
      case 'callback_requested':
        return 'Requested callback';
      case 'not_interested':
        return 'Not interested';
      default:
        return 'Completed';
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTime = (dateTime: string | Date) => {
    const date = new Date(dateTime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Calls</CardTitle>
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center justify-between p-3 hover:bg-accent/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                  <div>
                    <div className="h-4 bg-muted rounded w-24 mb-1"></div>
                    <div className="h-3 bg-muted rounded w-20"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-muted rounded w-12 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-16"></div>
                </div>
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
          <CardTitle>Recent Calls</CardTitle>
          <Button variant="ghost" size="sm" data-testid="button-view-all-calls">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recentCalls.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No call history yet</p>
            <p className="text-sm">Completed calls will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentCalls.map((call: any) => (
              <div 
                key={call.id} 
                className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-lg transition-colors cursor-pointer"
                data-testid={`card-call-history-${call.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 ${getResultColor(call.result)} rounded-full flex items-center justify-center`}>
                    {getResultIcon(call.result)}
                  </div>
                  <div>
                    <p className="font-medium" data-testid={`text-call-contact-${call.id}`}>
                      {call.contactName || 'Unknown Contact'}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-call-result-${call.id}`}>
                      {formatResult(call.result)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm" data-testid={`text-call-duration-${call.id}`}>
                    {formatDuration(call.duration || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`text-call-time-${call.id}`}>
                    {call.endedAt ? formatTime(call.endedAt) : formatTime(call.startedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
