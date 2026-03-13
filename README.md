# Treasury Connect - Flow Operations Center

**AI-Powered Contact Center for U.S. Treasury**

A demonstration of Amazon Connect integrated with Amazon Bedrock Agents, Guardrails, and Automated Reasoning for secure, compliant citizen service across 5 Treasury bureaus.

## Architecture

- **Amazon Connect** - Contact center with voice/chat channels
- **Bedrock Agents** - 5 bureau-specific AI agents (IRS, TreasuryDirect, TOP, US Mint, Direct Express)
- **Bedrock Guardrails** - PII protection, content filtering, contextual grounding
- **Lambda Functions** - Routing intelligence, prediction engine, authentication
- **DynamoDB** - Contact predictions and metrics
- **React Frontend** - Real-time flow visualization and operations dashboard

## Project Structure

```
CXAIDemo1/
├── src/
│   ├── FlowOpsCenter.jsx      # Main React UI
│   └── index.js                # React entry point
├── public/
│   └── index.html              # HTML template
├── treasury-connect/
│   ├── infrastructure/         # CDK stacks
│   │   ├── lib/stacks/
│   │   │   ├── network-stack.ts
│   │   │   ├── data-stack.ts
│   │   │   ├── auth-stack.ts
│   │   │   ├── connect-stack.ts
│   │   │   └── bedrock-stack.ts
│   │   └── bin/infrastructure.ts
│   └── lambdas/
│       ├── auth/               # Identity verification
│       ├── prediction/         # AI self-service prediction
│       └── routing/            # Skills-based routing
└── package.json
```

## Quick Start

### 1. Install Dependencies

```bash
cd CXAIDemo1
npm install
cd treasury-connect/infrastructure
npm install
```

### 2. Configure AWS

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

Update `treasury-connect/infrastructure/lib/config.ts` with your account ID and region.

### 3. Deploy Infrastructure

```bash
cd treasury-connect/infrastructure
npm run build
npx cdk bootstrap
npx cdk deploy --all
```

This deploys:
- 5 CDK stacks (Network, Data, Auth, Connect, Bedrock)
- 5 Bedrock Agents with Guardrails
- Amazon Connect instance with queues
- Lambda functions for routing and prediction
- DynamoDB tables

### 4. Run Frontend

```bash
cd ../..
npm start
```

Opens http://localhost:3000 with the Flow Operations Center dashboard.

## Features

### AI Self-Service Prediction
Deterministic engine that predicts contact resolution likelihood based on 10 weighted factors:
- Intent complexity
- Sentiment risk
- Authentication friction
- Tool health
- Queue pressure
- Agent availability

### Three-Layer Governance
1. **AgentCore Policy** - Cedar-based authorization for tool calls
2. **Automated Reasoning** - Mathematical verification of facts
3. **Bedrock Guardrails** - PII redaction, content safety, grounding

### Skills-Based Routing
Maps intents to agent skills with proficiency requirements (P1-P4). Offers callback when queue depth > 8 or wait time > 2 minutes.

### Error Detection & Remediation
Simulates 8 error types with automated remediation:
- Lambda timeouts → exponential backoff
- API 503 → circuit breaker + failover
- Auth mismatch → DTMF fallback
- KB empty → query broadening
- Guardrail PII → response regeneration
- AR invalid → correction + re-validation
- Policy deny → tool blocking
- Sentiment critical → empathy injection

## Demo Flow

The UI simulates a complete contact flow through 9 phases:
1. **INIT** - Flow initialization
2. **AUTH** - Identity verification
3. **INTENT** - Intent detection
4. **TOOL** - Backend tool execution
5. **RAG** - Knowledge base retrieval + rerank
6. **GOVERN** - Three-layer governance check
7. **PREDICT** - Self-service prediction
8. **ROUTE** - Skills-based routing decision
9. **RESOLVE** - Final resolution

## Cost Optimization

This demo uses:
- **No OpenSearch** - Removed to reduce costs
- **No Knowledge Bases** - Agents only (can add later)
- **On-demand Lambda** - Pay per invocation
- **DynamoDB on-demand** - Pay per request

Estimated cost: **~$50-100/month** for light demo usage.

## Next Steps

1. Add Knowledge Bases with S3 + Bedrock KB (cheaper than OpenSearch)
2. Integrate Automated Reasoning for fact verification
3. Connect to real IRS/Treasury APIs (requires authorization)
4. Add Contact Lens for real-time sentiment analysis
5. Implement Cedar policies for AgentCore

## License

MIT

<!-- BEGIN COPILOT CUSTOM AGENTS -->
## GitHub Copilot Custom Agents (Maximus Internal)

This repository includes **GitHub Copilot custom agent profiles** under `.github/agents/` to speed up planning, documentation, and safe reviews.

### Included agents
- `implementation-planner` — Creates detailed implementation plans and technical specifications for this repository.
- `readme-creator` — Improves README and adjacent documentation without modifying production code.
- `security-auditor` — Performs a read-only security review (secrets risk, risky patterns) and recommends fixes.
- `amazon-connect-solution-engineer` — Designs and integrates Amazon Connect solutions for this repository (IAM-safe, CX/ops focused).

### How to invoke

- **GitHub.com (Copilot coding agent):** select the agent from the agent dropdown (or assign it to an issue) after the `.agent.md` files are on the default branch.
- **GitHub Copilot CLI:** from the repo folder, run `/agent` and select one of the agents, or run:
  - `copilot --agent <agent-file-base-name> --prompt "<your prompt>"`
- **IDEs:** open Copilot Chat and choose the agent from the agents dropdown (supported IDEs), backed by the `.github/agents/*.agent.md` files.

References:
- Custom agents configuration: https://docs.github.com/en/copilot/reference/custom-agents-configuration
- Creating custom agents: https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents
<!-- END COPILOT CUSTOM AGENTS -->
