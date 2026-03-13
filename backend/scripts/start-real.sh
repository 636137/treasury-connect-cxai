#!/bin/bash

echo "🚀 Starting Treasury Connect CXAI - REAL MODE"
echo "=============================================="
echo ""
echo "✅ Backend: Real AgentCore runtimes"
echo "✅ Database: Real DynamoDB"
echo "✅ WebSocket: Real API Gateway"
echo ""

# Start API server in background
echo "📡 Starting API server on port 3001..."
node api-server.js &
API_PID=$!

# Wait for API to be ready
sleep 2

# Start React UI
echo "🖥️  Starting React UI on port 3000..."
echo ""
echo "Open: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Trap Ctrl+C to kill both processes
trap "kill $API_PID; exit" INT

npm start

# Cleanup
kill $API_PID 2>/dev/null
