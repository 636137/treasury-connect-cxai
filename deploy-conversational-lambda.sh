#!/bin/bash
# Deploy Conversational Lambda for Multi-Turn Conversations

set -e

REGION="us-east-1"
ACCOUNT_ID="593804350786"
INSTANCE_ID="a88ddab9-3b29-409f-87f0-bdb614abafef"

echo "=========================================="
echo "Deploying Conversational Lambda"
echo "=========================================="
echo ""

# Step 1: Create DynamoDB table for sessions
echo "Step 1: Creating DynamoDB table for conversation sessions..."
aws dynamodb create-table \
  --table-name TreasuryConversations \
  --attribute-definitions AttributeName=contactId,AttributeType=S \
  --key-schema AttributeName=contactId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ${REGION} 2>&1 | grep -v "ResourceInUseException" || echo "  Table may already exist"

echo "✅ DynamoDB table ready"
echo ""

# Step 2: Get Lambda execution role
echo "Step 2: Getting Lambda execution role..."
ROLE_ARN=$(aws iam get-role --role-name TreasuryAgentCoreStack-AgentIRSRuntimeServiceRole* --query 'Role.Arn' --output text 2>/dev/null || \
           aws iam list-roles --query 'Roles[?contains(RoleName, `AgentIRSRuntime`)].Arn' --output text | head -1)

if [ -z "$ROLE_ARN" ]; then
  echo "❌ Could not find Lambda execution role"
  exit 1
fi

echo "  Using role: $ROLE_ARN"
echo ""

# Step 3: Package Lambda
echo "Step 3: Packaging Lambda function..."
cd /home/ec2-user/CXAIDemo1
pip3 install boto3 -t /tmp/lambda-package --quiet 2>/dev/null || true
cp conversational-lambda.py /tmp/lambda-package/
cd /tmp/lambda-package
zip -r /tmp/conversational-lambda.zip . > /dev/null
cd /home/ec2-user/CXAIDemo1

echo "✅ Lambda packaged"
echo ""

# Step 4: Create or update Lambda
echo "Step 4: Deploying Lambda function..."
aws lambda create-function \
  --function-name treasury-conversational-handler \
  --runtime python3.11 \
  --role "$ROLE_ARN" \
  --handler conversational-lambda.handler \
  --zip-file fileb:///tmp/conversational-lambda.zip \
  --timeout 30 \
  --memory-size 512 \
  --environment Variables={SESSION_TABLE=TreasuryConversations} \
  --region ${REGION} 2>&1 || \
aws lambda update-function-code \
  --function-name treasury-conversational-handler \
  --zip-file fileb:///tmp/conversational-lambda.zip \
  --region ${REGION} > /dev/null

echo "✅ Lambda deployed"
echo ""

# Step 5: Grant Connect permission
echo "Step 5: Granting Connect permission..."
aws lambda add-permission \
  --function-name treasury-conversational-handler \
  --statement-id AllowConnectInvoke \
  --action lambda:InvokeFunction \
  --principal connect.amazonaws.com \
  --source-arn "arn:aws:connect:${REGION}:${ACCOUNT_ID}:instance/${INSTANCE_ID}" \
  --region ${REGION} 2>&1 | grep -v "ResourceConflictException" || echo "  Permission may already exist"

echo "✅ Permissions granted"
echo ""

# Step 6: Test the Lambda
echo "Step 6: Testing Lambda..."
cat > /tmp/test-payload.json << 'EOF'
{
  "Details": {
    "ContactData": {
      "ContactId": "test-conversation-123"
    },
    "Parameters": {
      "CustomerInput": "Where is my tax refund?",
      "Bureau": "IRS"
    }
  }
}
EOF

aws lambda invoke \
  --function-name treasury-conversational-handler \
  --payload file:///tmp/test-payload.json \
  --region ${REGION} \
  /tmp/test-response.json > /dev/null

echo ""
echo "Test Response:"
cat /tmp/test-response.json | jq '.'
echo ""

echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Lambda Function: treasury-conversational-handler"
echo "DynamoDB Table: TreasuryConversations"
echo ""
echo "Next Steps:"
echo "1. Build Connect flow with loop (see CONVERSATIONAL_ARCHITECTURE.md)"
echo "2. Or create Lex bot for easier conversation management"
echo ""
echo "Connect Flow Structure:"
echo "  1. Get customer input (speech)"
echo "  2. Invoke treasury-conversational-handler"
echo "  3. Play response"
echo "  4. Check continueConversation"
echo "  5. Loop back to step 1 if true"
echo ""
