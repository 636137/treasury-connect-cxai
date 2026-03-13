import boto3
import json
from datetime import datetime

# This gets injected into the AgentCore Lambda response
def broadcast_to_websocket(contact_id, bureau, message, response):
    """Broadcast contact event to WebSocket"""
    try:
        dynamodb = boto3.resource('dynamodb')
        connections_table = dynamodb.Table('WebSocketConnections')
        apigw = boto3.client('apigatewaymanagementapi', 
                            endpoint_url='https://ibmbl856zi.execute-api.us-east-1.amazonaws.com/prod')
        
        event_data = {
            'type': 'contact',
            'contactId': contact_id,
            'bureau': bureau,
            'channel': 'VOICE',
            'timestamp': datetime.utcnow().isoformat(),
            'customerInput': message,
            'agentResponse': response,
            'phase': 'RESPONSE'
        }
        
        # Get all connections
        response = connections_table.scan()
        for item in response.get('Items', []):
            try:
                apigw.post_to_connection(
                    ConnectionId=item['connectionId'],
                    Data=json.dumps(event_data).encode('utf-8')
                )
            except:
                # Connection is stale, delete it
                connections_table.delete_item(Key={'connectionId': item['connectionId']})
    except Exception as e:
        print(f"Broadcast error: {e}")
