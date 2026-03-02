import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table(os.environ.get('CONNECTIONS_TABLE', 'WebSocketConnections'))

def lambda_handler(event, context):
    route_key = event.get('requestContext', {}).get('routeKey')
    connection_id = event.get('requestContext', {}).get('connectionId')
    
    if route_key == '$connect':
        connections_table.put_item(Item={
            'connectionId': connection_id,
            'timestamp': event.get('requestContext', {}).get('requestTimeEpoch')
        })
        return {'statusCode': 200}
    
    elif route_key == '$disconnect':
        connections_table.delete_item(Key={'connectionId': connection_id})
        return {'statusCode': 200}
    
    elif route_key == 'sendMessage':
        # Broadcast to all connections
        body = json.loads(event.get('body', '{}'))
        broadcast_message(body, event['requestContext'])
        return {'statusCode': 200}
    
    return {'statusCode': 400}

def broadcast_message(message, request_context):
    domain = request_context['domainName']
    stage = request_context['stage']
    apigw = boto3.client('apigatewaymanagementapi', endpoint_url=f'https://{domain}/{stage}')
    
    response = connections_table.scan()
    for item in response.get('Items', []):
        try:
            apigw.post_to_connection(
                ConnectionId=item['connectionId'],
                Data=json.dumps(message).encode('utf-8')
            )
        except:
            connections_table.delete_item(Key={'connectionId': item['connectionId']})
