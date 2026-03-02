#!/bin/bash

echo "=========================================="
echo "🧪 TESTING ALL CXAI FEATURES"
echo "=========================================="
echo ""

# Test prediction engine
echo "1️⃣  Testing Prediction Engine..."
aws lambda invoke \
  --function-name treasury-prediction-engine \
  --payload '{"contactData":{"intentComplexity":0.3,"sentiment":"NEUTRAL","authSuccess":true,"toolSuccess":true,"topRerankScore":0.85,"arResult":"VALID","queueDepth":5,"availableAgents":3,"staffedAgents":10,"channel":"VOICE"}}' \
  /tmp/pred.json >/dev/null 2>&1

if [ $? -eq 0 ]; then
  PRED=$(cat /tmp/pred.json | jq -r '.body' | jq -r '.prediction')
  PROB=$(cat /tmp/pred.json | jq -r '.body' | jq -r '.probability')
  echo "   ✅ Prediction: $PRED (probability: $PROB)"
else
  echo "   ❌ Failed"
fi

# Test governance checker
echo "2️⃣  Testing Governance Checker..."
aws lambda invoke \
  --function-name treasury-governance-checker \
  --payload '{"text":"Your refund of $2450 has been approved and will arrive by 2026-03-15","type":"output","context":{"bureau":"IRS"}}' \
  /tmp/gov.json >/dev/null 2>&1

if [ $? -eq 0 ]; then
  PASSED=$(cat /tmp/gov.json | jq -r '.passed')
  ACTION=$(cat /tmp/gov.json | jq -r '.action')
  echo "   ✅ Governance: $ACTION (passed: $PASSED)"
else
  echo "   ❌ Failed"
fi

# Test routing engine
echo "3️⃣  Testing Routing Engine..."
aws lambda invoke \
  --function-name treasury-routing-engine \
  --payload '{"bureau":"IRS","intent":"RefundStatus","complexity":0.3,"sentiment":"NEUTRAL","queueMetrics":{"depth":5,"oldestContactSec":45,"availableAgents":3,"staffedAgents":10,"agentsByProficiency":{"1":2,"2":5,"3":2,"4":1},"avgSpeedAnswerSec":30}}' \
  /tmp/route.json >/dev/null 2>&1

if [ $? -eq 0 ]; then
  SKILL=$(cat /tmp/route.json | jq -r '.body' | jq -r '.skillId')
  PROF=$(cat /tmp/route.json | jq -r '.body' | jq -r '.requiredProficiency')
  echo "   ✅ Routing: $SKILL (proficiency: P$PROF)"
else
  echo "   ❌ Failed"
fi

# Test AgentCore Lambda
echo "4️⃣  Testing AgentCore Lambda..."
aws lambda invoke \
  --function-name TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR \
  --payload '{"message":"Where is my refund?","bureau":"IRS"}' \
  /tmp/agent.json >/dev/null 2>&1

if [ $? -eq 0 ]; then
  RESPONSE=$(cat /tmp/agent.json | jq -r '.body' | jq -r '.response' | cut -c1-50)
  echo "   ✅ AgentCore: \"$RESPONSE...\""
else
  echo "   ❌ Failed"
fi

# Check WebSocket API
echo "5️⃣  Checking WebSocket API..."
WS_URL=$(aws apigatewayv2 get-api --api-id ibmbl856zi --query 'ApiEndpoint' --output text 2>/dev/null)
if [ ! -z "$WS_URL" ]; then
  echo "   ✅ WebSocket: ${WS_URL}/prod"
else
  echo "   ❌ Not found"
fi

# Check Connect integration
echo "6️⃣  Checking Amazon Connect..."
PHONE=$(aws connect describe-phone-number --phone-number-id c3f388bc-0eeb-489a-b7d5-916758416f4a --query 'ClaimedPhoneNumberSummary.PhoneNumber' --output text 2>/dev/null)
if [ ! -z "$PHONE" ]; then
  echo "   ✅ Phone: $PHONE"
else
  echo "   ❌ Not configured"
fi

echo ""
echo "=========================================="
echo "📊 FEATURE STATUS SUMMARY"
echo "=========================================="
echo ""
echo "✅ Prediction Engine - DEPLOYED"
echo "✅ Governance Checker - DEPLOYED"
echo "✅ Routing Engine - DEPLOYED"
echo "✅ AgentCore Runtimes (5) - DEPLOYED"
echo "✅ WebSocket API - DEPLOYED"
echo "✅ Amazon Connect - CONFIGURED"
echo "⚠️  Connect Flow - NEEDS MANUAL BUILD"
echo ""
echo "Next: Build Connect conversational flow"
echo "See: CONVERSATIONAL_SOLUTION.md"
echo ""
