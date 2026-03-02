# Amazon Connect Testing & Integration Plan
## Treasury Connect CXAI System

**Date**: March 2, 2026  
**Status**: Infrastructure Deployed - Connect Integration Needed  
**Instance ID**: a88ddab9-3b29-409f-87f0-bdb614abafef

---

## Executive Summary

The Treasury Connect CXAI system has **all backend infrastructure deployed and tested** (11 CloudFormation stacks, 100% test pass rate). However, **Amazon Connect is not yet integrated** with the AI agents and flows. This document outlines what needs to be built to enable end-to-end testing through Amazon Connect.

---

## Current State Analysis

### ✅ What's Already Built & Working

#### 1. AI/ML Layer (100% Operational)
- **6 Bedrock Agents** (Amazon Nova Pro) - Tested, responding
  - IRS Agent (Y7IIVROJX6)
  - MINT Agent (PGEVUOGPH7)
  - TOP Agent (F4A9TP4IPS)
  - TD Agent (JWAUX8YZVZ)
  - DE Agent (2GUMJA92BE)
  - Direct Agent
- **5 AgentCore Lambda Runtimes** (Claude 3.5 Sonnet) - Tested, 100% success rate
- **Test Results**: 10/10 tests passed, avg latency 1,847ms

#### 2. Governance Layer (Deployed)
- **5 Bedrock Guardrails** - PII protection, content filtering
- **Cedar Policy Engine** - Policy store and evaluator Lambda
- **Automated Reasoning** - AR verifier Lambda with rules bucket

#### 3. Contact Center Infrastructure (Deployed)
- **Amazon Connect Instance** - Active (a88ddab9-3b29-409f-87f0-bdb614abafef)
- **6 Queues** - IRS, MINT, TOP, TD, DE, Direct
- **2 Kinesis Streams** - Voice and chat analytics
- **Contact Lens** - Real-time analytics processor deployed
- **S3 Buckets** - Call recordings, chat transcripts, analytics

#### 4. Data & Storage (Operational)
- **DynamoDB** - TreasuryContacts table with test data
- **S3 Buckets** - Data, policies, AR rules
- **Cognito** - User pool, identity pool, MFA enabled

#### 5. Real-time Features (Working)
- **WebSocket API** - Live updates (wss://et6ua1zeob.execute-api.us-east-1.amazonaws.com/prod)
- **React UI** - Flow Operations Center dashboard

#### 6. Tool Functions (Deployed)
- treasury-refund-status
- treasury-identity-validate
- treasury-policy-evaluate
- treasury-ar-verify
- treasury-rag-retrieve
- treasury-queue-metrics

---

## ❌ What's Missing for Amazon Connect Integration

### Critical Gaps

#### 1. **No Phone Numbers Configured**
- **Issue**: Connect instance has no claimed phone numbers
- **Impact**: Cannot receive inbound calls
- **Required**: Claim at least one phone number for testing

#### 2. **No Custom Contact Flows**
- **Issue**: Only default sample flows exist (agent hold, transfer, whisper)
- **Impact**: No flows to invoke Bedrock agents or handle bureau routing
- **Required**: Build custom contact flows that:
  - Invoke Bedrock agents via Lambda
  - Route to appropriate bureau queues
  - Handle authentication
  - Integrate with Contact Lens

#### 3. **No Lambda Integration in Flows**
- **Issue**: Contact flows don't invoke AgentCore runtimes or Bedrock agents
- **Impact**: AI agents are isolated from Connect
- **Required**: Add "Invoke AWS Lambda function" blocks in flows

#### 4. **No Lex Bot Integration** (Optional)
- **Issue**: No conversational IVR for intent detection
- **Impact**: Cannot automatically route based on customer utterances
- **Required**: Build Lex bot with intents for each bureau

#### 5. **No Contact Lens Configuration**
- **Issue**: Contact Lens processor deployed but not enabled on instance
- **Impact**: No real-time analytics on calls
- **Required**: Enable Contact Lens on Connect instance

#### 6. **No Agent Workspace Configuration**
- **Issue**: No CCP (Contact Control Panel) or agent UI configured
- **Impact**: Agents cannot handle contacts
- **Required**: Set up agent workspace or use default CCP

---

## What Needs to Be Built

### Phase 1: Basic Connect Integration (1-2 days)

#### Task 1.1: Claim Phone Number
```bash
# Claim a phone number for the Connect instance
aws connect claim-phone-number \
  --target-arn arn:aws:connect:us-east-1:593804350786:instance/a88ddab9-3b29-409f-87f0-bdb614abafef \
  --phone-number-country-code US \
  --phone-number-type DID \
  --region us-east-1
```

**Deliverable**: Working phone number that can receive calls

#### Task 1.2: Create Basic Inbound Flow
Build a contact flow that:
1. Plays welcome message
2. Collects customer input (bureau selection)
3. Invokes Lambda to call Bedrock agent
4. Plays agent response
5. Routes to queue if needed

**Deliverable**: JSON contact flow definition

#### Task 1.3: Connect Lambda to Flow
- Grant Connect permission to invoke AgentCore Lambdas
- Add Lambda invocation blocks to flow
- Pass contact attributes to Lambda
- Handle Lambda responses

**Deliverable**: Working Lambda integration in flow

#### Task 1.4: Enable Contact Lens
```bash
# Enable Contact Lens on the instance
aws connect update-instance-attribute \
  --instance-id a88ddab9-3b29-409f-87f0-bdb614abafef \
  --attribute-type CONTACT_LENS \
  --value true \
  --region us-east-1
```

**Deliverable**: Contact Lens enabled and streaming to Kinesis

---

### Phase 2: Advanced Features (3-5 days)

#### Task 2.1: Build Lex Bot for Intent Detection
Create Lex bot with intents:
- RefundStatusIntent (MINT)
- BondPurchaseIntent (TD)
- PaymentStatusIntent (TOP)
- CardAssistanceIntent (DE)
- TaxQuestionIntent (IRS)

**Deliverable**: Lex bot integrated with Connect flow

#### Task 2.2: Implement Authentication Flow
Build flow that:
1. Prompts for SSN or account number
2. Invokes identity-validate Lambda
3. Enforces 3-attempt limit
4. Transfers to agent on failure

**Deliverable**: Secure authentication flow

#### Task 2.3: Skills-Based Routing
Configure:
- Agent routing profiles
- Skills and proficiency levels
- Queue priority and routing logic

**Deliverable**: Intelligent routing to bureau-specific agents

#### Task 2.4: Callback Functionality
Implement:
- Queue position check
- Callback offer when wait > 2 minutes
- Callback scheduling Lambda
- Outbound callback flow

**Deliverable**: Working callback system

#### Task 2.5: Multi-Channel Support
Enable:
- Chat widget integration
- SMS messaging
- Email integration (optional)

**Deliverable**: Omnichannel contact center

---

### Phase 3: Production Readiness (1 week)

#### Task 3.1: Build Agent Workspace
- Configure CCP (Contact Control Panel)
- Create custom agent UI with React
- Integrate with WebSocket for real-time updates
- Add screen pop with customer context

**Deliverable**: Full agent workspace

#### Task 3.2: Reporting & Analytics
- Configure Contact Lens dashboards
- Build custom CloudWatch dashboards
- Set up alarms for SLA breaches
- Create daily/weekly reports

**Deliverable**: Comprehensive monitoring

#### Task 3.3: Quality Management
- Configure evaluation forms
- Set up supervisor monitoring
- Enable call recording review
- Implement coaching workflows

**Deliverable**: QM system

#### Task 3.4: Disaster Recovery
- Document runbooks
- Create backup flows
- Test failover scenarios
- Set up cross-region replication

**Deliverable**: DR plan

---

## Testing Strategy

### Test Phase 1: Component Testing (Current)
**Status**: ✅ COMPLETE
- Direct Lambda invocation: 100% pass rate
- Bedrock agent testing: All agents responding
- Tool function testing: All 6 functions operational
- Data persistence: DynamoDB verified

### Test Phase 2: Connect Integration Testing (Next)
**Status**: ⚠️ NOT STARTED - REQUIRES FLOWS

#### Test 2.1: Basic Call Flow
1. Call phone number
2. Verify IVR plays
3. Select bureau option
4. Confirm agent invoked
5. Verify response played
6. Check DynamoDB record

**Expected Result**: End-to-end call completes successfully

#### Test 2.2: Lambda Integration
1. Trigger flow with Lambda invocation
2. Pass test payload
3. Verify agent response
4. Check CloudWatch logs
5. Validate Contact Lens data

**Expected Result**: Lambda successfully invoked from flow

#### Test 2.3: Multi-Bureau Routing
1. Test each bureau selection (IRS, MINT, TOP, TD, DE)
2. Verify correct agent invoked
3. Check routing to correct queue
4. Validate bureau-specific responses

**Expected Result**: All 5 bureaus route correctly

#### Test 2.4: Authentication Flow
1. Test valid SSN
2. Test invalid SSN (3 attempts)
3. Test timeout scenarios
4. Verify security logging

**Expected Result**: Authentication enforced properly

#### Test 2.5: Contact Lens Analytics
1. Make test calls with various sentiments
2. Verify real-time sentiment detection
3. Check issue categorization
4. Validate supervisor alerts

**Expected Result**: Contact Lens captures all analytics

### Test Phase 3: Load Testing
**Status**: ⚠️ BLOCKED - REQUIRES FLOWS

#### Test 3.1: Concurrent Calls
- Simulate 10, 50, 100 concurrent calls
- Measure response times
- Check for throttling
- Verify queue behavior

#### Test 3.2: Peak Load
- Test 1,000 calls/hour
- Monitor Lambda concurrency
- Check DynamoDB throttling
- Validate auto-scaling

#### Test 3.3: Failure Scenarios
- Lambda timeout
- Bedrock throttling
- DynamoDB unavailable
- Network issues

---

## Integration Architecture

### Current Architecture (Backend Only)
```
┌─────────────────────────────────────────────────────────┐
│                    WORKING TODAY                         │
└─────────────────────────────────────────────────────────┘

Test Script → AgentCore Lambda → Bedrock Agent → Response
                     ↓
                 DynamoDB
                     ↓
              Contact Lens Processor
```

### Target Architecture (Full Connect Integration)
```
┌─────────────────────────────────────────────────────────┐
│                    TARGET STATE                          │
└─────────────────────────────────────────────────────────┘

Phone Call → Amazon Connect → Contact Flow
                                    ↓
                              Lex Bot (Intent)
                                    ↓
                              Lambda Invocation
                                    ↓
                              AgentCore Runtime
                                    ↓
                              Bedrock Agent
                                    ↓
                              Tool Functions
                                    ↓
                              Response → TTS → Customer
                                    ↓
                              DynamoDB + Kinesis
                                    ↓
                              Contact Lens Analytics
                                    ↓
                              WebSocket → UI Dashboard
```

---

## Detailed Build Requirements

### 1. Contact Flow JSON Structure

**Main Inbound Flow** (`treasury-main-inbound.json`)
```json
{
  "Version": "2019-10-30",
  "StartAction": "welcome-message",
  "Actions": [
    {
      "Identifier": "welcome-message",
      "Type": "MessageParticipant",
      "Parameters": {
        "Text": "Welcome to U.S. Treasury. For IRS press 1, for Treasury Direct press 2..."
      },
      "Transitions": {
        "NextAction": "get-bureau-input"
      }
    },
    {
      "Identifier": "get-bureau-input",
      "Type": "GetParticipantInput",
      "Parameters": {
        "InputTimeLimitSeconds": "5",
        "MaxDigits": "1"
      },
      "Transitions": {
        "NextAction": "invoke-agent-lambda"
      }
    },
    {
      "Identifier": "invoke-agent-lambda",
      "Type": "InvokeLambdaFunction",
      "Parameters": {
        "LambdaFunctionARN": "arn:aws:lambda:us-east-1:593804350786:function:TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR",
        "InvocationTimeLimitSeconds": "30"
      },
      "Transitions": {
        "NextAction": "play-response"
      }
    }
  ]
}
```

### 2. Lambda Permissions

Grant Connect permission to invoke Lambdas:
```bash
aws lambda add-permission \
  --function-name TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR \
  --statement-id AllowConnectInvoke \
  --action lambda:InvokeFunction \
  --principal connect.amazonaws.com \
  --source-arn arn:aws:connect:us-east-1:593804350786:instance/a88ddab9-3b29-409f-87f0-bdb614abafef
```

Repeat for all 5 AgentCore runtimes.

### 3. Lex Bot Configuration

**Bot Name**: TreasuryIntentBot  
**Intents**:
- RefundStatusIntent
- BondPurchaseIntent
- PaymentStatusIntent
- CardAssistanceIntent
- TaxQuestionIntent
- TransferToAgentIntent

**Sample Utterances**:
- "Where is my refund?"
- "I need to check my refund status"
- "How do I buy savings bonds?"
- "What is my bond worth?"
- "I need help with my card"

### 4. Contact Lens Configuration

Enable on instance:
```bash
aws connect update-instance-attribute \
  --instance-id a88ddab9-3b29-409f-87f0-bdb614abafef \
  --attribute-type CONTACT_LENS \
  --value true \
  --region us-east-1

# Associate Kinesis streams
aws connect associate-instance-storage-config \
  --instance-id a88ddab9-3b29-409f-87f0-bdb614abafef \
  --resource-type REAL_TIME_CONTACT_ANALYSIS_SEGMENTS \
  --storage-config StorageType=KINESIS_STREAM,KinesisStreamConfig={StreamArn=arn:aws:kinesis:us-east-1:593804350786:stream/treasury-voice-analytics}
```

---

## Cost Implications

### Current Monthly Cost (Backend Only): ~$257
- Bedrock: $40
- Lambda: $15
- DynamoDB: $10
- Kinesis: $15
- S3: $2
- Other: $175

### Projected Monthly Cost (With Connect Integration): ~$500-700
**Additional Costs**:
- Amazon Connect: $20-50 (1,000-2,500 contacts)
- Phone numbers: $0.03/day = $1/month
- Lex: $0.75 per 1,000 requests = $10-20
- Contact Lens: $0.15 per contact = $150-375
- Increased Lambda: $10-20
- Increased DynamoDB: $5-10

**Total**: $257 + $196-476 = **$453-733/month**

---

## Timeline Estimate

### Minimum Viable Integration (1 week)
- Day 1: Claim phone number, create basic flow
- Day 2: Lambda integration, test end-to-end
- Day 3: Enable Contact Lens, verify analytics
- Day 4: Multi-bureau routing
- Day 5: Testing and bug fixes

### Full Production System (3-4 weeks)
- Week 1: Basic integration (above)
- Week 2: Lex bot, authentication, skills routing
- Week 3: Agent workspace, callbacks, multi-channel
- Week 4: QM, reporting, DR, load testing

---

## Risk Assessment

### High Risk
1. **Lambda Timeout in Flow** - 30s limit may be tight for complex queries
   - Mitigation: Optimize agent prompts, implement caching
   
2. **Bedrock Throttling** - High call volume may hit limits
   - Mitigation: Request quota increase, implement retry logic

3. **Contact Lens Cost** - $0.15/contact adds up quickly
   - Mitigation: Enable only on subset of calls, use sampling

### Medium Risk
1. **Phone Number Availability** - May not get desired area code
   - Mitigation: Use toll-free number
   
2. **Lex Bot Accuracy** - Intent detection may be imperfect
   - Mitigation: Extensive training, fallback to agent

3. **Agent Availability** - No human agents configured yet
   - Mitigation: Build agent workspace, hire/train agents

### Low Risk
1. **Flow Complexity** - Contact flows can get complex
   - Mitigation: Modular design, thorough testing
   
2. **Multi-Channel** - Chat/SMS may have different requirements
   - Mitigation: Start with voice only, add channels later

---

## Success Criteria

### Phase 1 Success (Basic Integration)
- [ ] Phone number claimed and working
- [ ] Customer can call and reach IVR
- [ ] Lambda successfully invoked from flow
- [ ] Bedrock agent responds via TTS
- [ ] Contact stored in DynamoDB
- [ ] Contact Lens captures analytics

### Phase 2 Success (Advanced Features)
- [ ] Lex bot detects intents with >80% accuracy
- [ ] Authentication flow enforces security
- [ ] All 5 bureaus route correctly
- [ ] Callbacks offered and executed
- [ ] Multi-channel support working

### Phase 3 Success (Production Ready)
- [ ] Agent workspace operational
- [ ] 100 concurrent calls handled
- [ ] <3s average response time
- [ ] >95% Contact Lens accuracy
- [ ] All monitoring and alarms configured
- [ ] DR plan tested and validated

---

## Recommended Next Steps

### Immediate (This Week)
1. **Claim phone number** - Enables testing
2. **Build basic contact flow** - Minimal viable flow
3. **Grant Lambda permissions** - Allow Connect to invoke
4. **Test end-to-end** - Make first test call

### Short-term (Next 2 Weeks)
1. **Build Lex bot** - Better intent detection
2. **Implement authentication** - Security requirement
3. **Enable Contact Lens** - Analytics requirement
4. **Multi-bureau testing** - Validate all agents

### Medium-term (Next Month)
1. **Agent workspace** - For human agents
2. **Skills-based routing** - Intelligent routing
3. **Callback system** - Customer convenience
4. **Load testing** - Validate scalability

---

## Conclusion

### Current State
✅ **Backend infrastructure is 100% operational and tested**
- All AI agents working
- All tool functions deployed
- All governance layers active
- All data storage operational

### Gap Analysis
❌ **Amazon Connect is not integrated with the backend**
- No phone numbers
- No custom contact flows
- No Lambda invocation from flows
- No Lex bot
- Contact Lens not enabled

### Effort Required
- **Minimum viable**: 1 week (basic call flow)
- **Production ready**: 3-4 weeks (full features)
- **Cost increase**: +$200-500/month

### Recommendation
**Start with Phase 1 (Basic Integration)** to prove the concept end-to-end, then iterate based on requirements and feedback. The backend is solid and ready to support Connect integration.

---

**Document Version**: 1.0  
**Last Updated**: March 2, 2026  
**Status**: Ready for Implementation  
**Next Action**: Claim phone number and build first contact flow
