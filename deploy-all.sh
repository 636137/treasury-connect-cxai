#!/bin/bash
set -e

echo "🚀 Treasury Connect - Full Deployment with Real Components"
echo "==========================================================="
echo ""

cd /home/ec2-user/CXAIDemo1/treasury-connect/infrastructure

echo "📦 Building CDK stacks..."
npm run build

echo ""
echo "🔧 Bootstrapping CDK (if needed)..."
npx cdk bootstrap || true

echo ""
echo "📊 Deploying all stacks in dependency order..."
echo ""

# Deploy in correct dependency order
npx cdk deploy TreasuryNetworkStack --require-approval never
npx cdk deploy TreasuryDataStack --require-approval never
npx cdk deploy TreasuryAuthStack --require-approval never
npx cdk deploy TreasuryConnectStack --require-approval never
npx cdk deploy TreasuryBedrockStack --require-approval never
npx cdk deploy TreasuryAgentCoreStack --require-approval never
npx cdk deploy TreasuryContactLensStack --require-approval never
npx cdk deploy TreasuryKnowledgeBaseStack --require-approval never
npx cdk deploy TreasuryCedarPolicyStack --require-approval never
npx cdk deploy TreasuryAutomatedReasoningStack --require-approval never

echo ""
echo "✅ All stacks deployed successfully!"
echo ""
echo "📋 Stack Summary:"
echo "  ✓ TreasuryNetworkStack - VPC and networking"
echo "  ✓ TreasuryDataStack - DynamoDB tables"
echo "  ✓ TreasuryAuthStack - Cognito and auth"
echo "  ✓ TreasuryConnectStack - Amazon Connect instance + Kinesis"
echo "  ✓ TreasuryBedrockStack - Bedrock Agents + Guardrails"
echo "  ✓ TreasuryAgentCoreStack - AgentCore runtimes"
echo "  ✓ TreasuryContactLensStack - Real-time analytics processor"
echo "  ✓ TreasuryKnowledgeBaseStack - Bedrock KB + Rerank"
echo "  ✓ TreasuryCedarPolicyStack - Cedar policy engine"
echo "  ✓ TreasuryAutomatedReasoningStack - AR verifier"
echo ""
echo "📄 Uploading KB documents..."
KB_BUCKET=$(aws cloudformation describe-stacks --stack-name TreasuryKnowledgeBaseStack --query 'Stacks[0].Outputs[?OutputKey==`DocsBucketName`].OutputValue' --output text)
aws s3 sync ../kb-docs/ s3://$KB_BUCKET/

echo ""
echo "🎯 Next Steps:"
echo "  1. Start the frontend: cd /home/ec2-user/CXAIDemo1 && npm start"
echo "  2. Open http://localhost:3000"
echo "  3. All components are now REAL (not simulated)!"
echo ""
