#!/bin/bash
set -e

echo "🏛️  Treasury Connect Deployment Script"
echo "========================================"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured"
    exit 1
fi

export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=${AWS_REGION:-us-east-1}

echo "✅ AWS Account: $AWS_ACCOUNT_ID"
echo "✅ AWS Region: $AWS_REGION"

# Update config
cd treasury-connect/infrastructure
cat > lib/config.ts << EOF
export const CONFIG = {
  account: '${AWS_ACCOUNT_ID}',
  region: '${AWS_REGION}',
  tags: {
    Project: 'TreasuryConnect',
    Environment: 'Demo',
    ManagedBy: 'CDK'
  }
};
EOF

echo "✅ Config updated"

# Install dependencies
echo "📦 Installing infrastructure dependencies..."
npm install

# Build
echo "🔨 Building CDK stacks..."
npm run build

# Bootstrap (if needed)
echo "🚀 Bootstrapping CDK..."
npx cdk bootstrap aws://${AWS_ACCOUNT_ID}/${AWS_REGION} || true

# Deploy
echo "🚢 Deploying stacks..."
npx cdk deploy --all --require-approval never

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Next steps:"
echo "   1. cd ../.."
echo "   2. npm install"
echo "   3. npm start"
echo ""
echo "🌐 Frontend will open at http://localhost:3000"
