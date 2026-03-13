#!/usr/bin/env python3
import json
import asyncio
import websockets

WS_URL = "wss://et6ua1zeob.execute-api.us-east-1.amazonaws.com/prod"

async def test_websocket():
    print("🌐 Testing WebSocket Connection")
    print(f"URL: {WS_URL}")
    print("=" * 60)
    
    try:
        async with websockets.connect(WS_URL) as ws:
            print("✅ WebSocket connected successfully!")
            
            # Send test message
            test_msg = {
                "action": "ping",
                "timestamp": "2026-03-01T23:17:00Z"
            }
            await ws.send(json.dumps(test_msg))
            print(f"📤 Sent: {test_msg}")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(ws.recv(), timeout=5.0)
                print(f"📥 Received: {response}")
                print("\n✅ WebSocket is working!")
            except asyncio.TimeoutError:
                print("⏱️  No response (timeout) - but connection established")
                print("✅ WebSocket endpoint is live!")
                
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    asyncio.run(test_websocket())
