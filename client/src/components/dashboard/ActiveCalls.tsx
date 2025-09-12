import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PhoneOff, Calendar, Phone } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

export function ActiveCalls() {
  const queryClient = useQueryClient();
  const { data: activeCalls, isLoading } = useQuery({
    queryKey: ['/api/calls/active'],
    refetchInterval: 3000, // Refetch every 3 seconds as fallback
  });

  // WebSocket connection for real-time updates
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage) {
      const data = JSON.parse(lastMessage.data);
      if (data.type.includes('call_')) {
        queryClient.invalidateQueries({ queryKey: ['/api/calls/active'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      }
    }
  }, [lastMessage, queryClient]);

  const endCallMutation = useMutation({
    mutationFn: async (callId: string) => {
      await apiRequest("POST", `/api/calls/${callId}/end`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calls/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
      case 'ringing':
        return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
      case 'scheduling':
        return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800';
    }
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Live</span>
            <div className="flex gap-1 ml-2">
              {[0, 0.1, 0.2, 0.3].map((delay, i) => (
                <div 
                  key={i}
                  className="w-1 h-4 bg-green-500 rounded animate-pulse"
                  style={{ animationDelay: `${delay}s`, animationDuration: '1.5s' }}
                />
              ))}
            </div>
          </>
        );
      case 'ringing':
        return (
          <>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Ringing</span>
          </>
        );
      case 'scheduling':
        return (
          <>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Scheduling</span>
          </>
        );
      default:
        return (
          <>
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{status}</span>
          </>
        );
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Calls</CardTitle>
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse border border-border rounded-lg p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
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
          <CardTitle>Active Calls</CardTitle>
          <span className="text-sm text-muted-foreground" data-testid="text-active-calls-count">
            {(activeCalls as any[])?.length || 0} active
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {!activeCalls || (activeCalls as any[])?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active calls at the moment</p>
            <p className="text-sm">Calls will appear here when initiated</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(activeCalls as any[]).map((call: any) => (
              <div 
                key={call.id} 
                className={`border rounded-lg p-4 ${getStatusColor(call.status)}`}
                data-testid={`card-call-${call.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getStatusIndicator(call.status)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground" data-testid={`text-duration-${call.id}`}>
                      {formatDuration(call.duration || 0)}
                    </span>
                    {call.status === 'scheduling' ? (
                      <Button size="sm" variant="outline" disabled>
                        <Calendar className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => endCallMutation.mutate(call.id)}
                        disabled={endCallMutation.isPending}
                        data-testid={`button-end-call-${call.id}`}
                      >
                        <PhoneOff className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <p className="font-medium" data-testid={`text-contact-name-${call.id}`}>
                    {call.contactName || 'Unknown Contact'}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid={`text-phone-number-${call.id}`}>
                    {call.phoneNumber}
                  </p>
                  {call.conversation && call.conversation.length > 0 && (
                    <p className="text-sm mt-1" data-testid={`text-latest-message-${call.id}`}>
                      <span className="font-medium">AI:</span> {
                        call.conversation[call.conversation.length - 1]?.content?.substring(0, 50) + '...'
                      }
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
