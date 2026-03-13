import { useState, useEffect } from "react";

const WS_URL = 'wss://ibmbl856zi.execute-api.us-east-1.amazonaws.com/prod';

export default function LiveDashboard() {
  const [contacts, setContacts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('Connected to real-time API');
      setConnected(true);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received:', data);
      
      if (data.type === 'contact') {
        setContacts(prev => [data, ...prev].slice(0, 50));
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };
    
    ws.onclose = () => {
      console.log('Disconnected');
      setConnected(false);
    };
    
    return () => ws.close();
  }, []);

  return (
    <div style={{ fontFamily: 'monospace', padding: '20px', background: '#0a0a0a', color: '#0f0', minHeight: '100vh' }}>
      <div style={{ marginBottom: '20px', borderBottom: '2px solid #0f0', paddingBottom: '10px' }}>
        <h1 style={{ margin: 0 }}>🎯 CXAI Live Operations Center</h1>
        <div style={{ marginTop: '10px', fontSize: '14px' }}>
          <span style={{ color: connected ? '#0f0' : '#f00' }}>●</span> 
          {connected ? ' Connected' : ' Disconnected'} | 
          Contacts: {contacts.length} | 
          Phone: +1 (833) 289-6602
        </div>
      </div>

      {contacts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', border: '2px dashed #0f0', borderRadius: '8px' }}>
          <h2>📞 Waiting for Calls...</h2>
          <p>Call +1 (833) 289-6602 to see live data</p>
          <p style={{ fontSize: '12px', color: '#888' }}>
            WebSocket: {connected ? 'Connected ✅' : 'Connecting...'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          <div style={{ border: '1px solid #0f0', padding: '10px', borderRadius: '4px', maxHeight: '80vh', overflow: 'auto' }}>
            <h3>Recent Contacts</h3>
            {contacts.map((contact, i) => (
              <div 
                key={i}
                onClick={() => setSelectedContact(contact)}
                style={{ 
                  padding: '10px', 
                  margin: '5px 0', 
                  background: selectedContact === contact ? '#1a1a1a' : '#0a0a0a',
                  border: '1px solid #0f0',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                <div style={{ fontSize: '12px' }}>
                  {new Date(contact.timestamp).toLocaleTimeString()}
                </div>
                <div>{contact.contactId?.slice(0, 12)}...</div>
                <div style={{ fontSize: '10px', color: '#888' }}>
                  {contact.bureau || 'Unknown'} | {contact.channel || 'VOICE'}
                </div>
              </div>
            ))}
          </div>

          <div style={{ border: '1px solid #0f0', padding: '20px', borderRadius: '4px', maxHeight: '80vh', overflow: 'auto' }}>
            {selectedContact ? (
              <>
                <h3>Contact Details</h3>
                <pre style={{ background: '#1a1a1a', padding: '15px', borderRadius: '4px', overflow: 'auto' }}>
                  {JSON.stringify(selectedContact, null, 2)}
                </pre>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                Select a contact to view details
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #0f0', borderRadius: '4px', background: '#0a0a0a' }}>
        <h3>System Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
          <div>✅ Prediction Engine</div>
          <div>✅ Governance Checker</div>
          <div>✅ Routing Engine</div>
          <div>✅ AgentCore (5 bureaus)</div>
          <div>✅ WebSocket API</div>
          <div>✅ Phone: +1-833-289-6602</div>
        </div>
      </div>
    </div>
  );
}
