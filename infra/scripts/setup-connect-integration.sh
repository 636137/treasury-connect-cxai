#!/bin/bash
# Quick Start: Amazon Connect Integration Testing
# Treasury Connect CXAI System

set -e

INSTANCE_ID="a88ddab9-3b29-409f-87f0-bdb614abafef"
REGION="us-east-1"
ACCOUNT_ID="593804350786"

echo "=========================================="
echo "Treasury Connect - Quick Start Guide"
echo "=========================================="
echo ""

# Step 1: Claim Phone Number
echo "Step 1: Claim Phone Number"
echo "-------------------------------------------"
echo "Run this command to claim a phone number:"
echo ""
echo "aws connect search-available-phone-numbers \\"
echo "  --target-arn arn:aws:connect:${REGION}:${ACCOUNT_ID}:instance/${INSTANCE_ID} \\"
echo "  --phone-number-country-code US \\"
echo "  --phone-number-type TOLL_FREE \\"
echo "  --region ${REGION}"
echo ""
echo "Then claim it with:"
echo "aws connect claim-phone-number \\"
echo "  --target-arn arn:aws:connect:${REGION}:${ACCOUNT_ID}:instance/${INSTANCE_ID} \\"
echo "  --phone-number <NUMBER_FROM_SEARCH> \\"
echo "  --region ${REGION}"
echo ""
read -p "Press Enter when phone number is claimed..."

# Step 2: Grant Lambda Permissions
echo ""
echo "Step 2: Grant Lambda Permissions"
echo "-------------------------------------------"
echo "Granting Connect permission to invoke AgentCore Lambdas..."
echo ""

LAMBDAS=(
  "TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR"
  "TreasuryAgentCoreStack-AgentMINTRuntime14C8D456-SBKYsYEZF0Eg"
  "TreasuryAgentCoreStack-AgentTOPRuntime071D2934-HPN9JTUkogG9"
  "TreasuryAgentCoreStack-AgentTDRuntimeA5106084-C1YR5ulT2wLJ"
  "TreasuryAgentCoreStack-AgentDERuntime778B6C5C-IADf7Pmqvk32"
)

for lambda in "${LAMBDAS[@]}"; do
  echo "Adding permission for $lambda..."
  aws lambda add-permission \
    --function-name "$lambda" \
    --statement-id AllowConnectInvoke \
    --action lambda:InvokeFunction \
    --principal connect.amazonaws.com \
    --source-arn "arn:aws:connect:${REGION}:${ACCOUNT_ID}:instance/${INSTANCE_ID}" \
    --region ${REGION} 2>/dev/null || echo "  (Permission may already exist)"
done

echo ""
echo "✅ Lambda permissions configured"

# Step 3: Enable Contact Lens
echo ""
echo "Step 3: Enable Contact Lens"
echo "-------------------------------------------"
echo "Enabling Contact Lens on the instance..."
echo ""

aws connect update-instance-attribute \
  --instance-id ${INSTANCE_ID} \
  --attribute-type CONTACT_LENS \
  --value true \
  --region ${REGION} 2>/dev/null || echo "Contact Lens may already be enabled"

echo ""
echo "Associating Kinesis stream for real-time analytics..."
aws connect associate-instance-storage-config \
  --instance-id ${INSTANCE_ID} \
  --resource-type REAL_TIME_CONTACT_ANALYSIS_SEGMENTS \
  --storage-config "StorageType=KINESIS_STREAM,KinesisStreamConfig={StreamArn=arn:aws:kinesis:${REGION}:${ACCOUNT_ID}:stream/treasury-voice-analytics}" \
  --region ${REGION} 2>/dev/null || echo "Kinesis may already be associated"

echo ""
echo "✅ Contact Lens enabled"

# Step 4: Create Basic Contact Flow
echo ""
echo "Step 4: Create Basic Contact Flow"
echo "-------------------------------------------"
echo "Creating a basic contact flow..."
echo ""

# Create flow JSON
cat > /tmp/treasury-basic-flow.json <<'EOF'
{
  "Version": "2019-10-30",
  "StartAction": "welcome",
  "Actions": [
    {
      "Identifier": "welcome",
      "Type": "MessageParticipant",
      "Parameters": {
        "Text": "Welcome to U.S. Treasury. Press 1 for IRS, 2 for Treasury Direct, 3 for Bureau of Fiscal Service."
      },
      "Transitions": {
        "NextAction": "get-input",
        "Errors": [],
        "Conditions": []
      }
    },
    {
      "Identifier": "get-input",
      "Type": "GetParticipantInput",
      "Parameters": {
        "Text": "Please make your selection.",
        "InputTimeLimitSeconds": "5",
        "MaxDigits": "1"
      },
      "Transitions": {
        "NextAction": "check-input",
        "Errors": [
          {
            "NextAction": "disconnect",
            "ErrorType": "NoMatchingError"
          }
        ],
        "Conditions": []
      }
    },
    {
      "Identifier": "check-input",
      "Type": "Compare",
      "Parameters": {
        "ComparisonValue": "1"
      },
      "Transitions": {
        "NextAction": "invoke-irs",
        "Errors": [],
        "Conditions": [
          {
            "NextAction": "invoke-irs",
            "Condition": {
              "Operator": "Equals",
              "Operands": ["1"]
            }
          },
          {
            "NextAction": "disconnect",
            "Condition": {
              "Operator": "Equals",
              "Operands": ["2"]
            }
          }
        ]
      }
    },
    {
      "Identifier": "invoke-irs",
      "Type": "InvokeLambdaFunction",
      "Parameters": {
        "LambdaFunctionARN": "arn:aws:lambda:us-east-1:593804350786:function:TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR",
        "InvocationTimeLimitSeconds": "30",
        "LambdaInvocationAttributes": {
          "message": "I need help with my taxes",
          "bureau": "IRS"
        }
      },
      "Transitions": {
        "NextAction": "play-response",
        "Errors": [
          {
            "NextAction": "disconnect",
            "ErrorType": "NoMatchingError"
          }
        ],
        "Conditions": []
      }
    },
    {
      "Identifier": "play-response",
      "Type": "MessageParticipant",
      "Parameters": {
        "Text": "$.External.response"
      },
      "Transitions": {
        "NextAction": "disconnect",
        "Errors": [],
        "Conditions": []
      }
    },
    {
      "Identifier": "disconnect",
      "Type": "DisconnectParticipant",
      "Parameters": {},
      "Transitions": {}
    }
  ]
}
EOF

echo "Flow JSON created at /tmp/treasury-basic-flow.json"
echo ""
echo "To create the flow in Connect, run:"
echo ""
echo "aws connect create-contact-flow \\"
echo "  --instance-id ${INSTANCE_ID} \\"
echo "  --name 'Treasury Basic Flow' \\"
echo "  --type CONTACT_FLOW \\"
echo "  --content file:///tmp/treasury-basic-flow.json \\"
echo "  --region ${REGION}"
echo ""
read -p "Press Enter after creating the flow..."

# Step 5: Test Instructions
echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Log into Amazon Connect admin console:"
echo "   https://treasury-connect-prod.my.connect.aws/connect/login"
echo ""
echo "2. Associate the phone number with the 'Treasury Basic Flow'"
echo ""
echo "3. Make a test call to the phone number"
echo ""
echo "4. Monitor logs:"
echo "   aws logs tail /aws/lambda/TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR --follow"
echo ""
echo "5. Check DynamoDB for contact records:"
echo "   aws dynamodb scan --table-name TreasuryContacts --limit 5"
echo ""
echo "6. View Contact Lens analytics in Connect console"
echo ""
echo "=========================================="
echo "For detailed testing plan, see:"
echo "  /home/ec2-user/CXAIDemo1/AMAZON_CONNECT_TEST_PLAN.md"
echo "=========================================="
