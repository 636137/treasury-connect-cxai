#!/usr/bin/env python3
import boto3
import json

lambda_client = boto3.client('lambda')

message = "Where is my tax refund?"
print(f"🧪 Testing chat handler with: {message}")
print("")

response = lambda_client.invoke(
    FunctionName='treasury-chat-handler',
    InvocationType='RequestResponse',
    Payload=json.dumps({
        'message': message,
        'Details': {
            'ContactData': {'ContactId': 'test-chat-123'},
            'Parameters': {'message': message}
        }
    })
)

result = json.loads(response['Payload'].read())
print("✅ Response:")
print(json.dumps(result, indent=2))
print("")
print("Check dashboard: http://treasury-cxai-ui-1772478390.s3-website-us-east-1.amazonaws.com")
