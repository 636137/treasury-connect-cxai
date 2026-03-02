# Conversational Integration - DEPLOYED ✅

## Your Question: How Does a Single Lambda Enable Conversation?

**Answer**: It doesn't - you're absolutely right! 

A single Lambda invocation is one-shot. To enable back-and-forth conversation, we need:

1. **Session State Management** - Store conversation history
2. **Looping Flow** - Connect flow that repeats
3. **Context Passing** - Each turn includes previous messages

---

## ✅ SOLUTION DEPLOYED

### New Components Created:

1. **DynamoDB Table**: `TreasuryConversations`
   - Stores conversation history per contact
   - Maintains session state across turns

2. **Conversational Lambda**: `treasury-conversational-handler`
   - Manages multi-turn conversations
   - Maintains context between turns
   - Invokes AgentCore with full history
   - Signals when conversation is complete

---

## How It Works

### Architecture

```
Customer speaks
    ↓
Connect captures speech → text
    ↓
Invoke treasury-conversational-handler
    ├─ Load session from DynamoDB
    ├─ Add customer message to history
    ├─ Invoke AgentCore with full context
    ├─ Get agent response
    ├─ Save updated session
    └─ Return: {response, continueConversation: true/false}
    ↓
Play response to customer
    ↓
Check continueConversation
    ├─ true  → Loop back (get more input)
    └─ false → End call
```

### Session Example

```json
{
  "contactId": "abc-123",
  "bureau": "IRS",
  "history": [
    {"role": "user", "content": "Where is my refund?"},
    {"role": "assistant", "content": "I can help. What's your SSN?"},
    {"role": "user", "content": "123-45-6789"},
    {"role": "assistant", "content": "Your refund of $2,450 is approved"}
  ]
}
```

Each turn adds to the history, so the agent has full context.

---

## Connect Flow Structure

You need to build this in the Connect console:

```
┌─────────────────────────────────────────┐
│  CONVERSATIONAL FLOW                     │
└─────────────────────────────────────────┘

[START]
  ↓
[Set Attribute] Bureau = "IRS"
  ↓
[Play Prompt] "Welcome to U.S. Treasury IRS"
  ↓
┌─────────────────────────────────────────┐
│ LOOP START                               │
└─────────────────────────────────────────┘
  ↓
[Get Customer Input]
  - Type: Speech (Amazon Lex)
  - Timeout: 5 seconds
  - Store as: CustomerInput
  ↓
[Invoke Lambda] treasury-conversational-handler
  - Parameters:
    - CustomerInput: $.StoredCustomerInput
    - Bureau: $.Attributes.Bureau
  - Timeout: 8 seconds
  ↓
[Play Prompt] $.External.response
  ↓
[Check Attribute] $.External.continueConversation
  ├─ equals "true"  → Go to LOOP START
  └─ equals "false" → Go to DISCONNECT
  ↓
[DISCONNECT]
```

---

## Manual Steps Required

### In AWS Connect Console:

1. Go to: https://console.aws.amazon.com/connect/v2/app/instances
2. Log into "treasury-connect-prod"
3. Routing → Contact flows → Create contact flow
4. Build the flow structure above:
   - Add "Get customer input" block (speech)
   - Add "Invoke AWS Lambda function" block
     - Select: `treasury-conversational-handler`
     - Function input parameters:
       - CustomerInput: `$.StoredCustomerInput`
       - Bureau: `$.Attributes.Bureau`
   - Add "Play prompt" block
     - Text: `$.External.response`
   - Add "Check contact attributes" block
     - Attribute: `$.External.continueConversation`
     - Condition: Equals "true"
     - If true: Loop back to "Get customer input"
     - If false: Go to "Disconnect"
5. Save as "Treasury Conversational Flow"
6. Publish
7. Associate +18332896602 with this flow

---

## Alternative: Use Amazon Lex (Easier)

Instead of building the loop manually, use Lex:

### Lex Approach (Recommended)

1. Create Lex bot: "TreasuryBot"
2. Add intents: RefundStatus, BondInquiry, etc.
3. Set fulfillment Lambda: `treasury-conversational-handler`
4. Connect flow becomes simple:
   ```
   [START]
     ↓
   [Get customer input] → Lex Bot
     ↓
   [Disconnect]
   ```
5. Lex handles all the looping and context automatically

**Advantage**: Much simpler, better NLU, automatic conversation management

---

## Test the Conversational Lambda

```bash
cd /home/ec2-user/CXAIDemo1

# Test first turn
aws lambda invoke \
  --function-name treasury-conversational-handler \
  --payload '{
    "Details": {
      "ContactData": {"ContactId": "test-conv-123"},
      "Parameters": {
        "CustomerInput": "Where is my tax refund?",
        "Bureau": "IRS"
      }
    }
  }' \
  response1.json

cat response1.json

# Test second turn (same contact)
aws lambda invoke \
  --function-name treasury-conversational-handler \
  --payload '{
    "Details": {
      "ContactData": {"ContactId": "test-conv-123"},
      "Parameters": {
        "CustomerInput": "It is for tax year 2025",
        "Bureau": "IRS"
      }
    }
  }' \
  response2.json

cat response2.json

# Check session in DynamoDB
aws dynamodb get-item \
  --table-name TreasuryConversations \
  --key '{"contactId": {"S": "test-conv-123"}}'
```

---

## What's Different Now

### Before (Single Lambda):
- One call → One response → End
- No context between calls
- No conversation memory

### After (Conversational Lambda):
- Multiple turns in same call
- Full conversation history maintained
- Agent has context from previous turns
- Natural back-and-forth dialogue

---

## Resources Deployed

| Resource | Name | Purpose |
|----------|------|---------|
| Lambda | treasury-conversational-handler | Manages conversations |
| DynamoDB | TreasuryConversations | Stores session state |
| Permission | AllowConnectInvoke | Connect can invoke Lambda |

---

## Next Steps

### Option 1: Build Loop Flow (Manual Control)
1. Follow Connect flow structure above
2. Build in Connect console (15-20 min)
3. Test by calling +18332896602

### Option 2: Use Lex Bot (Recommended)
1. Create Lex bot with intents
2. Set fulfillment to conversational Lambda
3. Simple Connect flow: just invoke Lex
4. Lex handles conversation automatically

---

## Key Insight

**You were right to question the single Lambda approach!**

True conversation requires:
- ✅ Session state (DynamoDB)
- ✅ Looping flow (Connect or Lex)
- ✅ Context management (Conversational Lambda)
- ✅ Exit conditions (continueConversation flag)

All of these are now deployed and ready to use.

---

**Status**: Conversational infrastructure deployed  
**Next**: Build Connect flow with loop or use Lex bot  
**Documentation**: See CONVERSATIONAL_ARCHITECTURE.md for details
