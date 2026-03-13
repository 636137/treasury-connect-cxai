# 🚀 QUICK START GUIDE

## Treasury Connect - AI Contact Center Demo

### Prerequisites
- AWS Account with Bedrock access
- Node.js 18+ and npm
- AWS CLI configured
- CDK CLI installed: `npm install -g aws-cdk`

### 1️⃣ Deploy Infrastructure (5 minutes)

```bash
cd /home/ec2-user/CXAIDemo1
./deploy.sh
```

This deploys:
- ✅ 5 Bedrock Agents (IRS, TD, TOP, Mint, DE)
- ✅ 5 Bedrock Guardrails with PII protection
- ✅ Amazon Connect instance with queues
- ✅ Lambda functions for routing & prediction
- ✅ DynamoDB tables for data storage

### 2️⃣ Launch Frontend (1 minute)

```bash
cd /home/ec2-user/CXAIDemo1
npm install
npm start
```

Opens **http://localhost:3000**

### 3️⃣ Run Demo

1. Click **"Generate Contact"**
2. Select a bureau (IRS, TreasuryDirect, etc.)
3. Watch the flow progress through 9 phases:
   - INIT → AUTH → INTENT → TOOL → RAG → GOVERN → PREDICT → ROUTE → RESOLVE

4. Explore tabs:
   - **Sequence** - Real-time flow diagram
   - **AI Agent** - Agent orchestration
   - **RAG + Rerank** - Knowledge retrieval
   - **Governance** - 3-layer safety checks
   - **Analytics** - Metrics and predictions

### 🎯 Key Features

**AI Self-Service Prediction**
- 10-factor scoring model
- Predicts: SELF_SERVICE, AT_RISK, or ESCALATE
- Real-time DynamoDB persistence

**Skills-Based Routing**
- Intent → Skill mapping
- Proficiency levels (P1-P4)
- Queue metrics integration
- Automatic callback offering

**Error Remediation**
- 8 error types simulated
- Automatic recovery strategies
- Circuit breakers and retries
- Graceful degradation

**Three-Layer Governance**
1. AgentCore Policy - Tool authorization
2. Automated Reasoning - Fact verification
3. Bedrock Guardrails - PII & content safety

### 💰 Cost Estimate

**~$50-100/month** for demo usage
- No OpenSearch (saved $700+/month)
- On-demand Lambda & DynamoDB
- Pay-per-use Bedrock invocations

### 🛠️ Troubleshooting

**Deploy fails?**
```bash
aws sts get-caller-identity  # Check credentials
npx cdk bootstrap --force     # Re-bootstrap
```

**Frontend won't start?**
```bash
rm -rf node_modules
npm install
npm start
```

**Bedrock access denied?**
- Go to AWS Console → Bedrock → Model access
- Request access to Claude 3.5 Sonnet

### 📚 Documentation

- `README.md` - Full documentation
- `BUILD_STATUS.md` - Component details
- `treasury-connect-kiro-spec.pdf` - Original spec

### 🎬 Demo Script

**"This is Treasury Connect - an AI-powered contact center for the U.S. Treasury serving 5 bureaus."**

1. **Generate a contact** - "Let's simulate a citizen calling the IRS about a refund."

2. **Watch authentication** - "The system verifies identity using KBA before accessing account data."

3. **See intent detection** - "AI detects the citizen wants 'RefundStatus' with 85% confidence."

4. **Tool execution** - "The agent calls the IRS Master File API to check refund status."

5. **Governance layers** - "Every response passes through 3 safety checks - policy, reasoning, and guardrails."

6. **Prediction** - "The engine predicts 72% self-service probability - no agent needed."

7. **Error handling** - "If a Lambda times out, the system auto-retries with exponential backoff."

8. **Routing decision** - "If escalation is needed, skills-based routing finds the right agent."

### ✅ Success Criteria

You should see:
- ✅ All 5 stacks deployed successfully
- ✅ Frontend loads at localhost:3000
- ✅ Contacts flow through all 9 phases
- ✅ Guardrails block PII in responses
- ✅ Prediction scores calculate correctly
- ✅ Routing decisions match intent complexity

### 🚀 Next Steps

1. **Add Knowledge Bases** - S3-based document retrieval
2. **Integrate Automated Reasoning** - Mathematical fact verification
3. **Enable Contact Lens** - Real-time sentiment analysis
4. **Implement Cedar Policies** - Fine-grained authorization
5. **Connect Real APIs** - IRS, TreasuryDirect, TOP

---

**Ready to deploy?** Run `./deploy.sh` and you're live in 5 minutes! 🎉
