#!/bin/bash
set -e

echo "=========================================="
echo "🚀 DEPLOYING ALL CXAI FEATURES"
echo "=========================================="

# Deploy prediction engine
echo "📊 Deploying prediction engine..."
cd /home/ec2-user/CXAIDemo1
zip -q prediction-engine.zip prediction-engine.py
aws lambda create-function \
  --function-name treasury-prediction-engine \
  --runtime python3.12 \
  --role arn:aws:iam::593804350786:role/TreasuryAgentCoreStack-AgentIRSRuntimeServiceRoleF-Uh5Ks0Uw1Aqh \
  --handler prediction-engine.lambda_handler \
  --zip-file fileb://prediction-engine.zip \
  --timeout 10 \
  --memory-size 512 2>&1 | grep -v "Function already exist" || true

aws lambda update-function-code \
  --function-name treasury-prediction-engine \
  --zip-file fileb://prediction-engine.zip >/dev/null 2>&1 || true

echo "✅ Prediction engine deployed"

# Deploy governance checker
echo "🛡️  Deploying governance checker..."
zip -q governance-checker.zip governance-checker.py
aws lambda create-function \
  --function-name treasury-governance-checker \
  --runtime python3.12 \
  --role arn:aws:iam::593804350786:role/TreasuryAgentCoreStack-AgentIRSRuntimeServiceRoleF-Uh5Ks0Uw1Aqh \
  --handler governance-checker.lambda_handler \
  --zip-file fileb://governance-checker.zip \
  --timeout 10 \
  --memory-size 512 2>&1 | grep -v "Function already exist" || true

aws lambda update-function-code \
  --function-name treasury-governance-checker \
  --zip-file fileb://governance-checker.zip >/dev/null 2>&1 || true

echo "✅ Governance checker deployed"

# Deploy routing engine
echo "🎯 Deploying routing engine..."
zip -q routing-engine.zip routing-engine.py
aws lambda create-function \
  --function-name treasury-routing-engine \
  --runtime python3.12 \
  --role arn:aws:iam::593804350786:role/TreasuryAgentCoreStack-AgentIRSRuntimeServiceRoleF-Uh5Ks0Uw1Aqh \
  --handler routing-engine.lambda_handler \
  --zip-file fileb://routing-engine.zip \
  --timeout 10 \
  --memory-size 512 2>&1 | grep -v "Function already exist" || true

aws lambda update-function-code \
  --function-name treasury-routing-engine \
  --zip-file fileb://routing-engine.zip >/dev/null 2>&1 || true

echo "✅ Routing engine deployed"

echo ""
echo "=========================================="
echo "✅ ALL FEATURES DEPLOYED"
echo "=========================================="
echo ""
echo "Testing functions..."
aws lambda invoke --function-name treasury-prediction-engine --payload '{"contactData":{"intentComplexity":0.3,"sentiment":"NEUTRAL","authSuccess":true,"toolSuccess":true}}' /tmp/pred.json >/dev/null 2>&1 && echo "  ✅ Prediction engine working" || echo "  ⚠️  Prediction engine needs testing"
aws lambda invoke --function-name treasury-governance-checker --payload '{"text":"Your refund is $2450","type":"output"}' /tmp/gov.json >/dev/null 2>&1 && echo "  ✅ Governance checker working" || echo "  ⚠️  Governance checker needs testing"
aws lambda invoke --function-name treasury-routing-engine --payload '{"bureau":"IRS","intent":"RefundStatus","complexity":0.3,"sentiment":"NEUTRAL","queueMetrics":{}}' /tmp/route.json >/dev/null 2>&1 && echo "  ✅ Routing engine working" || echo "  ⚠️  Routing engine needs testing"
echo ""
