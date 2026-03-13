#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                  CXAI DEPLOYMENT RESULTS                         ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

echo "📞 PHONE NUMBER (Call Now):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   +1 (833) 289-6602"
echo ""

echo "🌐 WEBSOCKET API (Real-Time Events):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   wss://ibmbl856zi.execute-api.us-east-1.amazonaws.com/prod"
echo ""

echo "🧪 TEST PREDICTION ENGINE:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
aws lambda invoke \
  --function-name treasury-prediction-engine \
  --cli-binary-format raw-in-base64-out \
  --payload '{"contactData":{"intentComplexity":0.3,"sentiment":"NEUTRAL","authSuccess":true,"toolSuccess":true,"topRerankScore":0.85,"arResult":"VALID","queueDepth":5,"availableAgents":3,"staffedAgents":10,"channel":"VOICE"}}' \
  /tmp/pred.json >/dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "   ✅ WORKING"
  cat /tmp/pred.json | jq -r '.body' | jq '.' 2>/dev/null || cat /tmp/pred.json
else
  echo "   ❌ Error"
fi
echo ""

echo "🛡️  TEST GOVERNANCE CHECKER:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
aws lambda invoke \
  --function-name treasury-governance-checker \
  --cli-binary-format raw-in-base64-out \
  --payload '{"text":"Your refund of $2,450 has been approved and will arrive by 2026-03-15","type":"output","context":{"bureau":"IRS"}}' \
  /tmp/gov.json >/dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "   ✅ WORKING"
  cat /tmp/gov.json | jq '.' 2>/dev/null || cat /tmp/gov.json
else
  echo "   ❌ Error"
fi
echo ""

echo "🎯 TEST ROUTING ENGINE:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
aws lambda invoke \
  --function-name treasury-routing-engine \
  --cli-binary-format raw-in-base64-out \
  --payload '{"bureau":"IRS","intent":"RefundStatus","complexity":0.3,"sentiment":"NEUTRAL","queueMetrics":{"depth":5,"oldestContactSec":45,"availableAgents":3,"staffedAgents":10,"agentsByProficiency":{"1":2,"2":5,"3":2,"4":1},"avgSpeedAnswerSec":30}}' \
  /tmp/route.json >/dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "   ✅ WORKING"
  cat /tmp/route.json | jq -r '.body' | jq '.' 2>/dev/null || cat /tmp/route.json
else
  echo "   ❌ Error"
fi
echo ""

echo "📊 RECENT CALL ACTIVITY:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
aws connect search-contacts \
  --instance-id a88ddab9-3b29-409f-87f0-bdb614abafef \
  --time-range Type=INITIATION_TIMESTAMP,StartTime=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ),EndTime=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --query 'Contacts[].{Time:InitiationTimestamp,From:CustomerEndpoint.Address,Duration:DisconnectTimestamp}' \
  --output table 2>/dev/null || echo "   No recent calls"
echo ""

echo "📋 DEPLOYED LAMBDA FUNCTIONS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `treasury-`)].{Name:FunctionName,Runtime:Runtime,Memory:MemorySize}' --output table
echo ""

echo "💾 DYNAMODB TABLES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
aws dynamodb list-tables --query 'TableNames[?contains(@, `Treasury`) || contains(@, `WebSocket`)]' --output table
echo ""

echo "📄 DOCUMENTATION:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   📄 REALTIME_DEPLOYMENT_COMPLETE.md"
echo "   📄 DEPLOYMENT_SUMMARY.txt"
echo "   📄 CONVERSATIONAL_SOLUTION.md"
echo ""

echo "🎯 NEXT ACTIONS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   1. Call: +1 (833) 289-6602"
echo "   2. View docs: cat REALTIME_DEPLOYMENT_COMPLETE.md"
echo "   3. Monitor logs: aws logs tail /aws/lambda/TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR --follow"
echo ""
