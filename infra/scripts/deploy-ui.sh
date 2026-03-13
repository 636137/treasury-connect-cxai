#!/bin/bash
set -e

echo "🌐 Building and deploying UI..."

# Build React app
echo "📦 Building React app..."
npm run build

# Create S3 bucket for hosting
BUCKET_NAME="treasury-cxai-ui-$(date +%s)"
echo "🪣 Creating S3 bucket: $BUCKET_NAME"

aws s3 mb s3://$BUCKET_NAME --region us-east-1

# Configure for static website hosting
aws s3 website s3://$BUCKET_NAME \
  --index-document index.html \
  --error-document index.html

# Make bucket public
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [{
    \"Sid\": \"PublicReadGetObject\",
    \"Effect\": \"Allow\",
    \"Principal\": \"*\",
    \"Action\": \"s3:GetObject\",
    \"Resource\": \"arn:aws:s3:::$BUCKET_NAME/*\"
  }]
}"

# Upload build files
echo "⬆️  Uploading files..."
aws s3 sync build/ s3://$BUCKET_NAME/ --delete

# Get website URL
URL="http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"

echo ""
echo "✅ UI DEPLOYED!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Access your UI at:"
echo "   $URL"
echo ""
echo "📝 Bucket: $BUCKET_NAME"
echo ""

# Save URL for later
echo "$URL" > ui-url.txt
echo "URL saved to ui-url.txt"
