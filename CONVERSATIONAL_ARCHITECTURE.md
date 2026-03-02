# Conversational Architecture for Amazon Connect

## The Problem You Identified

You're correct - a single Lambda invocation in a Connect flow won't create a back-and-forth conversation. It's a one-shot call that returns a response and ends.

## Solution: Three Approaches

### **Option 1: Loop Flow (Recommended for Voice)**

Create a Connect flow that loops, collecting customer input and invoking Lambda repeatedly:

```
┌─────────────────────────────────────────────────┐
│  CONVERSATIONAL FLOW (Looping)                  │
└─────────────────────────────────────────────────┘

1. Play prompt: "Welcome to Treasury"
2. Get customer input (speech/DTMF)
3. Invoke conversational Lambda
   ↓
4. Play Lambda response
5. Check: continueConversation?
   ├─ YES → Loop back to step 2
   └─ NO  → Disconnect
```

**Key Components**:
- **Conversational Lambda**: Maintains session state in DynamoDB
- **Loop Block**: Connect flow loops back to collect more input
- **Session Management**: Each turn adds to conversation history
- **Exit Condition**: Lambda signals when conversation is complete

### **Option 2: Amazon Lex Integration (Best for NLU)**

Use Lex bot for natural conversation management:

```
┌─────────────────────────────────────────────────┐
│  LEX BOT FLOW                                    │
└─────────────────────────────────────────────────┘

1. Connect → Lex Bot
2. Lex handles multi-turn conversation
3. Lex fulfillment Lambda → AgentCore
4. Lex manages slots, intents, context
5. Lex signals completion
```

**Advantages**:
- Built-in conversation management
- Natural language understanding
- Slot filling and validation
- Context tracking
- Easier to build

### **Option 3: Streaming (Advanced)**

Use Connect real-time streaming for continuous conversation:

```
┌─────────────────────────────────────────────────┐
│  STREAMING FLOW                                  │
└─────────────────────────────────────────────────┘

1. Connect streams audio to Kinesis
2. Lambda processes stream in real-time
3. Invokes AgentCore for each utterance
4. Streams response back via Connect API
5. Continues until customer hangs up
```

**Use Case**: Complex, long-running conversations

---

## Recommended Implementation: Loop Flow + Conversational Lambda

### Architecture

```
Customer Call
    ↓
Amazon Connect Flow (Looping)
    ↓
Get Customer Input (speech-to-text)
    ↓
Invoke Conversational Lambda
    ├─ Get session from DynamoDB
    ├─ Add customer message to history
    ├─ Invoke AgentCore Lambda with context
    ├─ Get agent response
    ├─ Save session to DynamoDB
    └─ Return: {response, continueConversation}
    ↓
Play Response (text-to-speech)
    ↓
Check continueConversation
    ├─ true  → Loop back to Get Input
    └─ false → Disconnect
```

### Session State (DynamoDB)

```json
{
  "contactId": "abc-123",
  "bureau": "IRS",
  "history": [
    {"role": "user", "content": "Where is my refund?", "timestamp": "..."},
    {"role": "assistant", "content": "Let me check...", "timestamp": "..."},
    {"role": "user", "content": "It's for 2025", "timestamp": "..."},
    {"role": "assistant", "content": "Your refund...", "timestamp": "..."}
  ],
  "startTime": "2026-03-02T17:00:00Z"
}
```

### Conversational Lambda Logic

```python
def handler(event, context):
    # 1. Extract customer input
    customer_input = event['Parameters']['CustomerInput']
    contact_id = event['ContactData']['ContactId']
    
    # 2. Get conversation history
    session = get_session(contact_id)
    
    # 3. Add to history
    session['history'].append({'role': 'user', 'content': customer_input})
    
    # 4. Invoke AgentCore with full context
    response = invoke_agent(session['bureau'], customer_input, session['history'])
    
    # 5. Add response to history
    session['history'].append({'role': 'assistant', 'content': response})
    
    # 6. Save session
    save_session(session)
    
    # 7. Decide if conversation continues
    continue_conversation = not is_complete(response, session)
    
    return {
        'response': response,
        'continueConversation': continue_conversation
    }
```

---

## Connect Flow Structure (Pseudo-code)

```
START
  ↓
[Play Prompt] "Welcome to U.S. Treasury"
  ↓
[Get Customer Input] 
  - Type: Speech
  - Timeout: 5 seconds
  - Store as: CustomerInput
  ↓
[Invoke Lambda] conversational-lambda
  - Pass: CustomerInput, ContactId, Bureau
  - Store response as: AgentResponse
  ↓
[Play Prompt] $.External.AgentResponse.response
  ↓
[Check Attribute] $.External.AgentResponse.continueConversation
  ├─ equals "true"  → [Loop back to Get Customer Input]
  └─ equals "false" → [Disconnect]
```

---

## What Needs to Be Built

### 1. Create DynamoDB Table for Sessions
```bash
aws dynamodb create-table \
  --table-name TreasuryConversations \
  --attribute-definitions AttributeName=contactId,AttributeType=S \
  --key-schema AttributeName=contactId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 2. Deploy Conversational Lambda
```bash
cd /home/ec2-user/CXAIDemo1
zip conversational-lambda.zip conversational-lambda.py
aws lambda create-function \
  --function-name treasury-conversational-handler \
  --runtime python3.11 \
  --role <LAMBDA_ROLE_ARN> \
  --handler conversational-lambda.handler \
  --zip-file fileb://conversational-lambda.zip \
  --timeout 30 \
  --environment Variables={SESSION_TABLE=TreasuryConversations} \
  --region us-east-1
```

### 3. Grant Connect Permission
```bash
aws lambda add-permission \
  --function-name treasury-conversational-handler \
  --statement-id AllowConnectInvoke \
  --action lambda:InvokeFunction \
  --principal connect.amazonaws.com \
  --source-arn arn:aws:connect:us-east-1:593804350786:instance/a88ddab9-3b29-409f-87f0-bdb614abafef \
  --region us-east-1
```

### 4. Build Connect Flow (Console)

**In Connect Flow Designer**:

1. **Entry Point** → Set contact attributes
   - Bureau = "IRS" (or from routing)

2. **Loop Start** → Get customer input
   - Type: Speech (Amazon Lex)
   - Timeout: 5 seconds
   - Store as: CustomerInput

3. **Invoke Lambda** → treasury-conversational-handler
   - Function parameters:
     - CustomerInput: $.StoredCustomerInput
     - Bureau: $.Attributes.Bureau
   - Timeout: 8 seconds

4. **Play prompt** → $.External.response

5. **Check contact attribute** → $.External.continueConversation
   - If equals "true" → Go to Loop Start
   - If equals "false" → Go to Disconnect

6. **Disconnect**

---

## Alternative: Use Lex Bot (Easier)

Instead of building the loop manually, use Amazon Lex:

### Lex Bot Structure

**Bot Name**: TreasuryConversationalBot

**Intents**:
- RefundStatusIntent
- BondInquiryIntent
- PaymentStatusIntent
- GeneralQuestionIntent

**Fulfillment**: Lambda (conversational-lambda)

**Connect Integration**:
```
1. Get customer input → Lex Bot
2. Lex manages conversation
3. Lex calls Lambda for fulfillment
4. Lex returns response
5. Lex handles multi-turn automatically
```

**Advantages**:
- No manual loop needed
- Better NLU
- Automatic context management
- Easier to maintain

---

## Comparison

| Approach | Complexity | Flexibility | NLU Quality | Setup Time |
|----------|-----------|-------------|-------------|------------|
| Loop Flow | Medium | High | Basic | 1-2 hours |
| Lex Bot | Low | Medium | Excellent | 2-4 hours |
| Streaming | High | Very High | Custom | 1-2 days |

---

## Recommendation

**For your use case**: Use **Lex Bot** approach

**Why**:
1. Built-in conversation management
2. Better speech recognition
3. Natural multi-turn handling
4. Easier to test and debug
5. Scales automatically

**Quick Start**:
1. Create Lex bot with 5 intents (one per bureau)
2. Set fulfillment Lambda to conversational-lambda
3. Connect flow: Just "Get customer input → Lex Bot"
4. Lex handles everything else

---

## Next Steps

Choose your approach:

**Option A: Loop Flow** (Manual control)
```bash
./deploy-conversational-lambda.sh
# Then build loop flow in Connect console
```

**Option B: Lex Bot** (Recommended)
```bash
./create-lex-bot.sh
# Then integrate Lex in Connect flow
```

Both options maintain conversation state and enable true back-and-forth dialogue.
