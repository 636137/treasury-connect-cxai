#!/usr/bin/env python3
import boto3
import json
import time
from datetime import datetime

lambda_client = boto3.client('lambda')
dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table('WebSocketConnections')
apigw = boto3.client('apigatewaymanagementapi', 
                    endpoint_url='https://ibmbl856zi.execute-api.us-east-1.amazonaws.com/prod')

def broadcast(data):
    """Broadcast to all WebSocket connections"""
    try:
        response = connections_table.scan()
        count = 0
        for item in response.get('Items', []):
            try:
                apigw.post_to_connection(
                    ConnectionId=item['connectionId'],
                    Data=json.dumps(data).encode('utf-8')
                )
                count += 1
            except:
                connections_table.delete_item(Key={'connectionId': item['connectionId']})
        return count
    except Exception as e:
        print(f"Broadcast error: {e}")
        return 0

def test_scenario(message, bureau='IRS'):
    """Run a single test scenario"""
    contact_id = f"test-{int(datetime.utcnow().timestamp())}"
    
    print(f"\n{'='*60}")
    print(f"📞 Contact: {contact_id}")
    print(f"🏛️  Bureau: {bureau}")
    print(f"💬 Message: {message}")
    print(f"{'='*60}")
    
    # Broadcast INIT
    print("📤 Broadcasting INIT...")
    count = broadcast({
        'type': 'contact',
        'contactId': contact_id,
        'bureau': bureau,
        'channel': 'CHAT',
        'timestamp': datetime.utcnow().isoformat(),
        'phase': 'INIT',
        'customerInput': message
    })
    print(f"   Sent to {count} connections")
    
    time.sleep(1)
    
    # Invoke agent
    print("🤖 Invoking AI agent...")
    lambda_name = {
        'IRS': 'TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR',
        'MINT': 'TreasuryAgentCoreStack-AgentMINTRuntime14C8D456-SBKYsYEZF0Eg',
        'TOP': 'TreasuryAgentCoreStack-AgentTOPRuntime071D2934-HPN9JTUkogG9',
        'TD': 'TreasuryAgentCoreStack-AgentTDRuntimeA5106084-C1YR5ulT2wLJ',
        'DE': 'TreasuryAgentCoreStack-AgentDERuntime778B6C5C-IADf7Pmqvk32'
    }.get(bureau, 'TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR')
    
    start = time.time()
    response = lambda_client.invoke(
        FunctionName=lambda_name,
        InvocationType='RequestResponse',
        Payload=json.dumps({'message': message, 'bureau': bureau})
    )
    latency = int((time.time() - start) * 1000)
    
    result = json.loads(response['Payload'].read())
    body = json.loads(result.get('body', '{}'))
    agent_response = body.get('response', 'No response')
    
    print(f"✅ Response ({latency}ms): {agent_response[:80]}...")
    
    # Broadcast RESPONSE
    print("📤 Broadcasting RESPONSE...")
    count = broadcast({
        'type': 'contact',
        'contactId': contact_id,
        'bureau': bureau,
        'channel': 'CHAT',
        'timestamp': datetime.utcnow().isoformat(),
        'phase': 'RESPONSE',
        'agentResponse': agent_response,
        'latency': latency
    })
    print(f"   Sent to {count} connections")
    
    return contact_id

def main():
    print("\n" + "="*60)
    print("🚀 CXAI COMPREHENSIVE TEST SUITE")
    print("="*60)
    print("\n📊 Dashboard: http://treasury-cxai-ui-1772478390.s3-website-us-east-1.amazonaws.com")
    print("\n⏳ Starting tests in 3 seconds...")
    print("   (Open dashboard now to watch live!)")
    time.sleep(3)
    
    scenarios = [
        ("Where is my tax refund?", "IRS"),
        ("I need to set up a payment plan", "IRS"),
        ("What is my Series I bond worth?", "TD"),
        ("My refund was reduced, why?", "TOP"),
        ("I want to buy commemorative coins", "MINT"),
    ]
    
    results = []
    for message, bureau in scenarios:
        contact_id = test_scenario(message, bureau)
        results.append(contact_id)
        time.sleep(2)
    
    print("\n" + "="*60)
    print("✅ ALL TESTS COMPLETE")
    print("="*60)
    print(f"\n📊 Total contacts created: {len(results)}")
    print("\n🌐 View results:")
    print("   http://treasury-cxai-ui-1772478390.s3-website-us-east-1.amazonaws.com")
    print("\n📋 Contact IDs:")
    for cid in results:
        print(f"   • {cid}")
    print()

if __name__ == '__main__':
    main()
