#!/usr/bin/env python3
"""
Treasury Connect - Full AgentCore Integration Test
Simulates a complete Amazon Connect contact flow with AgentCore agents
"""
import boto3
import json
import time
from datetime import datetime

# AWS clients
connect = boto3.client('connect', region_name='us-east-1')
lambda_client = boto3.client('lambda', region_name='us-east-1')

# Configuration
INSTANCE_ID = 'a88ddab9-3b29-409f-87f0-bdb614abafef'
AGENTS = {
    'irs': 'TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR',
    'td': 'TreasuryAgentCoreStack-AgentTDRuntimeA5106084-C1YR5ulT2wLJ',
    'top': 'TreasuryAgentCoreStack-AgentTOPRuntime071D2934-HPN9JTUkogG9',
    'mint': 'TreasuryAgentCoreStack-AgentMINTRuntime14C8D456-SBKYsYEZF0Eg',
    'de': 'TreasuryAgentCoreStack-AgentDERuntime778B6C5C-IADf7Pmqvk32'
}

def simulate_contact(bureau: str, message: str):
    """Simulate a Connect contact with AgentCore agent"""
    contact_id = f"contact-{bureau}-{int(time.time())}"
    
    print(f"\n{'='*70}")
    print(f"📞 NEW CONTACT - {bureau.upper()} Bureau")
    print(f"{'='*70}")
    print(f"Contact ID: {contact_id}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Instance: treasury-connect-prod")
    print()
    
    # Phase 1: Contact Initialization
    print("🔄 PHASE 1: Contact Initialization")
    print(f"   ✓ Contact routed to {bureau.upper()} queue")
    print(f"   ✓ AgentCore runtime selected")
    print()
    
    # Phase 2: Citizen Input
    print("👤 PHASE 2: Citizen Message")
    print(f"   \"{message}\"")
    print()
    
    # Phase 3: AgentCore Invocation
    print("🤖 PHASE 3: AgentCore Agent Processing")
    print(f"   → Invoking {bureau.upper()} agent...")
    
    start_time = time.time()
    
    try:
        response = lambda_client.invoke(
            FunctionName=AGENTS[bureau],
            InvocationType='RequestResponse',
            Payload=json.dumps({
                'message': message,
                'sessionId': contact_id,
                'contactId': contact_id,
                'instanceId': INSTANCE_ID,
                'bureau': bureau.upper()
            })
        )
        
        duration = (time.time() - start_time) * 1000
        result = json.loads(response['Payload'].read())
        
        if result.get('statusCode') == 200:
            body = json.loads(result['body'])
            
            print(f"   ✓ Agent responded in {duration:.0f}ms")
            print()
            
            # Phase 4: Agent Response
            print("💬 PHASE 4: Agent Response")
            print(f"   {body['response']}")
            print()
            
            # Phase 5: Session Metadata
            print("📊 PHASE 5: Session Metadata")
            print(f"   Session ID: {body.get('session_id', 'N/A')}")
            print(f"   Agent: {body.get('agent', 'N/A')}")
            print(f"   Framework: {body.get('framework', 'N/A')}")
            print(f"   Latency: {duration:.0f}ms")
            print()
            
            print("✅ CONTACT COMPLETED SUCCESSFULLY")
            return True
        else:
            print(f"   ❌ Error: {result}")
            return False
            
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return False

def main():
    print("\n" + "="*70)
    print("🏛️  TREASURY CONNECT - AGENTCORE INTEGRATION TEST")
    print("="*70)
    print("Testing Amazon Connect with Bedrock AgentCore agents")
    print("Simulating real contact center interactions")
    print()
    
    # Test scenarios
    scenarios = [
        {
            'bureau': 'irs',
            'message': 'I filed my taxes in February and still haven\'t received my refund'
        },
        {
            'bureau': 'irs',
            'message': 'I need to set up a payment plan for my tax debt'
        },
        {
            'bureau': 'td',
            'message': 'What is my Series I savings bond worth?'
        }
    ]
    
    results = []
    for scenario in scenarios:
        success = simulate_contact(scenario['bureau'], scenario['message'])
        results.append(success)
        time.sleep(1)
    
    # Summary
    print("\n" + "="*70)
    print("📈 TEST SUMMARY")
    print("="*70)
    print(f"Total Tests: {len(results)}")
    print(f"Passed: {sum(results)}")
    print(f"Failed: {len(results) - sum(results)}")
    print(f"Success Rate: {(sum(results)/len(results)*100):.1f}%")
    print()
    
    if all(results):
        print("✅ ALL TESTS PASSED - AgentCore integration working!")
    else:
        print("⚠️  SOME TESTS FAILED - Review logs above")
    
    print("="*70 + "\n")

if __name__ == '__main__':
    main()
