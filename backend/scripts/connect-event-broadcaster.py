import json
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table('WebSocketConnections')
apigw = boto3.client('apigatewaymanagementapi', 
                    endpoint_url='https://ibmbl856zi.execute-api.us-east-1.amazonaws.com/prod')

def lambda_handler(event, context):
    """Capture Connect events and broadcast to WebSocket"""
    print(f"Event: {json.dumps(event)}")
    
    # Transform Connect event to dashboard format
    detail = event.get('detail', {})
    
    event_data = {
        'type': 'contact',
        'contactId': detail.get('contactId', 'unknown'),
        'initiationMethod': detail.get('initiationMethod', 'INBOUND'),
        'channel': detail.get('channel', 'VOICE'),
        'timestamp': datetime.utcnow().isoformat(),
        'eventType': event.get('detail-type', 'Unknown'),
        'rawEvent': detail
    }
    
    # Broadcast to all WebSocket connections
    try:
        response = connections_table.scan()
        for item in response.get('Items', []):
            try:
                apigw.post_to_connection(
                    ConnectionId=item['connectionId'],
                    Data=json.dumps(event_data).encode('utf-8')
                )
                print(f"Sent to {item['connectionId']}")
            except Exception as e:
                print(f"Failed to send to {item['connectionId']}: {e}")
                connections_table.delete_item(Key={'connectionId': item['connectionId']})
    except Exception as e:
        print(f"Broadcast error: {e}")
    
    return {'statusCode': 200}
