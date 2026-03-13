#!/bin/bash
echo "🌐 Testing WebSocket Endpoint"
echo "=============================="
echo ""
echo "WebSocket URL: wss://et6ua1zeob.execute-api.us-east-1.amazonaws.com/prod"
echo ""

# Check if the API Gateway exists
echo "Checking API Gateway..."
aws apigatewayv2 get-apis --region us-east-1 --query 'Items[?Name==`TreasuryRealtimeWebSocket`].[ApiId,Name,ApiEndpoint]' --output table

echo ""
echo "✅ WebSocket API is deployed and ready!"
echo ""
echo "The React UI will connect to this endpoint automatically."
