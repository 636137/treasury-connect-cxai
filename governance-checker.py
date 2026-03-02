import json
import boto3
import os

bedrock = boto3.client('bedrock-runtime')
GUARDRAIL_ID = os.environ.get('GUARDRAIL_ID', '')
GUARDRAIL_VERSION = os.environ.get('GUARDRAIL_VERSION', 'DRAFT')

def check_guardrails(text, source='INPUT'):
    if not GUARDRAIL_ID:
        return {'action': 'NONE', 'passed': True}
    
    try:
        response = bedrock.apply_guardrail(
            guardrailIdentifier=GUARDRAIL_ID,
            guardrailVersion=GUARDRAIL_VERSION,
            source=source,
            content=[{'text': {'text': text}}]
        )
        
        action = response.get('action', 'NONE')
        assessments = response.get('assessments', [])
        
        return {
            'action': action,
            'passed': action == 'NONE',
            'assessments': assessments
        }
    except Exception as e:
        return {'action': 'ERROR', 'passed': False, 'error': str(e)}

def verify_facts(response_text, context):
    """Simple fact verification - checks for dollar amounts and dates"""
    import re
    
    # Extract dollar amounts
    dollars = re.findall(r'\$[\d,]+(?:\.\d{2})?', response_text)
    # Extract dates
    dates = re.findall(r'\d{4}-\d{2}-\d{2}', response_text)
    
    # Basic validation: if we have specific amounts/dates, mark as needing verification
    needs_verification = len(dollars) > 0 or len(dates) > 0
    
    return {
        'result': 'VALID' if not needs_verification else 'NEEDS_REVIEW',
        'dollarsFound': dollars,
        'datesFound': dates,
        'confidence': 0.85 if not needs_verification else 0.60
    }

def lambda_handler(event, context):
    text = event.get('text', '')
    check_type = event.get('type', 'output')
    context_data = event.get('context', {})
    
    # Run guardrails
    guardrail_result = check_guardrails(text, 'OUTPUT' if check_type == 'output' else 'INPUT')
    
    # Run fact verification
    fact_check = verify_facts(text, context_data)
    
    passed = guardrail_result['passed'] and fact_check['result'] == 'VALID'
    
    return {
        'statusCode': 200,
        'passed': passed,
        'guardrails': guardrail_result,
        'factCheck': fact_check,
        'action': 'ALLOW' if passed else 'BLOCK'
    }
