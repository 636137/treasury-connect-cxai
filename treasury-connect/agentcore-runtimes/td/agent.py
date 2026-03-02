"""
Simplified IRS Agent for testing (without Strands SDK dependency)
Demonstrates AgentCore pattern with Bedrock direct invocation
"""
import json
import boto3
import os

bedrock = boto3.client('bedrock-runtime', region_name=os.environ.get('REGION', 'us-east-1'))

def check_refund_status(ssn_last4: str, filing_year: int = 2025) -> dict:
    """Simulated refund check"""
    return {
        "status": "APPROVED",
        "amount": 2450.00,
        "expected_date": "2026-03-15",
        "filing_year": filing_year
    }

def handler(event, context):
    """AgentCore Lambda handler"""
    try:
        message = event.get('message', '')
        session_id = event.get('sessionId', 'default')
        
        # System prompt for IRS agent
        system_prompt = """You are an IRS virtual assistant for the U.S. Treasury.

CRITICAL RULES:
1. Verify identity before disclosing account information
2. All dollar amounts and dates must be accurate
3. Never provide investment advice or political opinions
4. Be empathetic and professional

You can check refund status by calling the check_refund_status tool."""

        # Simple tool calling with Bedrock
        if "refund" in message.lower():
            # Simulate tool call
            refund_data = check_refund_status("1234", 2025)
            response_text = f"I've checked your refund status. Your refund of ${refund_data['amount']} has been approved and should arrive by {refund_data['expected_date']}."
        else:
            # Direct Bedrock invocation with Amazon Nova Pro
            bedrock_response = bedrock.invoke_model(
                modelId='us.amazon.nova-pro-v1:0',
                body=json.dumps({
                    "messages": [{
                        "role": "user",
                        "content": [{"text": f"{system_prompt}\n\n{message}"}]
                    }],
                    "inferenceConfig": {"max_new_tokens": 1024}
                })
            )
            
            response_body = json.loads(bedrock_response['body'].read())
            response_text = response_body['output']['message']['content'][0]['text']
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'response': response_text,
                'session_id': session_id,
                'agent': 'IRS',
                'framework': 'AgentCore-Direct'
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'type': type(e).__name__
            })
        }
