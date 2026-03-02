#!/bin/bash

INSTANCE_ID="a88ddab9-3b29-409f-87f0-bdb614abafef"
FLOW_ID="e9ead9c0-9b7d-472d-8379-bb58360f87dd"

echo "Updating chat flow..."

aws connect update-contact-flow-content \
  --instance-id $INSTANCE_ID \
  --contact-flow-id $FLOW_ID \
  --content '{
    "Version": "2019-10-30",
    "StartAction": "get-input",
    "Actions": [
      {
        "Identifier": "get-input",
        "Type": "GetParticipantInput",
        "Parameters": {
          "Text": "Hello! How can I help you today?"
        },
        "Transitions": {
          "NextAction": "invoke-lambda",
          "Errors": [],
          "Conditions": []
        }
      },
      {
        "Identifier": "invoke-lambda",
        "Type": "InvokeLambdaFunction",
        "Parameters": {
          "LambdaFunctionARN": "arn:aws:lambda:us-east-1:593804350786:function:TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR",
          "InvocationTimeLimitSeconds": "8",
          "LambdaInvocationAttributes": {
            "message": "$.StoredCustomerInput",
            "bureau": "IRS"
          }
        },
        "Transitions": {
          "NextAction": "send-response",
          "Errors": [{"NextAction": "error-message", "ErrorType": "NoMatchingError"}]
        }
      },
      {
        "Identifier": "send-response",
        "Type": "MessageParticipant",
        "Parameters": {
          "Text": "$.External.body.response"
        },
        "Transitions": {
          "NextAction": "disconnect"
        }
      },
      {
        "Identifier": "error-message",
        "Type": "MessageParticipant",
        "Parameters": {
          "Text": "I apologize, but I encountered an error. Please try again."
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
  }'

echo "✅ Chat flow updated"
