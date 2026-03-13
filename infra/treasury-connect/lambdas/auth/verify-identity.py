import json
import boto3
import os
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
sessions_table = dynamodb.Table(os.environ['SESSIONS_TABLE'])

def lambda_handler(event, context):
    method = event['method']
    contact_id = event['contactId']
    bureau = event['bureau']
    credentials = event['credentials']
    
    if method == 'ANI_MATCH':
        return ani_match(credentials['phone'], contact_id)
    elif method in ['KBA_CONV', 'KBA_DTMF']:
        return kba_verify(credentials, contact_id, method == 'KBA_DTMF')
    elif method == 'LOGIN_GOV':
        return login_gov_verify(credentials, contact_id)
    
    return {'verified': False, 'assuranceLevel': 'NONE', 'customerId': ''}

def ani_match(phone, contact_id):
    try:
        response = sessions_table.get_item(Key={'contactId': contact_id})
        if 'Item' in response and response['Item'].get('phone') == phone:
            return {
                'verified': True,
                'assuranceLevel': 'LOW',
                'customerId': response['Item'].get('customerId', '')
            }
    except Exception:
        pass
    return {'verified': False, 'assuranceLevel': 'NONE', 'customerId': ''}

def kba_verify(credentials, contact_id, is_dtmf):
    try:
        response = sessions_table.get_item(Key={'contactId': contact_id})
        if 'Item' not in response:
            return {'verified': False, 'assuranceLevel': 'NONE', 'customerId': ''}
        
        item = response['Item']
        ssn4_match = item.get('ssn4') == credentials['ssn4']
        dob_match = item.get('dob') == credentials['dob']
        zip_match = item.get('zip') == credentials['zip']
        
        if ssn4_match and dob_match and zip_match:
            assurance = 'HIGH' if not is_dtmf else 'MEDIUM'
            return {
                'verified': True,
                'assuranceLevel': assurance,
                'customerId': item.get('customerId', '')
            }
    except Exception:
        pass
    return {'verified': False, 'assuranceLevel': 'NONE', 'customerId': ''}

def login_gov_verify(credentials, contact_id):
    # Simplified SAML validation - in production would validate signature, issuer, etc.
    if credentials.get('samlAssertion'):
        return {
            'verified': True,
            'assuranceLevel': 'HIGHEST',
            'customerId': credentials.get('customerId', '')
        }
    return {'verified': False, 'assuranceLevel': 'NONE', 'customerId': ''}