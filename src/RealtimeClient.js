const WS_URL = 'wss://et6ua1zeob.execute-api.us-east-1.amazonaws.com/prod';

export class RealtimeClient {
  constructor(onContactUpdate) {
    this.ws = null;
    this.onContactUpdate = onContactUpdate;
    this.reconnectAttempts = 0;
  }

  connect() {
    this.ws = new WebSocket(WS_URL);
    
    this.ws.onopen = () => {
      console.log('Connected to realtime API');
      this.reconnectAttempts = 0;
      this.send({ action: 'getContacts' });
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.contacts) {
        this.onContactUpdate(data.contacts);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from realtime API');
      if (this.reconnectAttempts < 5) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, 2000 * this.reconnectAttempts);
      }
    };
  }

  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect() {
    this.ws?.close();
  }
}
