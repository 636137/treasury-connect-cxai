#!/bin/bash
# Test Lambda as Connect would invoke it

echo "Testing Lambda invocation (simulating Connect call)..."
echo ""

aws lambda invoke \
  --function-name TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR \
  --payload '{"message":"Where is my tax refund?","bureau":"IRS","contactId":"test-connect-123"}' \
  --region us-east-1 \
  /tmp/connect-test-response.json

echo ""
echo "Response:"
cat /tmp/connect-test-response.json | jq -r '.response' 2>/dev/null || cat /tmp/connect-test-response.json
echo ""
echo ""
echo "✅ If you see a response above, the Lambda is ready for Connect!"
echo "📞 Phone number: +18332896602"
echo "🔧 Next: Create contact flow in AWS Console"
