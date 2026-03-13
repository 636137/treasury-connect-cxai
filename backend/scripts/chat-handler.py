import json
import boto3
from datetime import datetime

lambda_client = boto3.client('lambda')
dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table('WebSocketConnections')
apigw = boto3.client('apigatewaymanagementapi', 
                    endpoint_url='https://ibmbl856zi.execute-api.us-east-1.amazonaws.com/prod')

def lambda_handler(event, context):
    """Handle Connect chat messages"""
    print(f"Event: {json.dumps(event)}")
    
    # Extract message from Connect event
    message = event.get('Details', {}).get('Parameters', {}).get('message', '')
    contact_id = event.get('Details', {}).get('ContactData', {}).get('ContactId', 'unknown')
    
    if not message:
        # Try alternative paths
        message = event.get('message', event.get('text', 'Hello'))
    
    # Broadcast chat start
    broadcast_event({
        'type': 'contact',
        'contactId': contact_id,
        'bureau': 'IRS',
        'channel': 'CHAT',
        'timestamp': datetime.utcnow().isoformat(),
        'phase': 'INIT',
        'customerInput': message
    })
    
    # Invoke IRS agent
    try:
        response = lambda_client.invoke(
            FunctionName='TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR',
            InvocationType='RequestResponse',
            Payload=json.dumps({
                'message': message,
                'bureau': 'IRS',
                'contactId': contact_id
            })
        )
        
        result = json.loads(response['Payload'].read())
        body = json.loads(result.get('body', '{}'))
        agent_response = body.get('response', 'I can help you with that.')
        
        # Broadcast response
        broadcast_event({
            'type': 'contact',
            'contactId': contact_id,
            'bureau': 'IRS',
            'channel': 'CHAT',
            'timestamp': datetime.utcnow().isoformat(),
            'phase': 'RESPONSE',
            'agentResponse': agent_response
        })
        
        return {
            'response': agent_response,
            'body': json.dumps({'response': agent_response})
        }
        
    except Exception as e:
        print(f"Error: {e}")
        return {
            'response': 'I apologize, but I encountered an error.',
            'body': json.dumps({'response': 'I apologize, but I encountered an error.'})
        }

def broadcast_event(event_data):
    """Send event to all WebSocket connections"""
    try:
        response = connections_table.scan()
        for item in response.get('Items', []):
            try:
                apigw.post_to_connection(
                    ConnectionId=item['connectionId'],
                    Data=json.dumps(event_data).encode('utf-8')
                )
            except:
                connections_table.delete_item(Key={'connectionId': item['connectionId']})
    except Exception as e:
        print(f"Broadcast error: {e}")
