import { useEffect, useState } from 'react';

const WS_URL = 'wss://ibmbl856zi.execute-api.us-east-1.amazonaws.com/prod';

export function useRealTimeEvents() {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const websocket = new WebSocket(WS_URL);
    
    websocket.onopen = () => {
      console.log('Connected to real-time API');
      setConnected(true);
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setEvents(prev => [...prev, data]);
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    websocket.onclose = () => {
      console.log('Disconnected from real-time API');
      setConnected(false);
    };
    
    setWs(websocket);
    
    return () => {
      websocket.close();
    };
  }, []);
  
  return { events, connected, ws };
}

export async function fetchRecentContacts() {
  // In production, this would call API Gateway
  // For now, return mock data structure
  return [];
}

export async function invokePrediction(contactData) {
  // Call prediction Lambda via API Gateway
  const response = await fetch('https://YOUR_API_GATEWAY/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactData })
  });
  return response.json();
}
