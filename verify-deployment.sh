#!/bin/bash
set -e

echo "🔍 Treasury Connect - Deployment Verification"
echo "=============================================="
echo ""

cd /home/ec2-user/CXAIDemo1/treasury-connect/infrastructure

echo "✓ Checking CDK stacks..."
STACKS=(
  "TreasuryNetworkStack"
  "TreasuryDataStack"
  "TreasuryAuthStack"
  "TreasuryConnectStack"
  "TreasuryBedrockStack"
  "TreasuryAgentCoreStack"
  "TreasuryContactLensStack"
  "TreasuryKnowledgeBaseStack"
  "TreasuryCedarPolicyStack"
  "TreasuryAutomatedReasoningStack"
)

for stack in "${STACKS[@]}"; do
  if aws cloudformation describe-stacks --stack-name "$stack" --region us-east-1 >/dev/null 2>&1; then
    STATUS=$(aws cloudformation describe-stacks --stack-name "$stack" --region us-east-1 --query 'Stacks[0].StackStatus' --output text)
    if [[ "$STATUS" == "CREATE_COMPLETE" || "$STATUS" == "UPDATE_COMPLETE" ]]; then
      echo "  ✓ $stack: $STATUS"
    else
      echo "  ⚠ $stack: $STATUS"
    fi
  else
    echo "  ✗ $stack: NOT DEPLOYED"
  fi
done

echo ""
echo "✓ Checking Lambda functions..."
FUNCTIONS=(
  "treasury-refund-status"
  "treasury-notice-explanation"
  "treasury-payment-plan"
  "treasury-transcript-request"
  "treasury-account-unlock"
  "treasury-bond-value"
  "treasury-bond-redemption"
  "treasury-lookup-offset"
  "treasury-create-dispute"
  "treasury-get-order-status"
  "treasury-get-balance"
  "treasury-report-lost-card"
  "treasury-initiate-pin-reset"
  "treasury-identity-validate"
)

for fn in "${FUNCTIONS[@]}"; do
  if aws lambda get-function --function-name "$fn" --region us-east-1 >/dev/null 2>&1; then
    echo "  ✓ $fn"
  else
    echo "  ✗ $fn: NOT FOUND"
  fi
done

echo ""
echo "✓ Checking Bedrock components..."
if aws bedrock-agent list-agents --region us-east-1 >/dev/null 2>&1; then
  AGENT_COUNT=$(aws bedrock-agent list-agents --region us-east-1 --query 'length(agentSummaries)' --output text)
  echo "  ✓ Bedrock Agents: $AGENT_COUNT found"
else
  echo "  ✗ Bedrock Agents: Unable to list"
fi

if aws bedrock-agent list-knowledge-bases --region us-east-1 >/dev/null 2>&1; then
  KB_COUNT=$(aws bedrock-agent list-knowledge-bases --region us-east-1 --query 'length(knowledgeBaseSummaries)' --output text)
  echo "  ✓ Knowledge Bases: $KB_COUNT found"
else
  echo "  ✗ Knowledge Bases: Unable to list"
fi

echo ""
echo "✓ Checking DynamoDB tables..."
TABLES=(
  "TreasuryContacts"
  "TreasuryTranscripts"
  "TreasuryCases"
  "TreasuryAnalytics"
)

for table in "${TABLES[@]}"; do
  if aws dynamodb describe-table --table-name "$table" --region us-east-1 >/dev/null 2>&1; then
    echo "  ✓ $table"
  else
    echo "  ✗ $table: NOT FOUND"
  fi
done

echo ""
echo "✓ Checking S3 buckets..."
if aws s3 ls | grep -q "treasury-kb-docs"; then
  echo "  ✓ KB Documents bucket exists"
else
  echo "  ✗ KB Documents bucket: NOT FOUND"
fi

echo ""
echo "✓ Checking Amazon Connect instance..."
if aws connect list-instances --region us-east-1 >/dev/null 2>&1; then
  INSTANCE_COUNT=$(aws connect list-instances --region us-east-1 --query 'length(InstanceSummaryList)' --output text)
  echo "  ✓ Connect Instances: $INSTANCE_COUNT found"
else
  echo "  ✗ Connect: Unable to list instances"
fi

echo ""
echo "=============================================="
echo "Verification complete!"
echo ""
