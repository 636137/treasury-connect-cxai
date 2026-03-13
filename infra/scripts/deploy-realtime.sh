#!/bin/bash
set -e

echo "🌐 Creating WebSocket API..."

# Create DynamoDB table for connections
aws dynamodb create-table \
  --table-name WebSocketConnections \
  --attribute-definitions AttributeName=connectionId,AttributeType=S \
  --key-schema AttributeName=connectionId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST 2>&1 | grep -v "ResourceInUseException" || echo "  Table exists"

# Deploy WebSocket Lambda
zip -q websocket-handler.zip websocket-handler.py
aws lambda create-function \
  --function-name treasury-websocket-handler \
  --runtime python3.12 \
  --role arn:aws:iam::593804350786:role/TreasuryLambdaExecutionRole \
  --handler websocket-handler.lambda_handler \
  --zip-file fileb://websocket-handler.zip \
  --timeout 30 \
  --memory-size 512 \
  --environment Variables="{CONNECTIONS_TABLE=WebSocketConnections}" 2>&1 | grep "FunctionArn" || \
aws lambda update-function-code \
  --function-name treasury-websocket-handler \
  --zip-file fileb://websocket-handler.zip 2>&1 | grep "FunctionArn"

# Create WebSocket API
API_ID=$(aws apigatewayv2 create-api \
  --name treasury-realtime-api \
  --protocol-type WEBSOCKET \
  --route-selection-expression '$request.body.action' \
  --query 'ApiId' --output text 2>&1 || \
  aws apigatewayv2 get-apis --query "Items[?Name=='treasury-realtime-api'].ApiId" --output text)

echo "  API ID: $API_ID"

# Get Lambda ARN
LAMBDA_ARN=$(aws lambda get-function --function-name treasury-websocket-handler --query 'Configuration.FunctionArn' --output text)

# Create integration
INT_ID=$(aws apigatewayv2 create-integration \
  --api-id $API_ID \
  --integration-type AWS_PROXY \
  --integration-uri $LAMBDA_ARN \
  --query 'IntegrationId' --output text 2>&1 || echo "exists")

# Create routes
for route in '$connect' '$disconnect' 'sendMessage'; do
  aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key "$route" \
    --target "integrations/$INT_ID" 2>&1 | grep -v "ConflictException" || true
done

# Deploy API
aws apigatewayv2 create-deployment \
  --api-id $API_ID \
  --stage-name prod 2>&1 | grep -v "ConflictException" || true

# Grant API Gateway permission to invoke Lambda
aws lambda add-permission \
  --function-name treasury-websocket-handler \
  --statement-id apigateway-websocket \
  --action lambda:InvokeFunction \
  --principal apigatewaymanagement.amazonaws.com 2>&1 | grep -v "ResourceConflictException" || true

WS_URL=$(aws apigatewayv2 get-api --api-id $API_ID --query 'ApiEndpoint' --output text)

echo ""
echo "✅ WebSocket API deployed"
echo "   URL: ${WS_URL}/prod"
echo ""
