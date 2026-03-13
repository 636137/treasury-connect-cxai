#!/usr/bin/env python3
import boto3
import json

connect = boto3.client('connect', region_name='us-east-1')
instance_id = 'a88ddab9-3b29-409f-87f0-bdb614abafef'

# Get existing sample flow to use as template
flows = connect.list_contact_flows(InstanceId=instance_id, ContactFlowTypes=['CONTACT_FLOW'])
sample_flow_id = None
for flow in flows['ContactFlowSummaryList']:
    if 'Sample' in flow['Name']:
        sample_flow_id = flow['Id']
        break

if sample_flow_id:
    # Get the sample flow content
    flow_content = connect.describe_contact_flow(
        InstanceId=instance_id,
        ContactFlowId=sample_flow_id
    )
    print(f"Sample flow structure:")
    print(json.dumps(json.loads(flow_content['ContactFlow']['Content']), indent=2)[:2000])
else:
    print("No sample flow found")

# List Lambda functions that Connect can invoke
print("\n\nLambda functions available:")
print("- TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR")
print("- TreasuryAgentCoreStack-AgentMINTRuntime14C8D456-SBKYsYEZF0Eg")
print("- TreasuryAgentCoreStack-AgentTOPRuntime071D2934-HPN9JTUkogG9")
print("- TreasuryAgentCoreStack-AgentTDRuntimeA5106084-C1YR5ulT2wLJ")
print("- TreasuryAgentCoreStack-AgentDERuntime778B6C5C-IADf7Pmqvk32")
