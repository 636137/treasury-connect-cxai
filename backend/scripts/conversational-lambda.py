#!/usr/bin/env python3
"""
Conversational Lambda for Amazon Connect
Maintains session state for multi-turn conversations
"""
import json
import boto3
import os
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
bedrock_runtime = boto3.client('bedrock-agent-runtime', region_name='us-east-1')
lambda_client = boto3.client('lambda')
apigw_client = boto3.client('apigatewaymanagementapi', endpoint_url='https://ibmbl856zi.execute-api.us-east-1.amazonaws.com/prod')

# Session table for conversation state
SESSION_TABLE = os.environ.get('SESSION_TABLE', 'TreasuryConversations')
sessions_table = dynamodb.Table(SESSION_TABLE)
connections_table = dynamodb.Table('WebSocketConnections')

# AgentCore Lambda functions
AGENT_LAMBDAS = {
    'IRS': 'TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR',
    'MINT': 'TreasuryAgentCoreStack-AgentMINTRuntime14C8D456-SBKYsYEZF0Eg',
    'TOP': 'TreasuryAgentCoreStack-AgentTOPRuntime071D2934-HPN9JTUkogG9',
    'TD': 'TreasuryAgentCoreStack-AgentTDRuntimeA5106084-C1YR5ulT2wLJ',
    'DE': 'TreasuryAgentCoreStack-AgentDERuntime778B6C5C-IADf7Pmqvk32'
}

def broadcast_event(event_data):
    """Send event to all WebSocket connections"""
    try:
        response = connections_table.scan()
        for item in response.get('Items', []):
            try:
                apigw_client.post_to_connection(
                    ConnectionId=item['connectionId'],
                    Data=json.dumps(event_data).encode('utf-8')
                )
            except:
                connections_table.delete_item(Key={'connectionId': item['connectionId']})
    except Exception as e:
        print(f"Broadcast error: {e}")

def handler(event, context):
    """
    Connect invokes this Lambda for each customer utterance.
    We maintain conversation state and invoke the appropriate agent.
    """
    print(f"Event: {json.dumps(event)}")
    
    # Extract Connect parameters
    contact_id = event.get('Details', {}).get('ContactData', {}).get('ContactId', 'unknown')
    customer_input = event.get('Details', {}).get('Parameters', {}).get('CustomerInput', '')
    bureau = event.get('Details', {}).get('Parameters', {}).get('Bureau', 'IRS')
    
    # Broadcast contact start
    broadcast_event({
        'type': 'contact',
        'contactId': contact_id,
        'bureau': bureau,
        'channel': 'VOICE',
        'timestamp': datetime.utcnow().isoformat(),
        'phase': 'INIT',
        'customerInput': customer_input
    })
    
    # Get or create session
    session = get_session(contact_id, bureau)
    
    # Add customer message to history
    session['history'].append({
        'role': 'user',
        'content': customer_input,
        'timestamp': datetime.utcnow().isoformat()
    })
    
    # Invoke agent with conversation history
    agent_response = invoke_agent(bureau, customer_input, session)
    
    # Add agent response to history
    session['history'].append({
        'role': 'assistant',
        'content': agent_response,
        'timestamp': datetime.utcnow().isoformat()
    })
    
    # Save session
    save_session(contact_id, session)
    
    # Broadcast response
    broadcast_event({
        'type': 'contact',
        'contactId': contact_id,
        'bureau': bureau,
        'channel': 'VOICE',
        'timestamp': datetime.utcnow().isoformat(),
        'phase': 'RESPONSE',
        'agentResponse': agent_response,
        'turnCount': len(session['history']) // 2
    })
    
    # Determine if conversation should continue
    should_continue = not is_conversation_complete(agent_response, session)
    
    return {
        'response': agent_response,
        'continueConversation': should_continue,
        'sessionId': contact_id,
        'turnCount': len(session['history']) // 2
    }

def get_session(contact_id, bureau):
    """Get existing session or create new one"""
    try:
        response = sessions_table.get_item(Key={'contactId': contact_id})
        if 'Item' in response:
            return response['Item']
    except:
        pass
    
    return {
        'contactId': contact_id,
        'bureau': bureau,
        'history': [],
        'startTime': datetime.utcnow().isoformat()
    }

def save_session(contact_id, session):
    """Save session to DynamoDB"""
    sessions_table.put_item(Item=session)

def invoke_agent(bureau, message, session):
    """Invoke the appropriate AgentCore Lambda with conversation context"""
    lambda_name = AGENT_LAMBDAS.get(bureau, AGENT_LAMBDAS['IRS'])
    
    payload = {
        'message': message,
        'bureau': bureau,
        'sessionId': session['contactId'],
        'conversationHistory': session['history'][-10:]  # Last 5 turns
    }
    
    response = lambda_client.invoke(
        FunctionName=lambda_name,
        InvocationType='RequestResponse',
        Payload=json.dumps(payload)
    )
    
    result = json.loads(response['Payload'].read())
    body = json.loads(result.get('body', '{}'))
    
    return body.get('response', 'I apologize, I encountered an error.')

def is_conversation_complete(response, session):
    """Determine if conversation is complete"""
    # Check for completion signals
    completion_phrases = [
        'goodbye',
        'have a great day',
        'is there anything else',
        'that completes',
        'thank you for calling'
    ]
    
    response_lower = response.lower()
    for phrase in completion_phrases:
        if phrase in response_lower:
            return True
    
    # Max 10 turns
    if len(session['history']) >= 20:
        return True
    
    return False
