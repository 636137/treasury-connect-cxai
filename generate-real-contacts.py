#!/usr/bin/env python3
"""
Real Contact Generator - Invokes actual Bedrock AgentCore runtimes
"""
import boto3
import json
import time
import random
from datetime import datetime

lambda_client = boto3.client('lambda', region_name='us-east-1')

RUNTIMES = {
    'IRS': 'TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR',
    'MINT': 'TreasuryAgentCoreStack-AgentMINTRuntime14C8D456-SBKYsYEZF0Eg',
    'TOP': 'TreasuryAgentCoreStack-AgentTOPRuntime071D2934-HPN9JTUkogG9',
    'TD': 'TreasuryAgentCoreStack-AgentTDRuntimeA5106084-C1YR5ulT2wLJ',
    'DE': 'TreasuryAgentCoreStack-AgentDERuntime778B6C5C-IADf7Pmqvk32'
}

QUERIES = {
    'IRS': [
        "Where is my tax refund?",
        "I need to set up a payment plan",
        "I got a CP2000 notice, what does it mean?",
        "How do I request a tax transcript?"
    ],
    'TD': [
        "What is my Series I bond worth?",
        "How do I redeem my savings bonds?",
        "My TreasuryDirect account is locked",
        "I need my 1099-INT form"
    ],
    'TOP': [
        "Why was my refund reduced?",
        "I want to dispute this offset",
        "Which agency took money from my refund?"
    ],
    'MINT': [
        "Where is my coin order?",
        "Do you have Silver Eagles in stock?",
        "My package says delivered but I didn't receive it"
    ],
    'DE': [
        "What is my Direct Express balance?",
        "My card was stolen",
        "I need to reset my PIN"
    ]
}

def invoke_agent(bureau, query):
    """Invoke real AgentCore runtime"""
    function_name = RUNTIMES[bureau]
    session_id = f"real-contact-{int(time.time())}"
    
    print(f"\n{'='*70}")
    print(f"📞 REAL CONTACT - {bureau} Bureau")
    print(f"{'='*70}")
    print(f"Session: {session_id}")
    print(f"Query: {query}")
    print(f"Runtime: {function_name}")
    
    payload = {
        'input': query,
        'sessionId': session_id
    }
    
    try:
        start = time.time()
        response = lambda_client.invoke(
            FunctionName=function_name,
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )
        latency = int((time.time() - start) * 1000)
        
        result = json.loads(response['Payload'].read())
        
        print(f"\n✅ Response received in {latency}ms")
        print(f"\n💬 Agent Response:")
        print(f"{result.get('body', 'No response')}")
        print(f"\n{'='*70}\n")
        
        return {
            'success': True,
            'bureau': bureau,
            'query': query,
            'response': result.get('body'),
            'latency': latency,
            'sessionId': session_id
        }
        
    except Exception as e:
        print(f"\n❌ Error: {e}\n")
        return {
            'success': False,
            'bureau': bureau,
            'error': str(e)
        }

def generate_contacts(count=5):
    """Generate real contacts using actual agents"""
    print(f"\n🚀 Generating {count} REAL contacts using deployed AgentCore runtimes\n")
    
    results = []
    for i in range(count):
        bureau = random.choice(list(RUNTIMES.keys()))
        query = random.choice(QUERIES[bureau])
        
        result = invoke_agent(bureau, query)
        results.append(result)
        
        if i < count - 1:
            time.sleep(2)  # Rate limiting
    
    # Summary
    print(f"\n{'='*70}")
    print(f"📊 SUMMARY")
    print(f"{'='*70}")
    successful = [r for r in results if r.get('success')]
    print(f"Total Contacts: {count}")
    print(f"Successful: {len(successful)}")
    print(f"Failed: {count - len(successful)}")
    if successful:
        avg_latency = sum(r['latency'] for r in successful) / len(successful)
        print(f"Average Latency: {avg_latency:.0f}ms")
    print(f"{'='*70}\n")
    
    return results

if __name__ == '__main__':
    import sys
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    generate_contacts(count)
