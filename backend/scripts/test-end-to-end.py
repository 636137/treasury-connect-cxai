#!/usr/bin/env python3
import boto3
import json
from datetime import datetime

lambda_client = boto3.client('lambda')
dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table('WebSocketConnections')
apigw = boto3.client('apigatewaymanagementapi', 
                    endpoint_url='https://ibmbl856zi.execute-api.us-east-1.amazonaws.com/prod')

def broadcast(data):
    response = connections_table.scan()
    for item in response.get('Items', []):
        try:
            apigw.post_to_connection(
                ConnectionId=item['connectionId'],
                Data=json.dumps(data).encode('utf-8')
            )
            print(f"✅ Sent to {item['connectionId']}")
        except Exception as e:
            print(f"❌ Failed: {e}")

message = "Where is my tax refund?"
contact_id = f"test-{int(datetime.utcnow().timestamp())}"

print(f"🧪 Testing end-to-end with: {message}")
print(f"📋 Contact ID: {contact_id}")
print("")

# Broadcast start
print("📤 Broadcasting contact start...")
broadcast({
    'type': 'contact',
    'contactId': contact_id,
    'bureau': 'IRS',
    'channel': 'CHAT',
    'timestamp': datetime.utcnow().isoformat(),
    'phase': 'INIT',
    'customerInput': message
})

# Invoke IRS agent
print("🤖 Invoking IRS agent...")
response = lambda_client.invoke(
    FunctionName='TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR',
    InvocationType='RequestResponse',
    Payload=json.dumps({'message': message, 'bureau': 'IRS'})
)

result = json.loads(response['Payload'].read())
body = json.loads(result.get('body', '{}'))
agent_response = body.get('response', 'No response')

print(f"✅ Agent response: {agent_response[:100]}...")
print("")

# Broadcast response
print("📤 Broadcasting agent response...")
broadcast({
    'type': 'contact',
    'contactId': contact_id,
    'bureau': 'IRS',
    'channel': 'CHAT',
    'timestamp': datetime.utcnow().isoformat(),
    'phase': 'RESPONSE',
    'agentResponse': agent_response
})

print("")
print("✅ Test complete!")
print("Check dashboard: http://treasury-cxai-ui-1772478390.s3-website-us-east-1.amazonaws.com")
