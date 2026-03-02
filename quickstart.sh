#!/bin/bash

# Treasury Connect CXAI - Quick Start Guide
# Run this to start the demo

set -e

echo "🚀 Treasury Connect CXAI - Quick Start"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this from /home/ec2-user/CXAIDemo1"
    exit 1
fi

echo "✓ Checking deployment status..."
./verify-deployment.sh | grep -E "✓|✗" | head -20

echo ""
echo "📊 Stack Status:"
aws cloudformation list-stacks --region us-east-1 \
    --query 'StackSummaries[?contains(StackName, `Treasury`) && StackStatus != `DELETE_COMPLETE`].[StackName,StackStatus]' \
    --output table | head -15

echo ""
echo "🌐 WebSocket Endpoint:"
aws cloudformation describe-stacks --stack-name TreasuryRealtimeStack --region us-east-1 \
    --query 'Stacks[0].Outputs[?OutputKey==`WebSocketURL`].OutputValue' --output text

echo ""
echo "🎯 Connect Instance:"
aws cloudformation describe-stacks --stack-name TreasuryConnectStack --region us-east-1 \
    --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' --output text 2>/dev/null || echo "a88ddab9-3b29-409f-87f0-bdb614abafef"

echo ""
echo "📦 Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
fi

echo ""
echo "✅ Ready to start!"
echo ""
echo "To launch the UI:"
echo "  npm start"
echo ""
echo "Then open: http://localhost:3000"
echo ""
echo "To test AgentCore:"
echo "  python3 test-connect-agentcore.py"
echo ""
echo "To test Contact Lens:"
echo "  python3 test-contact-lens.py"
echo ""
