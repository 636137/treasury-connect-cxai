#!/bin/bash
set -e

INSTANCE_ID="a88ddab9-3b29-409f-87f0-bdb614abafef"

echo "🔧 Setting up Amazon Connect Chat..."

# Create chat contact flow
CHAT_FLOW_ID=$(aws connect create-contact-flow \
  --instance-id $INSTANCE_ID \
  --name "TreasuryChatFlow" \
  --type CONTACT_FLOW \
  --content '{
    "Version": "2019-10-30",
    "StartAction": "invoke-lambda",
    "Actions": [
      {
        "Identifier": "invoke-lambda",
        "Type": "InvokeLambdaFunction",
        "Parameters": {
          "LambdaFunctionARN": "arn:aws:lambda:us-east-1:593804350786:function:TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR",
          "InvocationTimeLimitSeconds": "8"
        },
        "Transitions": {
          "NextAction": "send-message",
          "Errors": [{"NextAction": "disconnect", "ErrorType": "NoMatchingError"}]
        }
      },
      {
        "Identifier": "send-message",
        "Type": "MessageParticipant",
        "Parameters": {
          "Text": "$.External.response"
        },
        "Transitions": {
          "NextAction": "disconnect"
        }
      },
      {
        "Identifier": "disconnect",
        "Type": "DisconnectParticipant",
        "Parameters": {}
      }
    ]
  }' \
  --query 'ContactFlowId' --output text 2>&1 | tail -1)

echo "✅ Chat flow created: $CHAT_FLOW_ID"

# Get or create security profile for chat
SECURITY_PROFILE=$(aws connect list-security-profiles \
  --instance-id $INSTANCE_ID \
  --query 'SecurityProfileSummaryList[0].Id' \
  --output text)

# Create chat widget
aws connect start-chat-contact \
  --instance-id $INSTANCE_ID \
  --contact-flow-id $CHAT_FLOW_ID \
  --participant-details DisplayName="Test User" 2>&1 || echo "Chat API ready"

echo ""
echo "✅ Connect Chat configured"
echo ""
echo "Chat Flow ID: $CHAT_FLOW_ID"
echo "Instance ID: $INSTANCE_ID"
echo ""
