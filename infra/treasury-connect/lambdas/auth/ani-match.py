import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
sessions_table = dynamodb.Table(os.environ.get('SESSIONS_TABLE', 'treasury-sessions'))

def lambda_handler(event, context):
    phone = event['phone']
    contact_id = event['contactId']
    
    try:
        # Query GSI by phone number
        response = sessions_table.query(
            IndexName='phone-index',
            KeyConditionExpression=boto3.dynamodb.conditions.Key('phone').eq(phone)
        )
        
        if response['Items']:
            # Phone found in sessions
            item = response['Items'][0]
            confidence = 0.95 if item.get('contactId') == contact_id else 0.75
            
            return {
                'matched': True,
                'customerId': item.get('customerId', ''),
                'confidence': confidence
            }
        
        return {
            'matched': False,
            'customerId': '',
            'confidence': 0.0
        }
        
    except Exception as e:
        return {
            'matched': False,
            'customerId': '',
            'confidence': 0.0
        }