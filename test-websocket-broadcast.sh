#!/bin/bash
echo "Testing WebSocket broadcast..."
echo ""

# Simulate a Connect event
aws lambda invoke \
  --function-name treasury-connect-event-broadcaster \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "detail-type": "Amazon Connect Contact Event",
    "source": "aws.connect",
    "detail": {
      "contactId": "test-'$(date +%s)'",
      "initiationMethod": "INBOUND",
      "channel": "VOICE",
      "instanceArn": "arn:aws:connect:us-east-1:593804350786:instance/a88ddab9-3b29-409f-87f0-bdb614abafef"
    }
  }' \
  /tmp/broadcast-test.json

echo ""
echo "✅ Test event sent"
echo "Check dashboard - you should see a test contact appear"
echo ""
echo "Dashboard: http://treasury-cxai-ui-1772478390.s3-website-us-east-1.amazonaws.com"
