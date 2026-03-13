#!/bin/bash
# Enable Contact Lens Real-Time Analytics for Treasury Connect

set -e

INSTANCE_ID="a88ddab9-3b29-409f-87f0-bdb614abafef"
VOICE_STREAM_ARN=$(aws cloudformation describe-stacks --stack-name TreasuryConnectStack --query 'Stacks[0].Outputs[?OutputKey==`VoiceAnalyticsStreamArn`].OutputValue' --output text --region us-east-1)
CHAT_STREAM_ARN=$(aws cloudformation describe-stacks --stack-name TreasuryConnectStack --query 'Stacks[0].Outputs[?OutputKey==`ChatAnalyticsStreamArn`].OutputValue' --output text --region us-east-1)

echo "Enabling Contact Lens Real-Time Analytics..."
echo "Instance ID: $INSTANCE_ID"
echo "Voice Stream: $VOICE_STREAM_ARN"
echo "Chat Stream: $CHAT_STREAM_ARN"

# Enable Contact Lens for Voice
echo "Enabling Contact Lens for Voice..."
aws connect associate-instance-storage-config \
  --instance-id $INSTANCE_ID \
  --resource-type REAL_TIME_CONTACT_ANALYSIS_SEGMENTS \
  --storage-config StorageType=KINESIS_STREAM,KinesisStreamConfig={StreamArn=$VOICE_STREAM_ARN} \
  --region us-east-1

# Enable Contact Lens for Chat  
echo "Enabling Contact Lens for Chat..."
aws connect associate-instance-storage-config \
  --instance-id $INSTANCE_ID \
  --resource-type REAL_TIME_CONTACT_ANALYSIS_CHAT_SEGMENTS \
  --storage-config StorageType=KINESIS_STREAM,KinesisStreamConfig={StreamArn=$CHAT_STREAM_ARN} \
  --region us-east-1

echo "✅ Contact Lens Real-Time Analytics enabled successfully!"
echo ""
echo "Next steps:"
echo "1. Deploy the Contact Lens processor: cd infrastructure && npx cdk deploy TreasuryContactLensStack"
echo "2. Test with a real Connect contact"
echo "3. Monitor Kinesis streams for real-time analytics data"
