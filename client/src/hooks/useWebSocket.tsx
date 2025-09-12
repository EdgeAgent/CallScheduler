import { useState, useEffect, useRef } from "react";

interface WebSocketMessage {
  data: string;
  type?: string;
}

export function useWebSocket() {
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const connect = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        ws.current = new WebSocket(wsUrl);
        
        ws.current.onopen = () => {
          setConnectionStatus('open');
          console.log('WebSocket connected');
          
          // Clear any existing reconnect timeout
          if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
          }
        };
        
        ws.current.onmessage = (event) => {
          setLastMessage({
            data: event.data,
            type: 'message'
          });
        };
        
        ws.current.onclose = () => {
          setConnectionStatus('closed');
          console.log('WebSocket disconnected');
          
          // Attempt to reconnect after 3 seconds
          reconnectTimeout.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect();
          }, 3000);
        };
        
        ws.current.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
        
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setConnectionStatus('closed');
      }
    };

    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const sendMessage = (message: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(message);
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  return {
    lastMessage,
    connectionStatus,
    sendMessage,
  };
}
