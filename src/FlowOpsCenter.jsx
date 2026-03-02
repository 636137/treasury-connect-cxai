import { useState, useEffect, useRef, useCallback } from "react";

/* ════════════════════════════════════════════════════════════════════
   TREASURY CONNECT FLOW OPERATIONS CENTER
   Synthetic simulation of Amazon Connect CloudWatch flow logs with:
   - Deterministic AI self-service prediction engine
   - RAG + Rerank knowledge base pipeline
   - Three-layer governance (AgentCore Policy, Automated Reasoning, Guardrails)
   - AI Agent orchestration per contact
   - Error detection + automated remediation
   ════════════════════════════════════════════════════════════════════ */

// ─── DOMAIN DATA ──────────────────────────────────────────────────────
const BUREAUS = [
  { id: "IRS", name: "Internal Revenue Service", color: "#3b82f6" },
  { id: "TreasuryDirect", name: "Bureau of Fiscal Service", color: "#8b5cf6" },
  { id: "TOP", name: "Treasury Offset Program", color: "#f59e0b" },
  { id: "USMint", name: "U.S. Mint", color: "#10b981" },
  { id: "DirectExpress", name: "Direct Express", color: "#06b6d4" },
];
const INTENTS = {
  IRS: [
    { id: "RefundStatus", complexity: 0.15, utterance: "I filed my taxes in February and still haven't received my refund" },
    { id: "NoticeExplanation", complexity: 0.55, utterance: "I got a CP2000 notice and I don't understand what it means" },
    { id: "PaymentPlan", complexity: 0.65, utterance: "I owe the IRS money and need to set up a monthly payment plan" },
    { id: "TranscriptRequest", complexity: 0.2, utterance: "I need a copy of my tax transcript from last year" },
    { id: "AmendedReturn", complexity: 0.7, utterance: "I need to correct an error on my 2024 return, how do I amend it" },
    { id: "PenaltyAbatement", complexity: 0.75, utterance: "I want to request first-time penalty abatement for reasonable cause" },
    { id: "W2Missing", complexity: 0.4, utterance: "My employer never sent me my W-2 and it's already April" },
    { id: "EINApplication", complexity: 0.3, utterance: "I need to get an EIN for a new LLC I'm starting" },
  ],
  TreasuryDirect: [
    { id: "AccountUnlock", complexity: 0.45, utterance: "My TreasuryDirect account is locked and I can't log in" },
    { id: "BondValue", complexity: 0.15, utterance: "What's my Series I bond from 2019 worth right now" },
    { id: "BondRedemption", complexity: 0.5, utterance: "I want to cash in my savings bonds, what's the process" },
    { id: "Form1099", complexity: 0.2, utterance: "I need my 1099-INT for my savings bond interest" },
    { id: "TrustAccount", complexity: 0.7, utterance: "I need to set up a trust account for my grandchildren's bonds" },
  ],
  TOP: [
    { id: "OffsetInquiry", complexity: 0.35, utterance: "My tax refund was reduced and I want to know why" },
    { id: "DisputeInitiation", complexity: 0.8, utterance: "I want to dispute this offset because it's not my debt" },
    { id: "HardshipExemption", complexity: 0.85, utterance: "I can't afford this offset, I need a hardship exemption" },
    { id: "CreditorInfo", complexity: 0.25, utterance: "Which agency took money from my refund" },
  ],
  USMint: [
    { id: "OrderStatus", complexity: 0.1, utterance: "I placed an order two weeks ago for commemorative coins" },
    { id: "ProductAvailability", complexity: 0.15, utterance: "Do you have the 2025 Silver Eagle coins in stock" },
    { id: "ShippingIssue", complexity: 0.5, utterance: "My order says delivered but I never received the package" },
    { id: "CoinInfo", complexity: 0.1, utterance: "Tell me about the new American Women quarter designs" },
  ],
  DirectExpress: [
    { id: "BalanceCheck", complexity: 0.05, utterance: "I need to check my Direct Express card balance" },
    { id: "LostCard", complexity: 0.4, utterance: "My Direct Express card was stolen yesterday" },
    { id: "PINReset", complexity: 0.15, utterance: "I forgot my PIN and need to reset it" },
    { id: "TransactionHistory", complexity: 0.1, utterance: "Show me my recent Direct Express transactions" },
  ],
};

const KB_DOCS = {
  "IRS-PUB-17-SEC4.2": { title: "Publication 17 – Standard Deduction (2025)", text: "For tax year 2025, the standard deduction amounts are: Single or Married Filing Separately: $15,000; Married Filing Jointly or Qualifying Surviving Spouse: $30,000; Head of Household: $22,500. Additional amounts apply for age 65+ or blind.", tokens: 284 },
  "IRS-PUB-590-CONTRIB": { title: "Publication 590-A – IRA Contributions", text: "The IRA contribution limit for 2025 is $7,000 ($8,000 if you are age 50 or older). Modified AGI phase-out ranges apply for deductible traditional IRA contributions when covered by employer plan.", tokens: 312 },
  "IRS-CP2000-GUIDE": { title: "Understanding Your CP2000 Notice", text: "A CP2000 is NOT a bill. It is a proposed adjustment to your tax return based on information received from employers, banks, and other payers that differs from what you reported. You have 30 days to respond.", tokens: 267 },
  "IRS-FORM-9465": { title: "Installment Agreement Request", text: "Taxpayers owing $50,000 or less (combined tax, penalties, interest) may qualify for a streamlined installment agreement without providing a financial statement. User fee: $22 for online direct debit setup. Maximum term: 72 months.", tokens: 198 },
  "IRS-CP14-GUIDE": { title: "Understanding Your CP14 Notice", text: "CP14 means you owe a balance on your tax account. Pay by the date shown on the notice to avoid additional interest and penalties. If you cannot pay in full, consider an installment agreement or currently-not-collectible status.", tokens: 245 },
  "IRS-PENALTY-ABATE": { title: "First-Time Penalty Abatement", text: "Administrative waiver available if: no penalties for prior 3 tax years, all required returns filed, and all tax paid or arranged to pay. Call IRS or submit Form 843. Reasonable cause also considered: death, serious illness, fire, natural disaster.", tokens: 221 },
  "TD-SERIES-I-RULES": { title: "Series I Savings Bond Terms", text: "Annual purchase limit: $10,000 electronic ($5,000 paper via tax refund). Composite rate = fixed rate + inflation rate, adjusted every 6 months. Minimum hold: 12 months. Penalty if redeemed before 5 years: last 3 months of interest.", tokens: 276 },
  "TD-UNLOCK-FAQ": { title: "TreasuryDirect Account Unlock Process", text: "Accounts lock after 3 failed login attempts or 13 months of inactivity. Online unlock requires account number + SSN + email verification. If online fails, submit FS Form 5444 with notarized signature. Processing time: 5-10 business days.", tokens: 189 },
  "TOP-31CFR285": { title: "Treasury Offset Program Regulations", text: "Federal payments including tax refunds, Social Security (partial), and vendor payments may be offset to collect delinquent federal and state debts. Exempt: SSI payments, VA disability compensation, and certain federal salary amounts below threshold.", tokens: 302 },
  "TOP-DISPUTE": { title: "Offset Dispute Process", text: "Bureau of Fiscal Service cannot reverse offsets. Contact the creditor agency listed on your offset notice to dispute the debt. Federal debts: submit written dispute within 60 days. State debts: follow state-specific procedures listed on notice.", tokens: 234 },
  "MINT-SHIPPING": { title: "U.S. Mint Shipping Policy", text: "Standard shipping 3-5 business days via USPS Priority Mail. Express available for $25.95. Pre-order items ship on published release date. Insurance included for orders over $100. Damaged shipments must be reported within 30 days.", tokens: 167 },
  "DE-CARD-REPLACE": { title: "Direct Express Card Replacement", text: "Report lost/stolen cards immediately at 1-888-741-1115. Temporary card access via cardless benefit access at participating retailers. Replacement card mailed within 5-7 business days. Emergency card available for $13.50 fee, arrives 1-3 business days.", tokens: 203 },
};

const ERRORS = [
  { code: "LAMBDA_TIMEOUT", msg: "Lambda treasury-getRefundStatus execution exceeded 10000ms timeout", severity: "WARN", remediation: "Retry with exponential backoff (2s → 4s → 8s). After 3 failures: serve cached response (<15min) or graceful degradation message with callback offer." },
  { code: "API_503", msg: "TreasuryDirect ManageDirect API returned 503 Service Unavailable", severity: "ERROR", remediation: "Circuit breaker OPEN. Failover to read-replica cache. NOC alert dispatched (PagerDuty P2). Contact continues with cached data. Auto-retry in 30s." },
  { code: "AUTH_MISMATCH", msg: "KBA verification failed: SSN last-4 provided does not match IRS records", severity: "WARN", remediation: "Offer DTMF fallback auth. If 3 consecutive failures: warm transfer to Identity Verification Specialist queue with full context screen-pop." },
  { code: "KB_EMPTY", msg: "Bedrock Knowledge Base returned 0 chunks for query embedding (cosine < 0.3 threshold)", severity: "WARN", remediation: "Broaden query: strip modifiers, retry with parent intent. If still empty: escalate with Q in Connect agent-assist and flag KB gap for content team." },
  { code: "GUARDRAIL_PII", msg: "Bedrock Guardrails PII filter detected SSN pattern (XXX-XX-XXXX) in model output", severity: "ERROR", remediation: "Response BLOCKED before delivery. PII redacted from all logs. Response regenerated with explicit PII suppression instruction. Compliance event logged." },
  { code: "AR_INVALID", msg: "Automated Reasoning returned INVALID: response states standard deduction $14,600 — policy requires $15,000 for 2025 single filers", severity: "ERROR", remediation: "Response BLOCKED. AR suggested correction applied ($14,600 → $15,000). Response regenerated and re-validated: VALID. Mathematical proof logged to audit trail." },
  { code: "POLICY_DENY", msg: "AgentCore Policy DENIED: tool call getBondValue blocked — session.bureau=IRS, tool requires bureau=TreasuryDirect", severity: "ERROR", remediation: "Tool call blocked at Gateway (pre-execution). Agent notified of bureau boundary violation. Redirect to approved IRS tool set. Policy evaluation logged." },
  { code: "SENTIMENT_CRITICAL", msg: "Contact Lens real-time: sentiment dropped to VERY_NEGATIVE for 3+ consecutive turns", severity: "WARN", remediation: "Empathy injection prompt added to system context. If sentiment does not recover within 2 turns: auto-offer live agent transfer with priority routing." },
];

const PHASES = [
  { id: "INIT", label: "Flow Initialization", icon: "◉" },
  { id: "AUTH", label: "Identity Verification", icon: "◈" },
  { id: "INTENT", label: "Intent Detection", icon: "◎" },
  { id: "TOOL", label: "Tool Execution", icon: "⬡" },
  { id: "RAG", label: "RAG + Rerank", icon: "◇" },
  { id: "GOVERN", label: "Governance Check", icon: "◆" },
  { id: "PREDICT", label: "AI Prediction", icon: "△" },
  { id: "ROUTE", label: "Routing Intelligence", icon: "◈" },
  { id: "RESOLVE", label: "Resolution", icon: "●" },
];

// ─── SKILLS-BASED ROUTING MODEL ─────────────────────────────────────
const AGENT_SKILLS = {
  IRS: [
    { skill: "IRS_TaxReturns", label: "Tax Returns & Refunds", minProf: 1 },
    { skill: "IRS_Notices", label: "Notice Explanation (CP/LTR)", minProf: 2 },
    { skill: "IRS_PaymentPlans", label: "Installment Agreements", minProf: 2 },
    { skill: "IRS_Penalties", label: "Penalty Resolution & Abatement", minProf: 3 },
    { skill: "IRS_Amended", label: "Amended Returns (1040-X)", minProf: 3 },
    { skill: "IRS_EIN", label: "EIN Applications", minProf: 1 },
    { skill: "IRS_SpanishLang", label: "Spanish Language Support", minProf: 1 },
  ],
  TreasuryDirect: [
    { skill: "TD_AccountMgmt", label: "Account Management", minProf: 1 },
    { skill: "TD_BondTrans", label: "Bond Transactions", minProf: 2 },
    { skill: "TD_TrustAccts", label: "Trust Account Setup", minProf: 4 },
    { skill: "TD_1099", label: "Tax Form Processing", minProf: 1 },
  ],
  TOP: [
    { skill: "TOP_OffsetInq", label: "Offset Inquiry", minProf: 1 },
    { skill: "TOP_Disputes", label: "Offset Dispute Resolution", minProf: 3 },
    { skill: "TOP_Hardship", label: "Hardship Review (Financial)", minProf: 4 },
    { skill: "TOP_Creditor", label: "Creditor Agency Liaison", minProf: 2 },
  ],
  USMint: [
    { skill: "MINT_Orders", label: "Order Support", minProf: 1 },
    { skill: "MINT_Products", label: "Product Specialist", minProf: 2 },
    { skill: "MINT_Shipping", label: "Shipping Investigation", minProf: 2 },
  ],
  DirectExpress: [
    { skill: "DE_CardSvc", label: "Card Services", minProf: 1 },
    { skill: "DE_PIN", label: "PIN Management", minProf: 1 },
    { skill: "DE_Disputes", label: "Transaction Disputes", minProf: 2 },
  ],
};

const INTENT_TO_SKILL = {
  RefundStatus: "IRS_TaxReturns", NoticeExplanation: "IRS_Notices", PaymentPlan: "IRS_PaymentPlans",
  TranscriptRequest: "IRS_TaxReturns", AmendedReturn: "IRS_Amended", PenaltyAbatement: "IRS_Penalties",
  W2Missing: "IRS_TaxReturns", EINApplication: "IRS_EIN",
  AccountUnlock: "TD_AccountMgmt", BondValue: "TD_BondTrans", BondRedemption: "TD_BondTrans",
  Form1099: "TD_1099", TrustAccount: "TD_TrustAccts", PurchaseHistory: "TD_AccountMgmt",
  OffsetInquiry: "TOP_OffsetInq", DisputeInitiation: "TOP_Disputes",
  HardshipExemption: "TOP_Hardship", CreditorInfo: "TOP_Creditor",
  OrderStatus: "MINT_Orders", ProductAvailability: "MINT_Products",
  ShippingIssue: "MINT_Shipping", CoinInfo: "MINT_Products",
  BalanceCheck: "DE_CardSvc", LostCard: "DE_CardSvc", PINReset: "DE_PIN",
  TransactionHistory: "DE_CardSvc",
};

const PROFICIENCY_LABELS = { 1: "Junior", 2: "Standard", 3: "Senior", 4: "SME" };

const AGENT_NAMES = [
  { name: "Patricia Nguyen", id: "pnguyen", prof: 3 }, { name: "Marcus Johnson", id: "mjohnson", prof: 2 },
  { name: "Sarah Kim", id: "skim", prof: 4 }, { name: "David Rodriguez", id: "drodriguez", prof: 2 },
  { name: "Emily Walsh", id: "ewalsh", prof: 3 }, { name: "James Carter", id: "jcarter", prof: 1 },
  { name: "Maria Sanchez", id: "msanchez", prof: 3 }, { name: "Robert Chen", id: "rchen", prof: 4 },
  { name: "Angela Thompson", id: "athompson", prof: 2 }, { name: "Kevin Patel", id: "kpatel", prof: 1 },
];

const AGENT_STATES = ["TRANSFERRING", "CONNECTED", "HANDLING", "WRAPPING", "COMPLETE"];

// ─── GUIDED DEMO NARRATION ──────────────────────────────────────────
const DEMO_NARRATION = {
  INIT: {
    title: "Flow Initialization", icon: "◉", tab: "sequence",
    what: "Amazon Connect receives the incoming contact and executes the Treasury contact flow. The system identifies the bureau (IRS, TreasuryDirect, TOP, etc.), sets up the session attributes, and activates the AI pipeline.",
    why: "Every contact starts here. Connect instantiates a new contact record, assigns a unique ContactId, selects the appropriate flow based on the dialed number or chat widget, and initializes Nova Sonic speech-to-speech for voice or the Communications Widget for digital channels.",
    look: "👀 The Sequence Diagram is building in real-time — you can see the first arrows: Citizen → Connect Flow → ASR. Each phase you advance will add new arrows. Also check CloudWatch Logs tab for the raw events.",
    think: "The system is deciding: Which bureau did the citizen reach? What channel are they on? Which AI pipeline version should handle this?",
  },
  AUTH: {
    title: "Identity Verification", icon: "◈", tab: "agent",
    what: "The citizen must verify their identity before accessing account information. The system selects one of 4 authentication methods: Conversational KBA, DTMF keypad KBA, Login.gov SAML, or ANI (phone number) matching.",
    why: "Treasury data is protected under IRS §6103 and Privacy Act requirements. No account data can be disclosed without identity verification. The method chosen depends on the channel and security posture — Login.gov provides the highest assurance, ANI matching the lowest friction.",
    look: "👀 Check the AI Agent tab to see the authentication flow being orchestrated. The CloudWatch Logs show InvokeLambda calls to the auth verification service.",
    think: "Authentication friction directly affects self-service probability. A failed KBA attempt raises escalation risk. ANI match is fastest but only works for known numbers.",
  },
  INTENT: {
    title: "Intent Detection", icon: "◎", tab: "analytics",
    what: "Nova Sonic (voice) or the AI Agent (digital) processes the citizen's utterance to determine what they need. The intent classifier returns a category like 'RefundStatus', 'PaymentPlan', or 'DisputeInitiation' with a confidence score.",
    why: "Accurate intent detection is the foundation of everything that follows — it determines which tools to call, which knowledge base articles to retrieve, which governance policies apply, and which agent skill queue to route to if escalation is needed.",
    look: "👀 The Analytics tab now shows the Category Detected badge in the transcript. The AI Agent tab shows the intent classification with confidence percentage.",
    think: "If confidence is low, the system may ask a clarifying question. High-complexity intents (like PenaltyAbatement or HardshipExemption) immediately raise the escalation risk score.",
  },
  TOOL: {
    title: "Tool Execution", icon: "⬡", tab: "sequence",
    what: "The AI Agent calls backend tools via Lambda functions to retrieve or process data — checking refund status in the IRS Master File, looking up bond values in TreasuryDirect, querying offset records in TOP, etc.",
    why: "Tools are the AI's hands — without them it can only talk, not act. Each tool call is gated by AgentCore Policy (Cedar-based authorization) before execution. If a tool times out or fails, the system auto-remediates with retries and fallback strategies.",
    look: "👀 The Sequence Diagram now shows the AI Agent → AgentCore Policy authorization check, then Agent → Lambda tool invocation. Watch for green 200 OK or red TIMEOUT/503. Also check the Governance tab for the policy evaluation detail.",
    think: "Tool latency above 2 seconds significantly raises escalation risk. A policy DENY means the AI tried to access data outside its bureau boundary — a security guardrail working correctly.",
  },
  RAG: {
    title: "RAG + Rerank", icon: "◇", tab: "rag",
    what: "Retrieval-Augmented Generation fetches relevant policy documents from the Treasury Knowledge Base (OpenSearch Serverless), then Cohere Rerank v3.5 re-scores them by relevance. Only the highest-scoring chunks are injected into the AI's context.",
    why: "RAG ensures the AI's response is grounded in actual Treasury policy — not hallucinated. The rerank step is critical: without it, the vector search might return topically related but actually wrong documents. Contextual Grounding then verifies the response uses the retrieved content faithfully.",
    look: "👀 Switch to the RAG + Rerank tab to see the full pipeline: the citizen's utterance as embedding query, the retrieved documents ranked by score, and the grounding verification result.",
    think: "A top rerank score below 0.75 means the Knowledge Base may not have good coverage for this question — that's a signal the AI might not be able to resolve this without a human.",
  },
  GOVERN: {
    title: "Three-Layer Governance", icon: "◆", tab: "governance",
    what: "Every AI response passes through three independent safety layers before reaching the citizen: (1) AgentCore Policy — Cedar-based tool authorization, (2) Automated Reasoning — mathematical verification of facts and calculations, (3) Bedrock Guardrails — content safety, PII redaction, and hallucination detection.",
    why: "For a Treasury deployment, there is zero tolerance for incorrect tax guidance, unauthorized data disclosure, or policy violations. Automated Reasoning provides mathematical PROOF that dollar amounts, dates, and eligibility criteria are correct — not just probable. If any layer fails, the response is blocked and regenerated.",
    look: "👀 The Governance tab shows all three layers with their pass/fail status. Look for AR VALID (green) = mathematically proven correct, or AR INVALID (red) = caught an error before the citizen saw it. The Sequence tab shows the full chain: Agent → Guardrails → AR → Guardrails.",
    think: "This is the differentiator. Most AI systems hope the model gets it right. This system PROVES it's right. An AR INVALID result means the system caught a factual error — that's a success, not a failure.",
  },
  PREDICT: {
    title: "AI Prediction Engine", icon: "△", tab: "analytics",
    what: "The deterministic prediction model evaluates 10 weighted features to calculate a self-service probability score. Features include intent complexity, sentiment risk, auth friction, tool health, KB relevance, AR confidence, queue pressure, and agent availability.",
    why: "This is the decision point: Can the AI resolve this, or does a human need to take over? The model doesn't guess — it computes a weighted score from measurable signals. >62% → SELF_SERVICE, 38-62% → AT_RISK, <38% → ESCALATE.",
    look: "👀 Check the right panel — you'll see the Prediction Gauge showing the self-service probability and all 10 weighted features with their individual scores and contribution weights.",
    think: "The prediction isn't just about this call — it factors in system health (queue pressure, agent availability) to make the optimal routing decision for both the citizen AND the contact center.",
  },
  ROUTE: {
    title: "Skills-Based Routing Intelligence", icon: "◈", tab: "sequence",
    what: "For non-contained contacts, the routing engine matches the intent to a specific agent skill, evaluates queue metrics in real-time, selects the minimum proficiency level needed, checks for callback eligibility, and applies priority boosts for high-severity cases.",
    why: "Routing isn't just 'send to an agent' — it's finding the RIGHT agent. A complex tax penalty case needs a P3 Senior or P4 SME, not a P1 Junior. If queue depth is high and wait would exceed 2 minutes, the system offers a callback instead of making the citizen wait on hold.",
    look: "👀 The Sequence Diagram now shows the full routing decision tree: Agent → Queue Metrics snapshot, Agent → Skills Router match, proficiency evaluation, callback check, and priority boost decisions. Also check the Routing tab for the detailed queue metrics dashboard.",
    think: "For SELF_SERVICE predictions, routing is still logged for analytics — WFM teams use this data to optimize staffing. An ORPHANED contact means we have an intent with no skill mapping — that's a gap to fix.",
  },
  RESOLVE: {
    title: "Resolution", icon: "●", tab: "analytics",
    what: "The contact reaches its outcome. Self-service contacts get a summary and farewell. Escalated contacts are transferred to a live agent with full context (screen pop with AI transcript, recommendations, and case history). Callbacks are scheduled with estimated time.",
    why: "The resolution phase captures the final outcome for reporting — containment rate, first contact resolution, handle time, and predicted CSAT. For escalated calls, the warm handoff ensures the citizen doesn't repeat themselves.",
    look: "👀 The Analytics tab shows the full Post-Call Analytics: CSAT prediction, outcome, sentiment timeline, issues detected, and AI insights. Check the transcript for the complete interaction.",
    think: "A self-service containment means the AI resolved it without human help. That's a win for the citizen (faster) and the contact center (lower cost). But escalation isn't failure — it's the system knowing its limits.",
  },
  AGENT_TRANSFERRING: {
    title: "Agent Transfer In Progress", icon: "👤", tab: "sequence",
    what: "The contact is being transferred to the matched live agent. The agent's desktop receives a screen pop with the complete AI transcript, knowledge base recommendations, AR verification results, and case context.",
    why: "The warm handoff is what makes AI-to-agent escalation seamless. The agent sees EVERYTHING the AI did — what the citizen asked, what tools were called, what the AI recommended, and why it escalated. No repeated questions.",
    look: "👀 A new actor just appeared in the Sequence Diagram — 'Live Agent' in purple. Watch the arrows: Connect Flow → Live Agent (transfer + screen pop). The right panel shows the Live Agent card with assignment details.",
    think: "Queue wait time matters here. If the citizen waited 45 seconds for an agent, that's acceptable. Over 2 minutes and CSAT drops significantly — that's why the callback offer exists.",
  },
  AGENT_CONNECTED: {
    title: "Agent Connected — Warm Handoff", icon: "🧑💼", tab: "analytics",
    what: "The live agent is now connected and greets the citizen, referencing the AI conversation context. Contact Lens activates real-time monitoring — tracking sentiment, talk-over, speaking pace, and empathy detection.",
    why: "The agent's first words are critical. By acknowledging they've reviewed the AI transcript ('I can see you're calling about...'), they immediately build trust and eliminate the frustration of repeating information. Contact Lens monitors quality in real-time.",
    look: "👀 The Analytics transcript now shows the purple TRANSFERRED TO LIVE AGENT divider, followed by the agent's greeting in purple bubbles. Contact Lens + Agent Assist internal blocks appear.",
    think: "The agent has AI recommendations live on their screen — RAG-sourced policy guidance with AR verification. They're not guessing; they have the same intelligence the AI had, plus human judgment.",
  },
  AGENT_HANDLING: {
    title: "Agent Actively Handling", icon: "🔍", tab: "analytics",
    what: "The agent investigates the citizen's issue using backend tools, AI-recommended articles, and their own expertise. Agent Assist pushes real-time recommendations as the conversation evolves. Contact Lens tracks quality metrics.",
    why: "This is human + AI collaboration. The agent uses the AI's knowledge base results as a starting point but applies judgment for edge cases, exceptions, and situations requiring empathy that AI can't fully provide.",
    look: "👀 The transcript shows the agent's investigation, the citizen's responses, and Contact Lens system blocks monitoring empathy, talk-over, and speaking pace in real-time.",
    think: "Agent handle time is being tracked. A P4 SME resolving a complex penalty case in 3 minutes is far more efficient than starting from scratch — that's the value of the AI warm handoff.",
  },
  AGENT_WRAPPING: {
    title: "Agent Wrap-Up (After Contact Work)", icon: "📝", tab: "logs",
    what: "The agent concludes the call and enters wrap-up: saving case notes, setting disposition codes, scheduling follow-ups if needed, and completing after-contact work (ACW).",
    why: "ACW is where the institutional knowledge gets captured. The agent's disposition and notes feed back into the AI's training data, making future self-service handling better. Follow-up scheduling ensures nothing falls through the cracks.",
    look: "👀 CloudWatch Logs show AgentWrapUp events with disposition, case notes status, and ACW timing.",
    think: "Short ACW times mean the screen pop and AI context saved the agent time on documentation. The system is learning from every interaction — each agent resolution trains better future containment.",
  },
  AGENT_COMPLETE: {
    title: "Agent Resolution Complete", icon: "✅", tab: "analytics",
    what: "The contact is fully resolved. Final metrics are computed: total handle time (AI + agent), CSAT survey sent, case created if needed, and the interaction is available for post-call analytics.",
    why: "This is the full picture — an interaction that started with AI, escalated appropriately, and was resolved by a human with AI augmentation. The combined handle time, FCR status, and CSAT feed into workforce management and AI improvement.",
    look: "👀 The Analytics tab now shows the complete Post-Call Analytics with agent resolution details, combined handle time, and the full transcript including both AI and agent portions.",
    think: "Compare this to a traditional call center: the citizen would have waited in queue, repeated their issue, waited for the agent to research, and spent 8-12 minutes total. With AI warm handoff, the agent portion was under 4 minutes.",
  },
};

function generateAgentTranscript(c) {
  if (!c) return [];
  const turns = [];
  const a = c.agentInfo;
  const t = (role, text, meta) => turns.push({ role, text, meta: meta || null, ts: now() });

  t("system_internal", `Transfer complete. Agent ${a.name} (${a.id}) connected. Proficiency: P${a.prof}. Screen pop delivered: ContactProfile, SelfServiceTranscript (${c.logs.length} events), AIRecommendations, CaseHistory.`, `AGENT_CONNECTED │ Skill: ${c.routing?.skillId} │ Queue wait: ${a.queueWaitSec}s`);
  t("agent", `Hi, this is ${a.name.split(" ")[0]} with Treasury ${c.bureau.name} support. I've reviewed the notes from your conversation with our automated system, so you won't need to repeat anything. I can see you're calling about ${c.intent.id.replace(/([A-Z])/g, " $1").toLowerCase().trim()}. Let me take a closer look at this for you.`, `Agent: ${a.name} │ Skill: ${c.routing?.skillId} │ Prof: P${a.prof}`);
  t("user", pick(["Yes, thank you. The automated system couldn't fully resolve it.", "That's right. I appreciate you having the context already.", "Yeah, I've been going back and forth on this. Glad someone can help.", "Correct. I was told a specialist could assist with this."]), null);
  t("system_internal", `AI Agent Assist recommendation pushed to agent desktop: "${c.intent.id}" — see Knowledge Base article ${c.retrieved[0] || "N/A"}, rerank score ${c.rerankScores[0]?.toFixed(2) || "N/A"}. Automated Reasoning: ${c.arResult}.`, `AGENT_ASSIST │ Source: RAG+Rerank+AR │ Live push`);

  const agentLookup = {
    RefundStatus: { q: "Let me pull up your account in our Master File system. I can see the automated system found your refund was processed, but it looks like there may be a hold code I can investigate further.", a: "Can you see why it's being held up?", r: "I found it — there's a CP05A notice that was generated which requires additional identity verification before the refund releases. I can help you clear that right now with a few additional questions, and then your refund should release within 5 business days." },
    NoticeExplanation: { q: "I'm looking at your account transcript and I can see the notice that was generated. Let me explain exactly what the IRS is looking for and what your options are.", a: "I just want to understand what I need to do.", r: "The notice shows a discrepancy between what was reported on your return and what the IRS received from third parties. I can walk you through each line item so you know exactly what to respond with, and I'll make a note on your account that we've discussed this." },
    PaymentPlan: { q: "I can see the automated system started discussing installment options. Let me look at your specific balance and determine the best plan structure for your situation — there are some options the system may not have covered.", a: "I really need a payment I can afford monthly.", r: "Good news — looking at your balance and filing history, you qualify for our streamlined installment agreement. I can set this up right now with a monthly payment that works for your budget, and I'll waive the setup fee since you're enrolling in direct debit." },
    PenaltyAbatement: { q: "I see you're asking about penalty removal. Let me review your compliance history to check eligibility for first-time abatement — the automated system flagged this as a complex case.", a: "I've never had penalties before, this is the first time.", r: "That's actually great news for you. Your account shows a clean 3-year history, which means you qualify for first-time abatement. I'm processing the removal now — you should see the penalty credits applied within 1-2 billing cycles." },
    DisputeInitiation: { q: "I understand you want to dispute this offset. Let me pull up the creditor agency details and walk you through the formal dispute process.", a: "I believe the amount is wrong, it was already paid.", r: "I can see the offset details, and I'll help you submit the dispute documentation to the correct creditor agency. I'm also noting on your account that you've asserted the debt was previously satisfied, which gives you additional protections under the dispute process." },
    HardshipExemption: { q: "I understand this offset is causing financial hardship. Let me review what documentation we'll need and I can help you start the exemption request right now.", a: "I can barely pay my rent as it is.", r: "I completely understand. Based on what you've told me, I'm going to help you file an expedited hardship review. I'll send you the documentation checklist, and I've flagged your case for priority processing given the circumstances." },
  };
  const lookup = agentLookup[c.intent.id] || { q: "Let me investigate this further in our system. I have all the context from your automated session, so I should be able to resolve this.", a: "I appreciate you looking into it.", r: "I've identified the issue and I'm going to get this resolved for you today. Let me process this on my end." };

  t("agent", lookup.q, `Agent screen: Full contact history + AI transcript + recommendations visible`);
  t("user", lookup.a, null);
  t("system_internal", `Contact Lens real-time: Agent empathy detected. Talk-over: 0. Speaking pace: ${jitter(120,30)} wpm (within range). Silence: ${jitter(2,4)}s (acceptable).`, `CONTACT_LENS │ Sentiment tracking active`);
  t("agent", lookup.r, `Tool accessed: treasury-${c.intent.id.replace(/([A-Z])/g, m => "-" + m.toLowerCase()).slice(1)} │ KB: ${c.retrieved[0] || "N/A"}`);
  t("user", pick(["Oh that's great, thank you so much.", "I really appreciate your help with this.", "That's a relief. Thank you for explaining it clearly.", "Perfect, that's exactly what I needed."]), null);
  t("agent", pick([`Is there anything else I can help you with today? I want to make sure everything is taken care of.`, `Before we finish up, is there anything else you need assistance with?`, `I'm glad I could help. Do you have any other questions or concerns?`]), null);
  t("user", pick(["No, that's everything. You've been very helpful.", "I'm all set, thank you.", "No, that covers it. Much appreciated."]), null);
  t("agent", `Thank you for calling ${c.bureau.name}. Have a wonderful day!`, null);
  t("system_internal", `Agent wrap-up: Disposition=RESOLVED. After-contact work: case notes saved, follow-up=${c.intent.id === "HardshipExemption" ? "30-day check-in scheduled" : "none"}. Handle time: ${a.handleTimeSec}s. CSAT survey sent.`, `AGENT_COMPLETE │ Disposition: RESOLVED │ ACW: ${jitter(15,30)}s`);

  return turns;
}

function generateQueueMetrics(bureauId) {
  const depth = jitter(0, 18);
  const available = jitter(2, 14);
  const staffed = available + jitter(3, 12);
  const sla = Math.max(40, 100 - depth * 3.2 - Math.random() * 10);
  return {
    queueName: `${bureauId}_Tier1`, depth,
    oldestContactSec: depth > 0 ? jitter(8, depth * 15) : 0,
    availableAgents: available, staffedAgents: staffed,
    avgHandleTimeSec: jitter(180, 360), avgSpeedAnswerSec: jitter(12, 45),
    serviceLevel: parseFloat(sla.toFixed(1)), serviceLevelThresholdSec: 30,
    abandonmentRate: parseFloat((Math.max(0, 12 - available * 0.8 + depth * 0.5 + Math.random() * 3)).toFixed(1)),
    callbackQueueDepth: jitter(0, 6), callbackEstMinutes: jitter(8, 25),
    agentsByProficiency: { 1: jitter(2, 6), 2: jitter(3, 5), 3: jitter(1, 3), 4: jitter(0, 2) },
  };
}

function generateRoutingDecision(contact, qm) {
  const skillId = INTENT_TO_SKILL[contact.intent.id];
  const skillDef = AGENT_SKILLS[contact.bureau.id]?.find(s => s.skill === skillId);
  const isOrphaned = !skillDef;
  const requiredProficiency = isOrphaned ? 3 : (contact.features.intentComplexity > 0.6 ? Math.max(skillDef.minProf, 3) : contact.sentiment === "VERY_NEGATIVE" ? Math.max(skillDef.minProf, 2) : skillDef.minProf);
  const availableAtProf = isOrphaned ? 0 : Object.entries(qm.agentsByProficiency).filter(([p]) => parseInt(p) >= requiredProficiency).reduce((s, [, c]) => s + c, 0);
  const offerCallback = qm.depth > 8 || qm.oldestContactSec > 120 || availableAtProf === 0;
  const callbackAccepted = offerCallback && Math.random() > 0.35;
  const priorityBoost = contact.sentiment === "VERY_NEGATIVE" || contact.features.intentComplexity > 0.75;
  const finalPriority = priorityBoost ? "PRIORITY" : "NORMAL";
  const estimatedWaitSec = availableAtProf > 0 ? Math.max(5, Math.floor(qm.depth / Math.max(1, availableAtProf) * qm.avgHandleTimeSec * 0.3)) : qm.avgHandleTimeSec;
  return {
    skillId: skillId || "UNMATCHED", skillLabel: skillDef?.label || "NO SKILL MATCH — ORPHANED",
    isOrphaned, requiredProficiency, requiredProfLabel: PROFICIENCY_LABELS[requiredProficiency] || "Unknown",
    availableAtProf, offerCallback, callbackAccepted, callbackEstMinutes: qm.callbackEstMinutes,
    priorityBoost, finalPriority, estimatedWaitSec,
    routingPath: isOrphaned ? "ORPHAN_CATCH_ALL" : callbackAccepted ? "CALLBACK_SCHEDULED" : `SBR_PROFICIENCY_${requiredProficiency}`,
  };
}

// ─── UTILITIES ──────────────────────────────────────────────────────
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rid = () => [8,4,4,4,12].map(n => Array.from({length:n},()=>"0123456789abcdef"[Math.floor(Math.random()*16)]).join("")).join("-");
const now = () => new Date().toISOString().replace("T", " ").slice(0, 23) + "Z";
const jitter = (base, range) => base + Math.floor(Math.random() * range);

// ─── CONTACT GENERATOR ──────────────────────────────────────────────
function createContact() {
  const bureau = pick(BUREAUS);
  const intentObj = pick(INTENTS[bureau.id]);
  const channel = pick(["VOICE", "VOICE", "VOICE", "CHAT", "CHAT", "SMS"]);
  const sentiment = pick(["POSITIVE", "NEUTRAL", "NEUTRAL", "NEGATIVE", "NEGATIVE", "NEGATIVE", "VERY_NEGATIVE", "VERY_NEGATIVE"]);
  const auth = pick(["KBA_CONVERSATIONAL", "KBA_DTMF", "LOGIN_GOV_SAML", "ANI_MATCH"]);
  const voice = pick(["Matthew-Neural", "Lupe-Neural", "Joanna-Neural", "Ruth-Neural"]);
  const authLatencyMs = jitter(600, 1800);
  const toolLatencyMs = jitter(180, 2600);
  const kbLatencyMs = jitter(90, 450);
  const rerankLatencyMs = jitter(40, 180);

  const allDocs = Object.keys(KB_DOCS);
  const bureauPrefix = { IRS: "IRS-", TreasuryDirect: "TD-", TOP: "TOP-", USMint: "MINT-", DirectExpress: "DE-" }[bureau.id];
  const relevant = allDocs.filter(d => d.startsWith(bureauPrefix));
  const others = allDocs.filter(d => !d.startsWith(bureauPrefix));
  const retrieved = [...relevant.sort(() => Math.random() - 0.5).slice(0, Math.min(3, relevant.length)), ...others.sort(() => Math.random() - 0.5).slice(0, 1)].slice(0, 4);
  const rerankScores = retrieved.map((_, i) => Math.max(0.45, 0.97 - i * 0.12 - Math.random() * 0.08));
  const groundingScore = 0.68 + Math.random() * 0.31;
  const arResult = Math.random() > 0.15 ? "VALID" : Math.random() > 0.4 ? "INVALID" : "NO_DATA";
  const policyResult = Math.random() > 0.08 ? "ALLOWED" : "DENIED";
  const hasError = Math.random() > 0.65;
  const error = hasError ? pick(ERRORS) : null;

  const queueMetrics = generateQueueMetrics(bureau.id);
  const features = {
    intentComplexity: intentObj.complexity,
    sentimentRisk: { POSITIVE: 0.08, NEUTRAL: 0.2, NEGATIVE: 0.55, VERY_NEGATIVE: 0.88 }[sentiment],
    authFriction: auth === "ANI_MATCH" ? 0.05 : auth === "LOGIN_GOV_SAML" ? 0.1 : auth === "KBA_DTMF" ? 0.25 : 0.15,
    channelComplexity: { VOICE: 0.22, CHAT: 0.15, SMS: 0.1 }[channel],
    toolHealth: toolLatencyMs > 2000 ? 0.6 : toolLatencyMs > 1000 ? 0.25 : 0.05,
    kbRelevance: rerankScores[0] < 0.75 ? 0.55 : rerankScores[0] < 0.85 ? 0.2 : 0.05,
    arConfidence: arResult === "VALID" ? 0.02 : arResult === "INVALID" ? 0.7 : 0.45,
    repeatCaller: Math.random() > 0.75 ? 0.4 : 0.08,
    queuePressure: queueMetrics.depth > 10 ? 0.7 : queueMetrics.depth > 5 ? 0.35 : 0.05,
    agentAvailability: queueMetrics.availableAgents < 3 ? 0.6 : queueMetrics.availableAgents < 6 ? 0.25 : 0.05,
  };
  const weights = { intentComplexity: 0.22, sentimentRisk: 0.16, authFriction: 0.08, channelComplexity: 0.05, toolHealth: 0.08, kbRelevance: 0.08, arConfidence: 0.06, repeatCaller: 0.05, queuePressure: 0.12, agentAvailability: 0.10 };
  const escalationRisk = Math.min(1, Math.max(0, Object.entries(weights).reduce((s, [k, w]) => s + features[k] * w, 0)));
  const selfServiceProb = Math.min(1, Math.max(0, 1 - escalationRisk));
  const prediction = selfServiceProb > 0.62 ? "SELF_SERVICE" : selfServiceProb > 0.38 ? "AT_RISK" : "ESCALATE";
  const routing = prediction !== "SELF_SERVICE" ? generateRoutingDecision({ bureau, intent: intentObj, features, sentiment }, queueMetrics) : null;

  const agentInfo = prediction !== "SELF_SERVICE" && !(routing?.callbackAccepted) ? (() => {
    const qualified = AGENT_NAMES.filter(a => a.prof >= (routing?.requiredProficiency || 1));
    const assigned = qualified.length > 0 ? pick(qualified) : pick(AGENT_NAMES);
    return { ...assigned, queueWaitSec: routing?.estimatedWaitSec || jitter(12, 45), connectedAt: null, handleTimeSec: jitter(180, 360) };
  })() : null;

  return {
    contactId: rid(), instanceId: "i-" + rid().slice(0, 8),
    bureau, intent: intentObj, channel, sentiment, auth, voice,
    authLatencyMs, toolLatencyMs, kbLatencyMs, rerankLatencyMs,
    retrieved, rerankScores, groundingScore,
    arResult, policyResult, error,
    features, escalationRisk, selfServiceProb, prediction,
    queueMetrics, routing, agentInfo,
    agentState: null, agentTranscript: null,
    phase: 0, phaseLabel: PHASES[0].id, logs: [], startedAt: Date.now(),
  };
}

// ─── LOG GENERATOR ──────────────────────────────────────────────────
function generatePhaseLogs(contact, phaseIdx) {
  const phase = PHASES[phaseIdx];
  if (!phase) return [];
  const logs = [];
  const ts = now();
  const base = { contactId: contact.contactId, flowName: `Treasury_${contact.bureau.id}_MainFlow_v4`, flowModule: "CONTACT_FLOW", instanceARN: `arn:aws:connect:us-east-1:123456789012:instance/${contact.instanceId}` };
  const log = (level, action, detail) => logs.push({ ...base, timestamp: ts, level, action, detail, phase: phase.id });

  switch (phase.id) {
    case "INIT":
      log("INFO", "ContactFlowEvent", `type=INITIATED channel=${contact.channel} flowName=${base.flowName}`);
      log("INFO", "SetAttributes", `Bureau=${contact.bureau.id} Channel=${contact.channel} ANI=+1202555${jitter(1000,8999)} DNIS=+18005551234`);
      log("INFO", "SetAttributes", `ContactId=${contact.contactId} QueueTimestamp=${ts} Region=us-east-1`);
      log("INFO", "InvokeModule", `module=Treasury_LanguageDetection voice=${contact.voice} lang=en-US confidence=98.4%`);
      log("INFO", "InvokeModule", `module=Treasury_${contact.bureau.id}_IdentityGate type=CONTACT_FLOW`);
      break;
    case "AUTH":
      log("INFO", "SetAttributes", `AuthMethod=${contact.auth} AuthAttempt=1`);
      log("INFO", "InvokeLambda", `fn=treasury-identity-validate duration=${contact.authLatencyMs}ms memoryUsed=187MB status=${contact.policyResult === "ALLOWED" ? 200 : 401}`);
      log("INFO", "AgentCorePolicy", `engine=treasury-auth-policy tool=validateIdentity decision=${contact.policyResult} eval=11ms rules=3`);
      if (contact.auth === "ANI_MATCH") log("INFO", "SetAttributes", `ANIMatchScore=${jitter(87,12)}% ANIMatchThreshold=85%`);
      if (contact.auth === "LOGIN_GOV_SAML") log("INFO", "SetAttributes", `SAMLAssertion=VALID IAL=2 AAL=2 provider=login.gov`);
      log(contact.policyResult === "ALLOWED" ? "INFO" : "WARN", "SetAttributes", `AuthResult=${contact.policyResult === "ALLOWED" ? "VERIFIED" : "FAILED"} AuthLatency=${contact.authLatencyMs}ms`);
      if (contact.error?.code === "AUTH_MISMATCH") log("WARN", "Error", contact.error.msg);
      break;
    case "INTENT":
      log("INFO", "GetCustomerInput", `speechModel=NovaSonic inputType=SPEECH voice=${contact.voice} bargeIn=true endSilence=1200ms`);
      log("INFO", "SetAttributes", `utterance="${contact.intent.utterance}"`);
      log("INFO", "SetAttributes", `IntentDetected=${contact.intent.id} IntentConfidence=${jitter(89,10)}% SlotsFilled=${jitter(1,3)}/${jitter(2,3)}`);
      log("INFO", "AIAgentOrchestrator", `agentId=agent-${contact.contactId.slice(0,8)} model=amazon.nova-pro-v1:0 decision=INVOKE_TOOL reasoning="Intent ${contact.intent.id} requires API lookup and KB retrieval. Initiating parallel tool call and knowledge base query."`);
      log("INFO", "SetAttributes", `SelfServicePath=MainMenu>${contact.bureau.id}>${contact.intent.id} NovaSonicSessionId=ns-${rid().slice(0,12)}`);
      break;
    case "TOOL": {
      const toolName = `treasury-${contact.intent.id.replace(/([A-Z])/g, (m) => "-" + m.toLowerCase()).slice(1)}`;
      log("INFO", "AgentCorePolicy", `engine=treasury-tool-policy tool=${toolName} decision=${contact.policyResult} input_ssn_match=true bureau_match=${contact.policyResult === "ALLOWED"} eval=7ms`);
      if (contact.policyResult === "DENIED") { log("ERROR", "PolicyDeny", `tool=${toolName} blocked — bureau boundary violation`); break; }
      log("INFO", "InvokeLambda", `fn=${toolName} duration=${contact.toolLatencyMs}ms memoryUsed=${jitter(128,256)}MB status=${contact.error?.code === "LAMBDA_TIMEOUT" ? "TIMEOUT" : contact.error?.code === "API_503" ? 503 : 200}`);
      if (contact.error?.code === "LAMBDA_TIMEOUT") { log("WARN", "Error", contact.error.msg); log("INFO", "AutoRemediation", `action=RETRY_BACKOFF attempt=1 backoff=2000ms maxRetries=3`); }
      if (contact.error?.code === "API_503") { log("ERROR", "Error", contact.error.msg); log("INFO", "AutoRemediation", `action=CIRCUIT_BREAKER state=OPEN failover=READ_CACHE cacheAge=8min alertId=PD-${jitter(10000,89999)}`); }
      log("INFO", "SetAttributes", `ToolCallResult=${contact.error?.code === "LAMBDA_TIMEOUT" || contact.error?.code === "API_503" ? "DEGRADED" : "SUCCESS"} ToolLatency=${contact.toolLatencyMs}ms`);
      break;
    }
    case "RAG":
      log("INFO", "BedrockKnowledgeBase", `kbId=kb-treasury-docs-v3 query="${contact.intent.utterance.slice(0, 60)}..." hybridSearch=true docsRetrieved=${contact.retrieved.length} vectorStore=aoss-treasury-prod`);
      contact.retrieved.forEach((docId, i) => {
        const doc = KB_DOCS[docId] || { title: docId, tokens: 200 };
        log("INFO", "KBChunkRetrieved", `rank=${i + 1} docId=${docId} title="${doc.title}" tokens=${doc.tokens} cosineSim=${(contact.rerankScores[i] - 0.02 + Math.random() * 0.04).toFixed(3)}`);
      });
      log("INFO", "BedrockRerank", `model=cohere.rerank-v3.5:0 inputDocs=${contact.retrieved.length} latency=${contact.rerankLatencyMs}ms topScore=${contact.rerankScores[0].toFixed(3)}`);
      contact.retrieved.forEach((docId, i) => {
        log("INFO", "RerankResult", `rank=${i + 1} docId=${docId} originalRank=${i + 1 + (Math.random() > 0.6 ? 1 : 0)} score=${contact.rerankScores[i].toFixed(3)}`);
      });
      log("INFO", "ContextualGrounding", `guardrailId=gr-treasury-grounding score=${contact.groundingScore.toFixed(3)} threshold=0.70 result=${contact.groundingScore > 0.7 ? "PASS" : "FLAG"}`);
      if (contact.error?.code === "KB_EMPTY") { log("WARN", "Error", contact.error.msg); log("INFO", "AutoRemediation", `action=BROADEN_QUERY stripped_modifiers=true retry_parent_intent=true`); }
      break;
    case "GOVERN":
      log("INFO", "AutomatedReasoning", `policyId=ar-${contact.bureau.id.toLowerCase()}-guidance-v3 result=${contact.arResult} rulesEval=47 varsExtracted=12 latency=340ms`);
      if (contact.arResult === "VALID") log("INFO", "ARProof", `citations=["${contact.retrieved[0]}:SEC-4.2","IRC-6402(a)"] confidence=FORMAL_PROOF`);
      if (contact.arResult === "INVALID") { log("ERROR", "Error", ERRORS.find(e => e.code === "AR_INVALID").msg); log("INFO", "AutoRemediation", `action=REGENERATE_RESPONSE correction_applied=true new_result=VALID audit_id=ar-${rid().slice(0,8)}`); }
      log("INFO", "BedrockGuardrails", `guardrailId=gr-treasury-pii action=PII_SCAN detected=${Math.random() > 0.55 ? "SSN_PARTIAL" : "NONE"} redacted=${Math.random() > 0.55 ? "true" : "false"}`);
      if (contact.error?.code === "GUARDRAIL_PII") { log("ERROR", "Error", contact.error.msg); log("INFO", "AutoRemediation", `action=PII_REDACT_REGENERATE blocked=true regenerated=true compliance_event=CE-${jitter(10000,89999)}`); }
      log("INFO", "BedrockGuardrails", `guardrailId=gr-treasury-topics action=TOPIC_CHECK result=PASSED deniedTopics=0 promptInjection=NOT_DETECTED`);
      log("INFO", "BedrockGuardrails", `guardrailId=gr-treasury-content action=CONTENT_FILTER hate=NONE insults=NONE sexual=NONE violence=NONE`);
      break;
    case "PREDICT":
      log("INFO", "AIAgentOrchestrator", `agentId=agent-${contact.contactId.slice(0,8)} model=amazon.nova-pro-v1:0 prediction=${contact.prediction} selfServiceProb=${(contact.selfServiceProb * 100).toFixed(1)}% escalationRisk=${(contact.escalationRisk * 100).toFixed(1)}%`);
      log("INFO", "PredictionFeatures", `intentComplexity=${(contact.features.intentComplexity*100).toFixed(0)}% sentimentRisk=${(contact.features.sentimentRisk*100).toFixed(0)}% authFriction=${(contact.features.authFriction*100).toFixed(0)}% toolHealth=${(contact.features.toolHealth*100).toFixed(0)}% kbRelevance=${(contact.features.kbRelevance*100).toFixed(0)}% arConfidence=${(contact.features.arConfidence*100).toFixed(0)}%`);
      {
        const reasoning = contact.prediction === "SELF_SERVICE"
          ? `High-confidence containment. Low intent complexity (${contact.intent.id}), auth verified, KB top score ${contact.rerankScores[0].toFixed(2)}, AR=${contact.arResult}. Proceeding with self-service resolution.`
          : contact.prediction === "AT_RISK"
          ? `Borderline case. Monitoring sentiment (${contact.sentiment}) and tool response quality. Will escalate if next turn shows frustration or tool degradation.`
          : `Escalation recommended. ${contact.sentiment === "VERY_NEGATIVE" ? "Severe negative sentiment. " : ""}${contact.arResult !== "VALID" ? "AR check non-valid. " : ""}${contact.features.intentComplexity > 0.6 ? "High-complexity intent requires human judgment." : "Multiple risk factors exceeded threshold."}`;
        log("INFO", "PredictionReasoning", `reasoning="${reasoning}"`);
      }
      if (contact.error?.code === "SENTIMENT_CRITICAL") { log("WARN", "Error", contact.error.msg); log("INFO", "AutoRemediation", `action=EMPATHY_INJECTION prompt_modifier=added escalation_offer=${contact.prediction === "ESCALATE"}`); }
      break;
    case "ROUTE": {
      const qm = contact.queueMetrics;
      const rt = contact.routing;
      log("INFO", "QueueMetricsSnapshot", `queue=${qm.queueName} depth=${qm.depth} oldestContact=${qm.oldestContactSec}s availableAgents=${qm.availableAgents}/${qm.staffedAgents} SL=${qm.serviceLevel}%@${qm.serviceLevelThresholdSec}s abandonRate=${qm.abandonmentRate}% ASA=${qm.avgSpeedAnswerSec}s AHT=${qm.avgHandleTimeSec}s`);
      log("INFO", "QueueAgentProficiency", `P1_Junior=${qm.agentsByProficiency[1]} P2_Standard=${qm.agentsByProficiency[2]} P3_Senior=${qm.agentsByProficiency[3]} P4_SME=${qm.agentsByProficiency[4]} callbackQueue=${qm.callbackQueueDepth}`);
      if (contact.prediction !== "SELF_SERVICE" && rt) {
        log("INFO", "SkillsBasedRouting", `intent=${contact.intent.id} skillMatch=${rt.skillId} skillLabel="${rt.skillLabel}" requiredProficiency=${rt.requiredProficiency}(${rt.requiredProfLabel}) agentsQualified=${rt.availableAtProf}`);
        if (rt.isOrphaned) {
          log("WARN", "OrphanedContact", `NO SKILL MATCH for intent=${contact.intent.id}. No routing rule maps this intent to an agent skill. Routing to CATCH_ALL queue with P3+ proficiency requirement.`);
          log("INFO", "AutoRemediation", `action=ORPHAN_ROUTING fallback=${qm.queueName}_CatchAll skill=GENERAL_INQUIRY alertTeam=WFM eventId=ORPHAN-${jitter(10000,89999)}`);
        }
        log("INFO", "ProficiencyRouting", `complexityScore=${(contact.features.intentComplexity*100).toFixed(0)}% sentimentScore=${contact.sentiment} minProfRequired=${rt.requiredProficiency} escalatedProf=${rt.requiredProficiency > (AGENT_SKILLS[contact.bureau.id]?.find(s=>s.skill===rt.skillId)?.minProf||1) ? "YES" : "NO"} reason=${contact.features.intentComplexity > 0.6 ? "HIGH_COMPLEXITY" : contact.sentiment === "VERY_NEGATIVE" ? "SENTIMENT_ESCALATION" : "STANDARD"}`);
        if (rt.offerCallback) {
          log("INFO", "CallbackEvaluation", `trigger=${qm.depth > 8 ? "QUEUE_DEPTH>" + qm.depth : qm.oldestContactSec > 120 ? "OLDEST_WAIT>" + qm.oldestContactSec + "s" : "NO_AGENTS_AT_PROF"} callbackQueueDepth=${qm.callbackQueueDepth} estCallbackMin=${rt.callbackEstMinutes} offered=true accepted=${rt.callbackAccepted}`);
          if (rt.callbackAccepted) log("INFO", "CallbackScheduled", `contactId=${contact.contactId} callbackNumber=ANI position=${qm.callbackQueueDepth + 1} estMinutes=${rt.callbackEstMinutes} skill=${rt.skillId} proficiency=${rt.requiredProficiency}`);
        } else {
          log("INFO", "CallbackEvaluation", `queueDepth=${qm.depth} oldestWait=${qm.oldestContactSec}s agentsAtProf=${rt.availableAtProf} — callback NOT warranted`);
        }
        if (rt.priorityBoost) log("INFO", "PriorityRouting", `boost=true reason=${contact.sentiment === "VERY_NEGATIVE" ? "SENTIMENT_CRITICAL" : "HIGH_COMPLEXITY"} finalPriority=${rt.finalPriority} queuePosition=1`);
        log("INFO", "RoutingDecision", `path=${rt.routingPath} queue=${qm.queueName} priority=${rt.finalPriority} skill=${rt.skillId} proficiency=${rt.requiredProficiency}(${rt.requiredProfLabel}) estWait=${rt.estimatedWaitSec}s agents=${rt.availableAtProf}/${qm.staffedAgents}`);
      } else {
        log("INFO", "RoutingDecision", `path=SELF_SERVICE_CONTAINED — no agent routing required. Queue metrics logged for analytics.`);
      }
      break;
    }
    case "RESOLVE": {
      const duration = jitter(15, 240);
      if (contact.prediction === "SELF_SERVICE") {
        log("INFO", "ContactFlowEvent", `type=SELF_SERVICE_COMPLETE duration=${duration}s path=MainMenu>${contact.bureau.id}>${contact.intent.id}>Lookup>Result outcome=CONTAINED`);
        log("INFO", "PostContactSummary", `model=amazon.nova-pro-v1:0 summaryTokens=${jitter(80,120)} caseCreated=false`);
      } else {
        const queue = `${contact.bureau.id}_Tier1`;
        const priority = contact.sentiment === "VERY_NEGATIVE" ? "PRIORITY" : "NORMAL";
        log("INFO", "TransferToQueue", `queue=${queue} priority=${priority} estimatedWait=${jitter(15,90)}s`);
        log("INFO", "SetAttributes", `AgentScreenPop=ENABLED data=ContactProfile,SelfServiceTranscript,AIRecommendations,CaseHistory`);
        log("INFO", "ContactFlowEvent", `type=TRANSFER_TO_AGENT duration=${duration}s path=MainMenu>${contact.bureau.id}>${contact.intent.id}>Escalation reason=${contact.sentiment === "VERY_NEGATIVE" ? "SENTIMENT" : "COMPLEXITY"}`);
        log("INFO", "PostContactSummary", `model=amazon.nova-pro-v1:0 summaryTokens=${jitter(120,180)} caseCreated=true caseId=CASE-${jitter(100000,899999)}`);
      }
      log("INFO", "SetAttributes", `PolicyDecision=${contact.policyResult} ARCheckResult=${contact.arResult} GuardrailAction=PASSED SelfServiceOutcome=${contact.prediction}`);
      break;
    }
  }
  return logs;
}

// ─── CONVERSATION TRANSCRIPT GENERATOR ──────────────────────────────
function generateConversation(c) {
  if (!c) return [];
  const isVoice = c.channel === "VOICE";
  const turns = [];
  const t = (role, text, meta) => turns.push({ role, text, meta: meta || null, ts: now() });

  if (isVoice) {
    t("system", `Thank you for calling the United States Department of the Treasury, ${c.bureau.name}. This call may be recorded for quality assurance. Para español, oprima dos.`, `PHASE: INIT │ Flow: Treasury_${c.bureau.id}_MainFlow_v4 │ Voice: ${c.voice} (Amazon Polly Neural)`);
    t("system", `For faster service, I can help you with many requests right here. You can speak naturally or press keys on your phone. How can I help you today?`, `Nova Sonic speech-to-speech active │ bargeIn=true │ endSilenceTimeout=1200ms`);
  } else {
    t("system", `Welcome to ${c.bureau.name} online support. I'm an AI assistant and I can help with account inquiries, status checks, and more. How can I help you today?`, `PHASE: INIT │ Channel: ${c.channel} │ Widget: Treasury Connect Communications`);
  }

  t("user", c.intent.utterance, null);
  t("system_internal", `AI Agent Decision: Intent detected as "${c.intent.id}" with ${jitter(89,10)}% confidence. Citizen requires identity verification before proceeding. Initiating ${c.auth} authentication flow.`, `PHASE: INTENT │ Agent: agent-${c.contactId.slice(0,8)} │ Model: amazon.nova-pro-v1:0`);

  const authDialogs = {
    KBA_CONVERSATIONAL: [
      { s: "I can help you with that. For security, I'll need to verify your identity first. Can you please provide me with the last four digits of your Social Security number?", u: "It's 4 7 2 9" },
      { s: "Thank you. And can you confirm your date of birth?", u: "March fifteenth, nineteen eighty-one" },
      { s: "And the ZIP code on file for your account?", u: "2 0 5 1 5" },
    ],
    KBA_DTMF: [
      { s: "For security, please enter the last four digits of your Social Security number using your keypad, followed by the pound sign.", u: "[DTMF Input: ●●●● #]" },
      { s: "Now please enter your five-digit ZIP code followed by the pound sign.", u: "[DTMF Input: ●●●●● #]" },
    ],
    LOGIN_GOV_SAML: [
      { s: isVoice ? "I can help with that. I see you've previously linked your Login.gov account for faster verification. I'm validating your identity now — one moment please." : "I can help with that. I'll verify your identity through your linked Login.gov account. One moment please.", u: null },
    ],
    ANI_MATCH: [
      { s: "I can help you with that. I've matched your phone number to an account on file. To confirm, can you tell me the last four digits of your Social Security number?", u: "Sure, it's 4 7 2 9" },
    ],
  };
  const authFlow = authDialogs[c.auth] || authDialogs.KBA_CONVERSATIONAL;
  authFlow.forEach(pair => {
    t("system", pair.s, `PHASE: AUTH │ Method: ${c.auth} │ AgentCore Policy: treasury-auth-policy`);
    if (pair.u) t("user", pair.u, null);
  });

  if (c.policyResult === "ALLOWED") {
    t("system_internal", `Identity verification PASSED. AgentCore Policy decision: ALLOWED (eval: 11ms). Auth latency: ${c.authLatencyMs}ms. ${c.auth === "LOGIN_GOV_SAML" ? "SAML assertion valid │ IAL=2 │ AAL=2." : c.auth === "ANI_MATCH" ? `ANI match confidence: ${jitter(87,12)}%.` : "KBA 3/3 correct."}`, "PHASE: AUTH │ Policy Engine: treasury-auth-policy │ Cedar rule: ALLOW validateIdentity IF ssn_match AND bureau_match");
    t("system", `Thank you, I've verified your identity. Let me look into your ${c.intent.id.replace(/([A-Z])/g, ' $1').trim().toLowerCase()} for you now.`, null);
  } else {
    t("system_internal", `Identity verification FAILED. AgentCore Policy decision: DENIED. ${c.error?.code === "AUTH_MISMATCH" ? c.error.msg : "Credentials did not match records."}`, "PHASE: AUTH │ AutoRemediation: Offer DTMF fallback or agent transfer");
    t("system", "I'm sorry, I wasn't able to verify your identity with the information provided. Let me connect you with a specialist who can assist you further.", null);
  }

  const toolName = `treasury-${c.intent.id.replace(/([A-Z])/g, m => "-" + m.toLowerCase()).slice(1)}`;
  if (c.policyResult === "ALLOWED") {
    t("system_internal", `AI Agent invoking tool: ${toolName}. AgentCore Policy pre-check: ALLOWED (bureau=${c.bureau.id}, ssn_match=true). Lambda executing...`, "PHASE: TOOL │ Policy: treasury-tool-policy │ Cedar eval: 7ms");

    if (c.error?.code === "LAMBDA_TIMEOUT" || c.error?.code === "API_503") {
      t("system_internal", `ERROR: ${c.error.msg}. AutoRemediation: ${c.error.code === "LAMBDA_TIMEOUT" ? "Retry with exponential backoff (attempt 1/3, 2000ms)." : "Circuit breaker OPEN. Failover to read cache (age: 8min)."}`, `PHASE: TOOL │ Severity: ${c.error.severity} │ Remediation active`);
      if (isVoice) t("system", "I'm pulling up your information now. This is taking a moment longer than usual, thank you for your patience.", null);
      else t("system", "Looking that up for you now. This may take a moment longer than usual — thank you for your patience.", null);
    } else {
      t("system_internal", `Tool call SUCCESS. Lambda ${toolName} returned in ${c.toolLatencyMs}ms. Status: 200. Proceeding to knowledge base retrieval for response generation.`, `PHASE: TOOL │ Memory: ${jitter(128,256)}MB │ Result: SUCCESS`);
    }

    t("system_internal", `Knowledge Base query: "${c.intent.utterance.slice(0,50)}..." → ${c.retrieved.length} documents retrieved. Reranking with cohere.rerank-v3.5... Top result: ${c.retrieved[0]} (score: ${c.rerankScores[0].toFixed(3)}). Contextual grounding: ${c.groundingScore.toFixed(3)} (${c.groundingScore > 0.7 ? "PASS" : "FLAG"}).`, `PHASE: RAG │ KB: kb-treasury-docs-v3 │ Vector: aoss-treasury-prod │ Rerank latency: ${c.rerankLatencyMs}ms`);

    const govNotes = [];
    if (c.arResult === "VALID") govNotes.push(`Automated Reasoning: VALID (47 rules, formal proof attached, citations: ${c.retrieved[0]}:SEC-4.2)`);
    if (c.arResult === "INVALID") govNotes.push("Automated Reasoning: INVALID — response contained incorrect value. Correction applied, re-validated → VALID");
    if (c.arResult === "NO_DATA") govNotes.push("Automated Reasoning: NO_DATA — outside policy scope, flagged for review");
    govNotes.push("PII scan: " + (Math.random() > 0.5 ? "SSN partial detected → REDACTED" : "clean"));
    govNotes.push("Content filter: PASSED │ Topic policy: PASSED │ Prompt injection: NOT DETECTED");
    t("system_internal", `Governance pipeline complete. ${govNotes.join(". ")}.`, `PHASE: GOVERN │ AR policy: ar-${c.bureau.id.toLowerCase()}-guidance-v3 │ Guardrails: gr-treasury-pii, gr-treasury-topics, gr-treasury-content`);

    const responses = getIntentResponse(c);
    responses.forEach(r => t("system", r.text, r.meta));

    if (c.sentiment === "NEGATIVE" || c.sentiment === "VERY_NEGATIVE") {
      t("user", c.sentiment === "VERY_NEGATIVE" ? "That's not good enough. I've been waiting for weeks and nobody can help me. I want to speak to someone." : "Okay, but is there any way to speed this up?", null);
      t("system_internal", `Contact Lens real-time: Sentiment=${c.sentiment}. AI Prediction: selfServiceProb=${(c.selfServiceProb*100).toFixed(1)}%, prediction=${c.prediction}. ${c.prediction === "ESCALATE" ? "Escalation threshold exceeded." : "Monitoring — may recover."}`, `PHASE: PREDICT │ Escalation risk: ${(c.escalationRisk*100).toFixed(1)}%`);
    } else {
      t("user", pick(["Okay, that makes sense. Thank you.", "Got it, that's helpful.", "Perfect, that's what I needed to know.", "Alright, thanks for looking that up."]), null);
      t("system_internal", `Contact Lens real-time: Sentiment=${c.sentiment}. AI Prediction: selfServiceProb=${(c.selfServiceProb*100).toFixed(1)}%, prediction=${c.prediction}. ${c.prediction === "SELF_SERVICE" ? "High-confidence self-service resolution." : "Borderline — continue monitoring."}`, `PHASE: PREDICT │ Escalation risk: ${(c.escalationRisk*100).toFixed(1)}%`);
    }

    const qm = c.queueMetrics;
    const rt = c.routing;
    t("system_internal", `Queue metrics snapshot: ${qm.queueName} depth=${qm.depth} available=${qm.availableAgents}/${qm.staffedAgents} SL=${qm.serviceLevel}%@${qm.serviceLevelThresholdSec}s abandon=${qm.abandonmentRate}% ASA=${qm.avgSpeedAnswerSec}s AHT=${Math.floor(qm.avgHandleTimeSec/60)}m${qm.avgHandleTimeSec%60}s. Proficiency: P1=${qm.agentsByProficiency[1]} P2=${qm.agentsByProficiency[2]} P3=${qm.agentsByProficiency[3]} P4=${qm.agentsByProficiency[4]}. Callback queue: ${qm.callbackQueueDepth}.`, `PHASE: ROUTE │ Queue: ${qm.queueName} │ Service Level: ${qm.serviceLevel}%`);

    if (c.prediction === "SELF_SERVICE") {
      t("system_internal", `Routing decision: SELF_SERVICE_CONTAINED. Queue metrics logged for WFM analytics (depth=${qm.depth}, SL=${qm.serviceLevel}%). No agent routing required.`, `PHASE: ROUTE │ Path: SELF_SERVICE_CONTAINED`);
      t("system", pick(["Is there anything else I can help you with today?", "I'm glad I could help. Is there anything else you need?", "You're all set. Is there anything else I can assist with?"]), null);
      t("user", pick(["No, that's everything. Thank you.", "Nope, I'm good. Thanks!", "That's all I needed."]), null);
      t("system", isVoice ? "Thank you for calling the U.S. Treasury. Have a great day. Goodbye." : "Thank you for contacting us. Have a great day!", "PHASE: RESOLVE │ Outcome: SELF_SERVICE │ PostContactSummary: amazon.nova-pro-v1:0");
    } else if (rt) {
      t("system_internal", `Skills-Based Routing: intent=${c.intent.id} → skill=${rt.skillId}${rt.isOrphaned ? " ⚠ ORPHANED — no skill match, routing to catch-all queue" : ` ("${rt.skillLabel}")`}. Required proficiency: P${rt.requiredProficiency} (${rt.requiredProfLabel})${rt.requiredProficiency > 2 ? ` — ELEVATED due to ${c.features.intentComplexity > 0.6 ? "high complexity" : "negative sentiment"}` : ""}. Agents qualified at P${rt.requiredProficiency}+: ${rt.availableAtProf}/${qm.staffedAgents}.`, `PHASE: ROUTE │ Skill: ${rt.skillId} │ Proficiency: P${rt.requiredProficiency} │ Agents: ${rt.availableAtProf}`);

      if (rt.isOrphaned) t("system_internal", `⚠ ORPHANED CONTACT: No routing rule maps intent "${c.intent.id}" to an agent skill. Fallback: CATCH_ALL queue with P3+ proficiency. WFM alert dispatched: ORPHAN-${jitter(10000,89999)}.`, `PHASE: ROUTE │ ORPHAN DETECTED │ Alert sent to WFM team`);

      if (rt.offerCallback) {
        t("system_internal", `Callback evaluation triggered: ${qm.depth > 8 ? `queue depth (${qm.depth}) exceeds threshold` : qm.oldestContactSec > 120 ? `oldest contact (${qm.oldestContactSec}s) exceeds 2min` : `no agents available at P${rt.requiredProficiency}`}. Offering callback. Est: ${rt.callbackEstMinutes} minutes.`, `PHASE: ROUTE │ Callback: OFFERED │ Queue position: #${qm.callbackQueueDepth + 1}`);
        if (isVoice) {
          t("system", `I'd like to connect you with a ${rt.requiredProfLabel.toLowerCase()} specialist, but our current wait time is longer than usual. I can schedule a callback — we'll call you back at this number within approximately ${rt.callbackEstMinutes} minutes, and you won't lose your place. Would you prefer a callback, or would you like to wait on the line?`, `Queue depth: ${qm.depth} │ Est wait: ${rt.estimatedWaitSec}s │ Callback est: ${rt.callbackEstMinutes}min`);
        } else {
          t("system", `I'd like to connect you with a ${rt.requiredProfLabel.toLowerCase()} specialist. Current wait times are elevated (approximately ${Math.ceil(rt.estimatedWaitSec / 60)} minutes). I can schedule a callback instead — we'll reach out within ${rt.callbackEstMinutes} minutes. Would you prefer a callback?`, `Queue depth: ${qm.depth} │ Callback est: ${rt.callbackEstMinutes}min`);
        }
        if (rt.callbackAccepted) {
          t("user", pick(["Yes, please call me back.", "A callback would be great, thanks.", "Sure, call me back at this number."]), null);
          t("system_internal", `Callback ACCEPTED. Scheduled at ANI on file. Position: #${qm.callbackQueueDepth + 1}. Skill: ${rt.skillId}, proficiency ≥ P${rt.requiredProficiency}. Callback queue depth: ${qm.callbackQueueDepth + 1}. Est: ${rt.callbackEstMinutes} minutes.`, `PHASE: ROUTE │ Path: CALLBACK_SCHEDULED │ Skill: ${rt.skillId}`);
          t("system", `I've scheduled your callback. You'll receive a call from our ${c.bureau.name} team within approximately ${rt.callbackEstMinutes} minutes. The specialist will have a full summary of everything we discussed today, so you won't need to repeat anything. ${isVoice ? "You can hang up now — we'll call you back shortly." : "You can close this chat window. We'll reach out soon."}`, `Callback scheduled │ Skill: ${rt.skillId} │ Prof ≥ P${rt.requiredProficiency}`);
        } else {
          t("user", pick(["No, I'll wait.", "I'd rather hold, thanks.", "I'll stay on the line."]), null);
          t("system_internal", `Callback DECLINED. Citizen chose to wait. Routing to ${qm.queueName} queue. Priority: ${rt.finalPriority}. Skill: ${rt.skillId}, proficiency ≥ P${rt.requiredProficiency}. Est wait: ${rt.estimatedWaitSec}s.`, `PHASE: ROUTE │ Path: SBR_PROFICIENCY_${rt.requiredProficiency}`);
          if (rt.priorityBoost) t("system_internal", `Priority BOOST applied: ${c.sentiment === "VERY_NEGATIVE" ? "SENTIMENT_CRITICAL" : "HIGH_COMPLEXITY"}. Contact moved to position #1 in queue.`, `PHASE: ROUTE │ Priority: ${rt.finalPriority}`);
          t("system", `I'm connecting you now with a ${rt.requiredProfLabel.toLowerCase()} specialist from our ${c.bureau.name} team. ${rt.priorityBoost ? "I've prioritized your call given the urgency. " : ""}Your estimated wait is approximately ${Math.ceil(rt.estimatedWaitSec / 60)} minute${Math.ceil(rt.estimatedWaitSec / 60) > 1 ? "s" : ""}. They'll have all the details from our conversation. ${isVoice ? "Please stay on the line." : "Please stay in this chat window."}`, `Queue: ${qm.queueName} │ Priority: ${rt.finalPriority} │ Skill: ${rt.skillId} │ Prof ≥ P${rt.requiredProficiency}`);
        }
      } else {
        if (rt.priorityBoost) t("system_internal", `Priority BOOST applied: ${c.sentiment === "VERY_NEGATIVE" ? "SENTIMENT_CRITICAL" : "HIGH_COMPLEXITY"}. Contact elevated to PRIORITY in ${qm.queueName} queue.`, `PHASE: ROUTE │ Priority: ${rt.finalPriority}`);
        if (c.prediction === "AT_RISK") {
          t("system", `I want to make sure we get this fully resolved for you. Would you like me to connect you with a ${rt.requiredProfLabel.toLowerCase()} specialist who can provide additional assistance?`, null);
          t("user", pick(["Yeah, let me talk to someone please.", "I'll try to work with what you've given me for now."]), null);
        } else {
          t("system", `I completely understand your frustration, and I want to make sure this gets resolved properly. Let me connect you with a ${rt.requiredProfLabel.toLowerCase()} specialist right now.`, null);
        }
        t("system_internal", `Routing: queue=${qm.queueName} priority=${rt.finalPriority} skill=${rt.skillId} proficiency≥P${rt.requiredProficiency}(${rt.requiredProfLabel}) qualifiedAgents=${rt.availableAtProf} estWait=${rt.estimatedWaitSec}s. Agent screen pop: ContactProfile, SelfServiceTranscript, AIRecommendations, CaseHistory, RoutingContext. Case created: CASE-${jitter(100000,899999)}.`, `PHASE: RESOLVE │ Outcome: ${c.prediction} │ Reason: ${c.sentiment === "VERY_NEGATIVE" ? "SENTIMENT" : "COMPLEXITY"}`);
        t("system", `I'm transferring you now. A ${rt.requiredProfLabel.toLowerCase()} specialist from our ${c.bureau.name} team will be with you in approximately ${Math.ceil(rt.estimatedWaitSec / 60)} minute${Math.ceil(rt.estimatedWaitSec / 60) > 1 ? "s" : ""}. They'll have all the details from our conversation. ${isVoice ? "Please stay on the line." : "Please stay in this chat window."}`, `Queue: ${qm.queueName} │ Est: ${rt.estimatedWaitSec}s │ Skill: ${rt.skillId}`);
      }
    }

    t("system_internal", `Post-contact summary generated (amazon.nova-pro-v1:0, ${jitter(80,180)} tokens). Contact complete. Total log events: ${c.logs.length}. PolicyDecision=${c.policyResult}. ARCheck=${c.arResult}. Guardrails=PASSED. Routing=${rt?.routingPath || "SELF_SERVICE"}.`, "PHASE: RESOLVE │ Contact ended");
  }
  return turns;
}

function getIntentResponse(c) {
  const R = {
    RefundStatus: [
      { text: "I've pulled up your refund information. Your federal return was received on February 12th and processing was completed on March 3rd. Your refund of $3,847.00 was direct-deposited to your bank account ending in ●●●●7294 on March 8th.", meta: `Tool: treasury-refund-status │ API: IRS Master File │ AR: ${c.arResult}` },
      { text: "If you don't see it in your account yet, it may take 1-2 additional business days depending on your bank. You can also check on irs.gov using the 'Where's My Refund' tool.", meta: "KB: IRS-PUB-17-SEC4.2 │ Grounding: " + c.groundingScore.toFixed(3) },
    ],
    NoticeExplanation: [
      { text: "I can see the CP2000 notice that was issued to you. This is a proposed adjustment — it's not a bill. The IRS received information from a third party, in this case your brokerage, that shows investment income of $2,340 that wasn't reported on your return.", meta: `Tool: treasury-notice-explanation │ KB: IRS-CP2000-GUIDE │ AR: ${c.arResult}` },
      { text: "You have 30 days from the date of the notice to respond. You can agree and pay the difference, partially agree, or disagree with documentation. I can explain each option if you'd like.", meta: "KB: IRS-CP2000-GUIDE │ Grounding: " + c.groundingScore.toFixed(3) },
    ],
    PaymentPlan: [
      { text: "Based on your account, you owe $8,425.00 including penalties and interest. Since this is under $50,000, you qualify for a streamlined installment agreement without needing to provide financial statements.", meta: `Tool: treasury-payment-plan │ KB: IRS-FORM-9465 │ AR: ${c.arResult}` },
      { text: "The setup fee is $22 for online direct debit enrollment. Your maximum term would be 72 months, which comes to approximately $117 per month. Would you like me to walk you through the setup?", meta: "KB: IRS-FORM-9465 │ AR formal proof: installment calc verified" },
    ],
    TranscriptRequest: [
      { text: "I can help you get a copy of your tax transcript. I've initiated a request for your 2024 Account Transcript. It will be mailed to your address on file within 5 to 10 business days.", meta: `Tool: treasury-transcript-request │ AR: ${c.arResult}` },
      { text: "If you need it faster, you can also access it immediately through irs.gov by creating or signing into your IRS Online Account.", meta: "KB: IRS-PUB-17-SEC4.2" },
    ],
    AccountUnlock: [
      { text: "I can see your TreasuryDirect account was locked due to three consecutive failed login attempts on January 15th. Since I've verified your identity, I can initiate an unlock for you right now.", meta: `Tool: treasury-account-unlock │ KB: TD-UNLOCK-FAQ │ AR: ${c.arResult}` },
      { text: "The unlock has been initiated. You should receive an email within 10 minutes with a temporary password. Please change it immediately upon logging in. Your securities and balances are all intact.", meta: "Unlock status: INITIATED │ Notification: EMAIL" },
    ],
    BondValue: [
      { text: "I've looked up your Series I bond purchased in April 2019. The face value was $5,000. With the composite interest rates applied over the past six years, your current redemption value is $6,847.20.", meta: `Tool: treasury-bond-value │ KB: TD-SERIES-I-RULES │ AR: ${c.arResult}` },
      { text: "Since it's been more than 5 years, there's no early redemption penalty. The current composite rate is 5.27% through October 2025.", meta: "KB: TD-SERIES-I-RULES │ AR proof: bond calc verified" },
    ],
    BondRedemption: [
      { text: "I can help with that. Your account shows 3 Series I bonds eligible for full redemption with no penalty. The combined current value is $14,238.60.", meta: `Tool: treasury-bond-redemption-info │ KB: TD-SERIES-I-RULES │ AR: ${c.arResult}` },
      { text: "You can redeem them online through TreasuryDirect. The proceeds will be deposited to your linked bank account within 2 business days. Shall I walk you through the steps?", meta: "KB: TD-SERIES-I-RULES" },
    ],
    OffsetInquiry: [
      { text: "I've looked into this for you. Your 2024 federal tax refund of $2,180 was offset on March 1st, 2025. The offset was applied to a debt owed to the Department of Education for a defaulted student loan in the amount of $2,180.", meta: `Tool: treasury-lookup-offset │ KB: TOP-31CFR285 │ AR: ${c.arResult}` },
      { text: "If you believe this is in error, you'll need to contact the Department of Education directly — they are the creditor agency. I can provide you with their contact information.", meta: "KB: TOP-DISPUTE │ Creditor: Dept. of Education" },
    ],
    DisputeInitiation: [
      { text: "I understand you want to dispute this offset. The Bureau of Fiscal Service administers the offset program, but disputes must be directed to the creditor agency — in your case, that's the Department of Education.", meta: `Tool: treasury-create-dispute │ KB: TOP-DISPUTE │ AR: ${c.arResult}` },
      { text: "You have 60 days from the offset date to submit a written dispute. I can provide the mailing address and the specific documentation you'll need.", meta: "KB: TOP-DISPUTE │ Deadline calculation: AR verified" },
    ],
    OrderStatus: [
      { text: "I've found your order. Order number USM-2025-0847291 was placed on February 7th for the 2025 American Eagle Silver Proof coin. It shipped on February 12th via USPS Priority Mail, tracking number 9400111899223847562.", meta: `Tool: treasury-get-order-status │ KB: MINT-SHIPPING │ AR: ${c.arResult}` },
      { text: "According to tracking, it's currently in transit and estimated delivery is tomorrow, February 22nd.", meta: "Tracking: USPS │ Status: IN_TRANSIT" },
    ],
    BalanceCheck: [
      { text: "Your Direct Express card balance as of today is $1,247.33. Your most recent deposit was $1,483.00 on February 3rd. Your last transaction was a purchase of $42.67 at Walmart on February 18th.", meta: `Tool: treasury-get-balance │ AR: ${c.arResult}` },
    ],
    LostCard: [
      { text: "I'm sorry to hear that. I've flagged your card ending in ●●●●3847 as stolen and it has been immediately deactivated to prevent unauthorized use. No transactions have occurred since your last known purchase.", meta: `Tool: treasury-report-lost-card │ KB: DE-CARD-REPLACE │ AR: ${c.arResult}` },
      { text: "A replacement card will be mailed to your address on file within 5-7 business days. If you need emergency access to your funds sooner, we offer an expedited card for a $13.50 fee that arrives in 1-3 business days.", meta: "KB: DE-CARD-REPLACE │ Card: DEACTIVATED" },
    ],
    PINReset: [{ text: "I've initiated a PIN reset for your Direct Express card. You can set a new PIN by calling the automated system at 1-888-741-1115 from the phone number on your account, or at any ATM using your card.", meta: `Tool: treasury-initiate-pin-reset │ KB: DE-PIN-RESET-FLOW │ AR: ${c.arResult}` }],
    Form1099: [{ text: "Your 1099-INT for tax year 2024 is available. It shows total interest earned of $423.18 across your TreasuryDirect holdings. You can download it from your TreasuryDirect account under ManageDirect > 1099 Information.", meta: `Tool: treasury-get-1099-status │ KB: TD-1099-DELIVERY │ AR: ${c.arResult}` }],
    HardshipExemption: [
      { text: "I understand this is a difficult situation. To request a financial hardship exemption from the offset, you'll need to demonstrate that the offset prevents you from meeting basic living expenses.", meta: `Tool: treasury-get-hardship-form │ KB: TOP-HARDSHIP-EXEMPT │ AR: ${c.arResult}` },
      { text: "This requires documentation including proof of income, monthly expenses, and a hardship statement. Given the complexity of this request, I'd recommend speaking with one of our specialists.", meta: "KB: TOP-HARDSHIP-EXEMPT │ Complexity: HIGH" },
    ],
    EINApplication: [{ text: "I can help you get started with your EIN application. For a new LLC, you'll need the responsible party's SSN, the LLC's legal name, and your mailing address. The application can be completed online at irs.gov and you'll receive your EIN immediately.", meta: `Tool: treasury-check-ein-status │ KB: IRS-PUB-15-EMPLOYER │ AR: ${c.arResult}` }],
    AmendedReturn: [{ text: "To amend your 2024 return, you'll need to file Form 1040-X. This can now be done electronically through most tax software. Processing time for amended returns is typically 16-20 weeks.", meta: `Tool: treasury-get-amended-return-status │ AR: ${c.arResult}` }],
    PenaltyAbatement: [
      { text: "I've reviewed your account history. You have a clean compliance record for the past three tax years with no prior penalties, which means you qualify for First-Time Penalty Abatement.", meta: `Tool: treasury-get-penalty-details │ KB: IRS-PENALTY-ABATE │ AR: ${c.arResult}` },
      { text: "The failure-to-pay penalty on your account is $847.50. I can initiate the abatement request right now. If approved, this amount will be removed from your balance.", meta: "KB: IRS-PENALTY-ABATE │ AR proof: 3-year clean verified" },
    ],
    W2Missing: [
      { text: "I understand that's frustrating. Your employer was required to furnish your W-2 by January 31st. Since it's now past the deadline, you have a couple of options.", meta: `Tool: treasury-get-w2-status │ KB: IRS-PUB-15-EMPLOYER │ AR: ${c.arResult}` },
      { text: "First, check if it's available through your employer's payroll portal. If not, you can file a complaint with the IRS, and we can use Form 4852 as a substitute W-2 based on your final pay stub. You can still file your return on time using the substitute.", meta: "KB: IRS-PUB-15-EMPLOYER" },
    ],
    ProductAvailability: [{ text: "The 2025 American Eagle Silver Proof coins are currently in stock and available for purchase at $79.00 each. We also have the 2025 Gold Eagle proof set available.", meta: `Tool: treasury-check-inventory │ KB: MINT-PRODUCT-CATALOG │ AR: ${c.arResult}` }],
    ShippingIssue: [
      { text: "I can see your order USM-2025-0712834 shows as 'Delivered' via USPS on February 15th. I understand you haven't received it. I've opened a shipping investigation and flagged this with our fulfillment team.", meta: `Tool: treasury-get-shipment-tracking │ KB: MINT-SHIPPING │ AR: ${c.arResult}` },
      { text: "Please allow 3-5 business days for the investigation. If the package isn't located, we'll issue a replacement at no charge. You'll receive email updates on the case status.", meta: "Case: SHIP-INV-" + jitter(100000, 899999) },
    ],
    CoinInfo: [{ text: "The 2025 American Women Quarters program features five new designs honoring notable American women. The current release features Patsy Takemoto Mink, the first woman of color elected to the U.S. Congress.", meta: `Tool: treasury-get-product-info │ KB: MINT-COMMEMORATIVE-2025 │ AR: ${c.arResult}` }],
    TrustAccount: [
      { text: "Setting up a trust account in TreasuryDirect requires several pieces of documentation including the trust document, trustee information, and the trust's tax identification number.", meta: `Tool: treasury-get-trust-account-info │ KB: TD-TRUST-ACCT-GUIDE │ AR: ${c.arResult}` },
      { text: "Given the complexity of trust accounts, I'd recommend working with one of our specialists who can walk you through each step and ensure everything is set up correctly.", meta: "KB: TD-TRUST-ACCT-GUIDE │ Complexity: HIGH" },
    ],
    TransactionHistory: [{ text: "Here are your last 5 Direct Express transactions: Feb 18 – Walmart $42.67, Feb 15 – Shell Gas $38.50, Feb 12 – Walgreens $14.23, Feb 10 – ATM Withdrawal $200.00, Feb 8 – Amazon $67.84. Your current balance is $1,247.33.", meta: `Tool: treasury-get-transactions │ AR: ${c.arResult}` }],
    PurchaseHistory: [{ text: "Your TreasuryDirect purchase history shows 4 active holdings: 2 Series I bonds ($5,000 each, purchased 2019 and 2021), 1 Series EE bond ($1,000, purchased 2020), and 1 Treasury Bill ($10,000, purchased January 2025).", meta: `Tool: treasury-get-purchase-history │ AR: ${c.arResult}` }],
    CreditorInfo: [{ text: "The agency that initiated the offset against your refund is the U.S. Department of Education, Student Loan Servicing Division. Their contact number is 1-800-621-3115 and they can be reached Monday through Friday, 8am to 8pm Eastern.", meta: `Tool: treasury-get-creditor-agency │ KB: TOP-CREDITOR-AGENCIES │ AR: ${c.arResult}` }],
  };
  return R[c.intent.id] || [{ text: "I've retrieved your information. Let me review the details with you.", meta: `Tool: treasury-${c.intent.id} │ AR: ${c.arResult}` }];
}

// ─── LIVE CALL ANALYTICS DATA GENERATOR ──────────────────────
const ANALYTICS_CATEGORIES = {
  IRS: [
    { id: "TAX_REFUND_INQUIRY", label: "Tax Refund Inquiry", color: "#3b82f6" },
    { id: "COMPLIANCE_NOTICE", label: "Compliance Notice", color: "#f59e0b" },
    { id: "PAYMENT_ARRANGEMENT", label: "Payment Arrangement", color: "#8b5cf6" },
    { id: "DOCUMENT_REQUEST", label: "Document Request", color: "#06b6d4" },
    { id: "PENALTY_REVIEW", label: "Penalty Review", color: "#ef4444" },
    { id: "IDENTITY_ISSUE", label: "Identity Verification Issue", color: "#f97316" },
  ],
  TreasuryDirect: [
    { id: "ACCOUNT_ACCESS", label: "Account Access Issue", color: "#ef4444" },
    { id: "BOND_TRANSACTION", label: "Bond Transaction", color: "#8b5cf6" },
    { id: "TAX_FORM", label: "Tax Form Request", color: "#06b6d4" },
  ],
  TOP: [
    { id: "OFFSET_DISPUTE", label: "Offset Dispute", color: "#ef4444" },
    { id: "HARDSHIP_CLAIM", label: "Hardship Claim", color: "#f97316" },
    { id: "CREDITOR_INQUIRY", label: "Creditor Agency Inquiry", color: "#06b6d4" },
  ],
  USMint: [
    { id: "ORDER_ISSUE", label: "Order Issue", color: "#f59e0b" },
    { id: "SHIPPING_PROBLEM", label: "Shipping Problem", color: "#ef4444" },
    { id: "PRODUCT_INQUIRY", label: "Product Inquiry", color: "#06b6d4" },
  ],
  DirectExpress: [
    { id: "CARD_PROBLEM", label: "Card Problem", color: "#ef4444" },
    { id: "TRANSACTION_DISPUTE", label: "Transaction Dispute", color: "#f97316" },
    { id: "ACCOUNT_SERVICE", label: "Account Service", color: "#06b6d4" },
  ],
};

function generateAnalytics(c) {
  if (!c) return null;
  const isLive = c.phase < PHASES.length - 1;
  const elapsed = ((Date.now() - c.startedAt) / 1000).toFixed(0);
  const catPool = ANALYTICS_CATEGORIES[c.bureau.id] || ANALYTICS_CATEGORIES.IRS;
  const primaryCat = catPool[Math.floor(c.contactId.charCodeAt(0) % catPool.length)];
  const secondaryCat = catPool[(Math.floor(c.contactId.charCodeAt(1) % catPool.length) + 1) % catPool.length];

  const sentimentMap = { POSITIVE: [0.6, 0.8], NEUTRAL: [0.0, 0.3], NEGATIVE: [-0.5, -0.2], VERY_NEGATIVE: [-0.9, -0.5] };
  const [sLo, sHi] = sentimentMap[c.sentiment];
  const turnCount = Math.min(c.phase + 2, 10);
  const sentimentTimeline = Array.from({ length: turnCount }, (_, i) => {
    const callerBase = sLo + (sHi - sLo) * Math.random();
    const drift = c.prediction === "SELF_SERVICE" ? i * 0.04 : c.prediction === "ESCALATE" ? -i * 0.03 : 0;
    return {
      turn: i + 1,
      speaker: i % 2 === 0 ? "CALLER" : "AGENT",
      sentiment: parseFloat(Math.max(-1, Math.min(1, callerBase + drift + (Math.random() * 0.15 - 0.075))).toFixed(3)),
      text: i % 2 === 0 ? (i === 0 ? c.intent.utterance.slice(0, 60) : pick(["I see, okay...", "That doesn't seem right", "Can you check again?", "How long will that take?", "Alright, thank you", "I was told something different before", "That's helpful, thanks"])) : pick(["Let me look into that for you", "I understand your concern", "Here's what I found in our system", "I can help you with that", "Let me verify that information", "Based on our records..."]),
    };
  });

  const issueTemplates = {
    IRS: ["Refund processing delay exceeding 21-day window", "Discrepancy between filed return and IRS records", "Missing W-2 documentation from employer", "Penalty assessment disputed by taxpayer", "Installment agreement eligibility question", "Notice received but not understood"],
    TreasuryDirect: ["Account locked after failed login attempts", "Bond redemption penalty period question", "Trust account documentation requirements", "1099-INT not received for tax year"],
    TOP: ["Offset applied from incorrect creditor agency", "Financial hardship documentation requirements", "Dispute deadline approaching", "Multiple agencies listed in offset"],
    USMint: ["Package shows delivered but not received", "Commemorative coin out of stock", "Shipping address correction needed"],
    DirectExpress: ["Unauthorized transaction reported", "Card replacement timeline concern", "PIN reset difficulty", "Balance discrepancy after deposit"],
  };
  const issuePool = issueTemplates[c.bureau.id] || issueTemplates.IRS;
  const issues = [
    { id: `ISS-${c.contactId.slice(0, 6)}`, text: issuePool[Math.floor(c.contactId.charCodeAt(2) % issuePool.length)], severity: c.features.intentComplexity > 0.5 ? "HIGH" : "MEDIUM", detectedAt: `Turn ${Math.min(2, turnCount)}`, source: "Transcribe Call Analytics" },
    ...(c.features.intentComplexity > 0.6 ? [{ id: `ISS-${c.contactId.slice(6, 12)}`, text: issuePool[(Math.floor(c.contactId.charCodeAt(3) % issuePool.length) + 1) % issuePool.length], severity: "LOW", detectedAt: `Turn ${Math.min(4, turnCount)}`, source: "Comprehend Entity Detection" }] : []),
  ];

  const actions = [
    { action: "Identity Verified", method: c.auth, status: c.policyResult === "ALLOWED" ? "COMPLETE" : "FAILED", timestamp: `+${Math.floor(c.authLatencyMs / 1000)}s` },
    { action: `Tool Call: ${c.intent.id}`, method: "Lambda Invocation", status: c.error?.code === "LAMBDA_TIMEOUT" ? "RETRY" : c.error?.code === "API_503" ? "FAILOVER" : "COMPLETE", timestamp: `+${Math.floor((c.authLatencyMs + c.toolLatencyMs) / 1000)}s` },
    { action: "KB Retrieval + Rerank", method: `${c.retrieved.length} docs, top=${c.rerankScores[0].toFixed(2)}`, status: c.error?.code === "KB_EMPTY" ? "EMPTY" : "COMPLETE", timestamp: `+${Math.floor((c.authLatencyMs + c.toolLatencyMs + c.kbLatencyMs) / 1000)}s` },
    { action: "Governance Pipeline", method: `AR=${c.arResult} Policy=${c.policyResult}`, status: c.arResult === "VALID" && c.policyResult === "ALLOWED" ? "PASSED" : "FLAG", timestamp: `+${Math.floor((c.authLatencyMs + c.toolLatencyMs + c.kbLatencyMs + 340) / 1000)}s` },
    ...(c.prediction !== "SELF_SERVICE" ? [{ action: c.routing?.callbackAccepted ? "Callback Scheduled" : "Agent Transfer", method: `Skill: ${c.routing?.skillId || "N/A"} Prof: P${c.routing?.requiredProficiency || "?"}`, status: "ROUTED", timestamp: `+${elapsed}s` }] : []),
  ];

  const outcomes = {
    resolution: c.prediction === "SELF_SERVICE" ? "SELF_SERVICE_CONTAINED" : c.routing?.callbackAccepted ? "CALLBACK_SCHEDULED" : "AGENT_TRANSFER",
    resolutionLabel: c.prediction === "SELF_SERVICE" ? "Self-Service Contained" : c.routing?.callbackAccepted ? "Callback Scheduled" : "Transferred to Agent",
    firstContactResolution: c.prediction === "SELF_SERVICE" && !c.error,
    handlingTimeSec: parseInt(elapsed) || jitter(45, 200),
    silencePercent: parseFloat((Math.random() * 8 + 2).toFixed(1)),
    interruptionCount: jitter(0, 3),
    speakingRate: { caller: jitter(120, 40), agent: jitter(130, 30) },
    nonTalkTimeSec: jitter(3, 12),
  };

  const csatBase = c.prediction === "SELF_SERVICE" ? 4.0 : c.prediction === "AT_RISK" ? 3.0 : 2.0;
  const csatAdj = (c.sentiment === "POSITIVE" ? 0.5 : c.sentiment === "VERY_NEGATIVE" ? -0.6 : c.sentiment === "NEGATIVE" ? -0.3 : 0) + (c.error ? -0.3 : 0) + (c.arResult === "VALID" ? 0.2 : -0.1);
  const predictedCSAT = parseFloat(Math.max(1.0, Math.min(5.0, csatBase + csatAdj + (Math.random() * 0.4 - 0.2))).toFixed(1));
  const csatConfidence = c.phase >= 5 ? jitter(82, 15) : jitter(55, 25);

  const recTemplates = {
    RefundStatus: [
      { trigger: "Caller asking about refund delay", rec: "IRS processes refunds within 21 days of e-filing acceptance. If > 21 days, check for holds: identity verification (TPP), income verification (PATH Act for EITC/ACTC filers), or error correction. Use tool treasury-refund-status to pull current processing stage.", source: "IRS-PUB-17-SEC4.2", arVerified: true, confidence: 0.94 },
      { trigger: "Caller mentions direct deposit not received", rec: "Verify banking details on file match. Common issues: bank rejected deposit (closed account, name mismatch), IRS offset applied. Check 'Where's My Refund' API for trace. If > 5 days past deposit date with valid bank info, initiate payment trace (Form 3911).", source: "IRS-REFUND-TRACE-GUIDE", arVerified: true, confidence: 0.91 },
    ],
    NoticeExplanation: [
      { trigger: "CP2000 proposed adjustment", rec: "CP2000 is NOT a bill — it's a proposed change. Verify the specific income discrepancy line by line with caller. Common sources: 1099-B brokerage trades, 1099-K payment platforms, 1099-NEC gig income. Caller has 30 days to respond. Help identify whether to agree, partially agree, or dispute with documentation.", source: "IRS-CP2000-GUIDE", arVerified: true, confidence: 0.96 },
    ],
    PaymentPlan: [
      { trigger: "Installment agreement eligibility", rec: "⚠ DECISION POINT: Balance determines plan type. Under $10K: guaranteed acceptance if filed all returns and no prior default in 5 years. $10K-$50K: streamlined (no financial statement). Over $50K: requires Form 433-A financial disclosure. AR-verified: use exact thresholds — do NOT approximate. Setup fee: $22 online direct debit, $107 phone/mail.", source: "IRS-FORM-9465", arVerified: true, confidence: 0.97 },
    ],
    PenaltyAbatement: [
      { trigger: "First-time penalty abatement request", rec: "⚠ DECISION POINT: FTA eligibility requires clean 3-year compliance history — no prior penalties for same tax type. Verify using tool treasury-get-penalty-details. If eligible, FTA removes failure-to-file AND failure-to-pay penalties (but NOT accuracy-related). If denied, reasonable cause is the next avenue (death, fire, disaster, bad professional advice).", source: "IRS-PENALTY-ABATE", arVerified: true, confidence: 0.93 },
    ],
    DisputeInitiation: [
      { trigger: "Offset dispute process", rec: "⚠ DECISION POINT: Disputes go to CREDITOR AGENCY, not BFS/TOP. Caller has 60 days from offset notification. Must demonstrate: debt not owed, amount incorrect, or identity error. Help identify correct creditor contact info. If hardship, different process — redirect to hardship exemption.", source: "TOP-DISPUTE", arVerified: true, confidence: 0.92 },
    ],
    HardshipExemption: [
      { trigger: "Hardship exemption documentation", rec: "⚠ HIGH-COMPLEXITY DECISION: Hardship requires proof that offset prevents meeting basic living expenses. Documentation: last 3 months income statements, rent/mortgage proof, utility bills, medical expenses. Creditor agency makes final determination. Processing: 30-60 days. Consider interim relief options if available.", source: "TOP-HARDSHIP-EXEMPT", arVerified: true, confidence: 0.89 },
    ],
    AccountUnlock: [
      { trigger: "TreasuryDirect locked account", rec: "3 failed login attempts triggers 24-hour lockout. If > 24hrs, manual unlock required. Verify identity via alternate method (not same one that failed). Reset sends temp password to email on file. If email inaccessible, mail-based reset takes 5-7 business days. Check for compromised account indicators.", source: "TD-UNLOCK-FAQ", arVerified: true, confidence: 0.90 },
    ],
    BondValue: [
      { trigger: "Series I bond value inquiry", rec: "Current composite rate: 5.27% (May-Oct 2025). Bonds < 5 years: 3-month interest penalty on redemption. Fixed rate set at purchase date does not change. Variable rate resets every 6 months. Use treasury-bond-value tool for exact current redemption value.", source: "TD-SERIES-I-RULES", arVerified: true, confidence: 0.96 },
    ],
    LostCard: [
      { trigger: "Card reported lost/stolen", rec: "IMMEDIATE: Deactivate card via treasury-report-lost-card. Check last 24hr transactions for fraud. Standard replacement: 5-7 business days (free). Expedited: 1-3 days ($13.50 fee). For emergency cash access: direct deposit advance possible at bank. File fraud dispute for any unauthorized transactions.", source: "DE-CARD-REPLACE", arVerified: true, confidence: 0.94 },
    ],
  };

  const recs = recTemplates[c.intent.id] || [
    { trigger: `${c.intent.id} inquiry detected`, rec: `Review ${c.bureau.id} policy for ${c.intent.id}. Use primary tool and cross-reference with knowledge base article. Verify response accuracy through Automated Reasoning before delivery. If caller sentiment degrades, offer live agent.`, source: c.retrieved[0] || "GENERAL-GUIDANCE", arVerified: c.arResult === "VALID", confidence: 0.82 },
  ];

  const agentDone = !isLive && c.agentInfo && c.agentState === "COMPLETE";
  const summary = (c.phase >= PHASES.length - 1 && (!c.agentInfo || agentDone)) ? {
    headline: c.prediction === "SELF_SERVICE"
      ? `${c.bureau.id} ${c.intent.id} inquiry successfully resolved via self-service. Citizen verified via ${c.auth}, tool executed in ${c.toolLatencyMs}ms, response grounded against ${c.retrieved.length} KB sources.`
      : `${c.bureau.id} ${c.intent.id} inquiry required ${c.routing?.callbackAccepted ? "scheduled callback" : "agent transfer"}. ${c.sentiment === "VERY_NEGATIVE" ? "Citizen expressed significant frustration. " : ""}Routed to ${c.routing?.skillId || "general"} queue (P${c.routing?.requiredProficiency || "?"}).`,
    topicsCovered: [`${c.intent.id.replace(/([A-Z])/g, " $1").trim()}`, "Identity Verification", "Policy Explanation", c.prediction !== "SELF_SERVICE" ? "Escalation Rationale" : "Self-Service Confirmation"].filter(Boolean),
    complianceNotes: `PII scan: ${Math.random() > 0.5 ? "SSN partial detected → REDACTED" : "Clean"}. AR verification: ${c.arResult}. Content filter: PASSED. AgentCore policy: ${c.policyResult}. All governance checks completed.`,
    agentPerformance: c.prediction !== "SELF_SERVICE" ? null : { empathyScore: jitter(78, 20), protocolCompliance: jitter(85, 14), resolutionEfficiency: jitter(80, 18) },
    followUp: c.prediction === "SELF_SERVICE" ? "None required" : c.routing?.callbackAccepted ? `Callback scheduled within ${c.routing.callbackEstMinutes} minutes to ${c.routing.skillId}` : `Monitor agent handle time and post-transfer CSAT for skill ${c.routing?.skillId || "N/A"}`,
  } : null;

  const insights = [
    { icon: "🧠", label: "Intent Complexity", text: c.features.intentComplexity > 0.6 ? `High-complexity intent (${(c.features.intentComplexity * 100).toFixed(0)}%) — consider proactive specialist routing for similar future contacts` : `Standard complexity (${(c.features.intentComplexity * 100).toFixed(0)}%) — strong self-service candidate for automation` },
    { icon: "📊", label: "Sentiment Trajectory", text: c.prediction === "SELF_SERVICE" ? "Sentiment stable/positive throughout. Self-service flow met citizen expectations." : c.sentiment === "VERY_NEGATIVE" ? "Significant sentiment deterioration detected. Early escalation trigger recommended for similar patterns." : "Mixed sentiment signals. Monitor for recovery or escalation triggers." },
    { icon: "🔍", label: "KB Effectiveness", text: c.rerankScores[0] > 0.88 ? `High-relevance KB match (${c.rerankScores[0].toFixed(2)}). Knowledge base content well-aligned with this intent.` : `Moderate KB relevance (${c.rerankScores[0].toFixed(2)}). Consider enriching KB with additional ${c.bureau.id} content for ${c.intent.id} queries.` },
    { icon: "⚡", label: "Latency Impact", text: c.toolLatencyMs > 2000 ? `Tool latency (${c.toolLatencyMs}ms) exceeded 2s threshold — contributed to escalation risk. Investigate ${c.bureau.id} API performance.` : `Tool latency within acceptable range (${c.toolLatencyMs}ms). No performance impact on citizen experience.` },
    ...(c.error ? [{ icon: "⚠️", label: "Error Impact", text: `${c.error.code} error detected during contact. Auto-remediation ${c.error.code === "LAMBDA_TIMEOUT" ? "retried successfully" : "applied"}. Monitor for recurring patterns across ${c.bureau.id} contacts.` }] : []),
    ...(c.routing?.isOrphaned ? [{ icon: "🚨", label: "Routing Gap", text: `ORPHANED CONTACT: Intent "${c.intent.id}" has no skill mapping. WFM team should create skill rule for this intent to prevent catch-all routing.` }] : []),
    { icon: "🎯", label: "Predicted CSAT", text: predictedCSAT >= 4.0 ? `High predicted CSAT (${predictedCSAT}/5.0, ${csatConfidence}% confidence). Interaction met or exceeded citizen expectations.` : predictedCSAT >= 3.0 ? `Moderate CSAT risk (${predictedCSAT}/5.0). ${c.prediction !== "SELF_SERVICE" ? "Agent should focus on empathy and efficient resolution." : "Self-service resolved but citizen may have preferred faster path."}` : `Low predicted CSAT (${predictedCSAT}/5.0). ${c.sentiment === "VERY_NEGATIVE" ? "Citizen frustration was high throughout." : "Multiple friction points impacted experience."} Post-contact survey recommended.` },
  ];

  return { primaryCat, secondaryCat, sentimentTimeline, issues, actions, outcomes, predictedCSAT, csatConfidence, recommendations: recs, summary, insights, isLive, elapsed };
}

// ─── RICH TEXT ANNOTATION ENGINE ─────────────────────────────────────
function renderAnnotatedText(text) {
  const patterns = [
    { re: /(\$[\d,]+\.?\d{0,2})/g, cls: "ent-money" },
    { re: /(●{2,}[\d●]*|●+)/g, cls: "ent-pii" },
    { re: /(\b(?:Form |IRS )?(?:1040-X|1040|1099-INT|1099-[A-Z]+|W-2|W-4|CP\d{3,4}[A-Z]?|LTR\s?\d+|433-[A-F]|9465|3911|12203|8822)\b)/gi, cls: "ent-form" },
    { re: /(\b\d{1,2}(?::\d{2})?\s?(?:AM|PM|am|pm)\b)/g, cls: "ent-time" },
    { re: /(\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)/gi, cls: "ent-date" },
    { re: /(\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b)/g, cls: "ent-date" },
    { re: /(\b\d+(?:\.\d+)?%\b)/g, cls: "ent-pct" },
    { re: /(\b(?:ending|last four|card)\s.*?(?:\d{4}|●+\d+)\b)/gi, cls: "ent-acct" },
    { re: /(\b1-\d{3}-\d{3}-\d{4}\b)/g, cls: "ent-phone" },
    { re: /(\b\d{1,3}[-–]\d{1,3}\s*(?:business\s+)?days?\b|\b\d{1,3}\s*(?:business\s+)?days?\b|\b\d{1,2}[-–]\d{1,2}\s*weeks?\b|\b\d{1,2}\s*(?:minutes?|hours?|months?|weeks?)\b)/gi, cls: "ent-dur" },
    { re: /(\b(?:SELF_SERVICE|ESCALATE|AT_RISK|ALLOWED|DENIED|VALID|INVALID|PASSED|FAILED|PRIORITY|ORPHANED|CALLBACK|CONTAINED)\b)/g, cls: "ent-status" },
    { re: /(\b(?:IRS|TOP|USMint|DirectExpress|TreasuryDirect)_\w+\b)/g, cls: "ent-skill" },
  ];
  const combined = patterns.map(p => p.re.source).join("|");
  const masterRe = new RegExp(`(${combined})`, "gi");
  const parts = text.split(masterRe).filter(Boolean);
  return parts.map((part, idx) => {
    for (const { re, cls } of patterns) {
      re.lastIndex = 0;
      if (re.test(part)) {
        re.lastIndex = 0;
        const styles = {
          "ent-money": { background: "#052e1680", color: "#34d399", borderRadius: 3, padding: "0 4px", fontWeight: 600, fontSize: "inherit" },
          "ent-pii": { background: "#450a0a80", color: "#f87171", borderRadius: 3, padding: "0 4px", fontWeight: 600, letterSpacing: 2, fontSize: "inherit" },
          "ent-form": { background: "#431a0480", color: "#fb923c", borderRadius: 3, padding: "0 4px", fontWeight: 700, fontSize: "inherit" },
          "ent-date": { background: "#172554a0", color: "#93c5fd", borderRadius: 3, padding: "0 4px", fontSize: "inherit" },
          "ent-time": { background: "#172554a0", color: "#93c5fd", borderRadius: 3, padding: "0 4px", fontSize: "inherit" },
          "ent-pct": { background: "#083344a0", color: "#22d3ee", borderRadius: 3, padding: "0 4px", fontWeight: 600, fontSize: "inherit" },
          "ent-acct": { background: "#2e1065a0", color: "#c4b5fd", borderRadius: 3, padding: "0 4px", fontSize: "inherit" },
          "ent-phone": { background: "#172554a0", color: "#60a5fa", borderRadius: 3, padding: "0 4px", fontSize: "inherit", fontWeight: 500 },
          "ent-dur": { background: "#422006a0", color: "#fbbf24", borderRadius: 3, padding: "0 4px", fontSize: "inherit" },
          "ent-status": { background: /SELF_SERVICE|ALLOWED|VALID|PASSED|CONTAINED/.test(part) ? "#052e1680" : /ESCALATE|DENIED|INVALID|FAILED|ORPHANED/.test(part) ? "#450a0a80" : "#42200680", color: /SELF_SERVICE|ALLOWED|VALID|PASSED|CONTAINED/.test(part) ? "#34d399" : /ESCALATE|DENIED|INVALID|FAILED|ORPHANED/.test(part) ? "#f87171" : "#fbbf24", borderRadius: 3, padding: "0 4px", fontWeight: 700, fontSize: "inherit", letterSpacing: 0.5 },
          "ent-skill": { background: "#2e1065a0", color: "#e879f9", borderRadius: 3, padding: "0 4px", fontWeight: 500, fontSize: "inherit" },
        };
        return <span key={idx} style={styles[cls] || {}}>{part}</span>;
      }
    }
    return <span key={idx}>{part}</span>;
  });
}

// ─── SEQUENCE DIAGRAM DATA GENERATOR ────────────────────────────────
function generateSequenceSteps(c) {
  if (!c) return [];
  const steps = [];
  let curPhase = "INIT";
  const s = (from, to, label, detail, color, dashed) => steps.push({ from, to, label, detail, color: color || C.textMuted, dashed: !!dashed, phase: curPhase });
  const ACTORS = { CZ: "Citizen", CF: "Connect\nFlow", NS: "ASR in\nConnect", AG: "AI\nAgent", LM: "Lambda", KB: "Knowledge\nBase", RR: "Rerank", GR: "Guard-\nrails", AR: "Automated\nReasoning", AP: "AgentCore\nPolicy", CL: "Contact\nLens", QM: "Queue\nMetrics", SB: "Skills\nRouter", LA: "Live\nAgent" };

  curPhase = "INIT";
  s("CZ", "CF", c.channel === "VOICE" ? "Inbound Call" : `${c.channel} Session`, `ANI: +1202555${jitter(1000,8999)} → DNIS: +18005551234`, C.blue);
  s("CF", "CF", "SetAttributes", `Bureau=${c.bureau.id} Channel=${c.channel}`, C.textDim);
  s("CF", "NS", "InitSession", `voice=${c.voice} lang=en-US`, C.purple);
  s("NS", "CZ", "Greeting Prompt", `"Thank you for calling ${c.bureau.name}..."`, C.purple);

  curPhase = "AUTH";
  s("CZ", "NS", "Auth Response", c.auth === "KBA_DTMF" ? "[DTMF: ●●●●#]" : "\"SSN last 4, DOB, ZIP\"", C.blue);
  s("NS", "CF", "Auth Data", `method=${c.auth}`, C.purple);
  s("CF", "AP", "Policy Check", `tool=validateIdentity`, C.accent);
  s("AP", "CF", c.policyResult, `eval=11ms rules=3`, c.policyResult === "ALLOWED" ? C.green : C.red);
  s("CF", "LM", "Invoke", `fn=treasury-identity-validate`, C.purple);
  s("LM", "CF", c.policyResult === "ALLOWED" ? "200 OK" : "401 Unauthorized", `duration=${c.authLatencyMs}ms`, c.policyResult === "ALLOWED" ? C.green : C.red);

  curPhase = "INTENT";
  s("CZ", "NS", "Utterance", `"${c.intent.utterance.slice(0, 45)}..."`, C.blue);
  s("NS", "AG", "Intent + Slots", `intent=${c.intent.id} conf=${jitter(89,10)}%`, C.cyan);
  s("AG", "AG", "Plan Actions", `"Parallel: tool call + KB query"`, C.cyan, true);

  curPhase = "TOOL";
  const toolN = `treasury-${c.intent.id.replace(/([A-Z])/g, m => "-" + m.toLowerCase()).slice(1)}`;
  s("AG", "AP", "Pre-authorize Tool", `tool=${toolN}`, C.accent);
  s("AP", "AG", c.policyResult, `bureau_match=${c.policyResult === "ALLOWED"} eval=7ms`, c.policyResult === "ALLOWED" ? C.green : C.red);
  if (c.policyResult === "ALLOWED") {
    s("AG", "LM", "Invoke Tool", `fn=${toolN}`, C.purple);
    if (c.error?.code === "LAMBDA_TIMEOUT") {
      s("LM", "AG", "TIMEOUT", `exceeded 10000ms`, C.red);
      s("AG", "LM", "Retry (backoff 2s)", `attempt 2/3`, C.yellow, true);
      s("LM", "AG", "200 OK (retry)", `duration=${jitter(800, 1200)}ms`, C.green);
    } else if (c.error?.code === "API_503") {
      s("LM", "AG", "503 Error", `upstream unavailable`, C.red);
      s("AG", "AG", "Circuit Breaker", `failover=READ_CACHE`, C.yellow, true);
    } else {
      s("LM", "AG", "200 OK + Data", `duration=${c.toolLatencyMs}ms`, C.green);
    }
  }

  curPhase = "RAG";
  s("AG", "KB", "Semantic Query", `"${c.intent.utterance.slice(0, 35)}..."`, C.green);
  s("KB", "AG", `${c.retrieved.length} Chunks`, `top_cosine=${(c.rerankScores[0] - 0.02).toFixed(3)}`, C.green);
  s("AG", "RR", "Rerank Request", `model=cohere.rerank-v3.5`, "#4ade80");
  s("RR", "AG", "Ranked Results", `top=${c.rerankScores[0].toFixed(3)} latency=${c.rerankLatencyMs}ms`, "#4ade80");

  curPhase = "GOVERN";
  s("AG", "GR", "Grounding Check", `threshold=0.70`, "#fb923c");
  s("GR", "AG", c.groundingScore > 0.7 ? "PASS" : "FLAG", `score=${c.groundingScore.toFixed(3)}`, c.groundingScore > 0.7 ? C.green : C.yellow);
  s("AG", "AR", "Verify Response", `policy=ar-${c.bureau.id.toLowerCase()}-v3`, "#f472b6");
  s("AR", "AG", c.arResult, `rules=47 vars=12 latency=340ms`, c.arResult === "VALID" ? C.green : c.arResult === "INVALID" ? C.red : C.yellow);
  if (c.arResult === "INVALID") {
    s("AG", "AG", "Correction Applied", `regenerate response`, C.yellow, true);
    s("AG", "AR", "Re-verify", `corrected response`, "#f472b6", true);
    s("AR", "AG", "VALID", `correction confirmed`, C.green);
  }
  s("AG", "GR", "PII + Content Scan", `guardrails: pii, topics, content`, "#fb923c");
  s("GR", "AG", "ALL PASSED", `pii=clean topics=ok injection=none`, C.green);
  s("AG", "NS", "Generate Response", `model=amazon.nova-pro-v1:0`, C.cyan);
  s("NS", "CZ", c.channel === "VOICE" ? "Speak Response" : "Send Message", `[AI-generated answer with KB citations]`, C.purple);

  curPhase = "PREDICT";
  s("CL", "AG", "Sentiment Update", `sentiment=${c.sentiment}`, c.sentiment === "VERY_NEGATIVE" ? C.red : c.sentiment === "NEGATIVE" ? C.yellow : C.green);
  s("AG", "AG", "Predict Outcome", `selfService=${(c.selfServiceProb*100).toFixed(0)}% risk=${(c.escalationRisk*100).toFixed(0)}%`, C.cyan, true);

  curPhase = "ROUTE";
  const qm = c.queueMetrics;
  const rt = c.routing;
  s("AG", "QM", "GetQueueMetrics", `queue=${qm.queueName}`, "#f9a8d4");
  s("QM", "AG", "Metrics Snapshot", `depth=${qm.depth} avail=${qm.availableAgents} SL=${qm.serviceLevel}% abandon=${qm.abandonmentRate}%`, "#f9a8d4");
  s("AG", "QM", "GetAgentProficiency", `bySkill=${c.bureau.id}`, "#f9a8d4");
  s("QM", "AG", "Prof Distribution", `P1=${qm.agentsByProficiency[1]} P2=${qm.agentsByProficiency[2]} P3=${qm.agentsByProficiency[3]} P4=${qm.agentsByProficiency[4]}`, "#f9a8d4");

  if (c.prediction === "SELF_SERVICE") {
    s("AG", "AG", "Route: CONTAINED", `queue pressure noted but self-service succeeding`, C.green, true);
    s("NS", "CZ", "Resolution", `"Is there anything else I can help with?"`, C.green);
    s("CZ", "NS", "Goodbye", `"No, that's all. Thank you."`, C.blue);
  } else {
    s("AG", "SB", "FindSkillMatch", `intent=${c.intent.id}`, "#e879f9");
    if (rt?.isOrphaned) {
      s("SB", "AG", "NO MATCH ⚠", `ORPHANED — no skill maps to intent`, C.red);
      s("AG", "SB", "Fallback: Catch-All", `skill=GENERAL_INQUIRY minProf=3`, C.yellow, true);
    } else {
      s("SB", "AG", `Matched: ${rt?.skillId || "?"}`, `label="${rt?.skillLabel || "?"}"`, "#e879f9");
    }
    s("AG", "SB", "ProficiencyEval", `complexity=${(c.features.intentComplexity*100).toFixed(0)}% sentiment=${c.sentiment}`, "#e879f9");
    s("SB", "AG", `Required: P${rt?.requiredProficiency || "?"}`, `${rt?.requiredProfLabel || ""} │ qualified=${rt?.availableAtProf || 0}`, rt?.availableAtProf > 0 ? "#e879f9" : C.red);
    if (rt?.offerCallback) {
      s("AG", "QM", "Callback Check", `depth=${qm.depth} oldest=${qm.oldestContactSec}s profAvail=${rt.availableAtProf}`, "#f9a8d4");
      s("QM", "AG", "OFFER CALLBACK", `est=${rt.callbackEstMinutes}min cbQueue=${qm.callbackQueueDepth}`, C.yellow);
      s("NS", "CZ", "Callback Offer", `"Current wait is high. Shall I schedule a callback?"`, C.yellow);
      if (rt.callbackAccepted) {
        s("CZ", "NS", "Accept Callback", `"Yes, please call me back"`, C.blue);
        s("AG", "CF", "ScheduleCallback", `pos=${qm.callbackQueueDepth+1} est=${rt.callbackEstMinutes}min`, C.green);
        s("CF", "CF", "CALLBACK_QUEUED", `skill=${rt.skillId} prof=${rt.requiredProficiency}`, C.green);
      } else {
        s("CZ", "NS", "Decline Callback", `"No, I'll wait"`, C.blue);
      }
    }
    if (!rt?.callbackAccepted) {
      if (rt?.priorityBoost) {
        s("AG", "SB", "Priority Boost", `reason=${c.sentiment === "VERY_NEGATIVE" ? "SENTIMENT" : "COMPLEXITY"}`, C.red);
        s("SB", "CF", "PRIORITY Routing", `queue=${qm.queueName} pos=1 skill=${rt?.skillId}`, C.red);
      } else {
        s("AG", "CF", "Standard Routing", `queue=${qm.queueName} est=${rt?.estimatedWaitSec}s`, C.yellow);
      }
      s("CF", "CF", "TransferToQueue", `priority=${rt?.finalPriority} prof≥${rt?.requiredProficiency}`, C.red);
      s("NS", "CZ", "Transfer Msg", `"Connecting you with a ${rt?.requiredProfLabel || ""} specialist..."`, C.yellow);
    }
  }

  curPhase = "RESOLVE";
  if (c.prediction === "SELF_SERVICE") s("CF", "CF", "SELF_SERVICE_COMPLETE", `outcome=CONTAINED`, C.green);
  s("AG", "CF", "PostContactSummary", `model=amazon.nova-pro-v1:0 case=${c.prediction !== "SELF_SERVICE" ? "created" : "none"}`, C.cyan);

  if (c.agentInfo && !c.routing?.callbackAccepted) {
    curPhase = "AGENT_TRANSFERRING";
    s("CF", "LA", "Transfer Contact", `agent=${c.agentInfo.name} skill=${rt?.skillId}`, "#e879f9");
    s("CF", "LA", "Screen Pop", `AI transcript + KB recs + AR results + case history`, "#e879f9");
    s("LA", "LA", "Accept Transfer", `queueWait=${c.agentInfo.queueWaitSec}s`, "#e879f9");

    curPhase = "AGENT_CONNECTED";
    s("LA", "CZ", "Warm Greeting", `"Hi, I've reviewed your conversation..."`, "#e879f9");
    s("CZ", "LA", "Confirm Context", `"That's right, the automated system couldn't resolve it"`, C.blue);
    s("AG", "LA", "Agent Assist Push", `KB: ${c.retrieved[0] || "N/A"} rerank=${c.rerankScores[0]?.toFixed(2)} AR=${c.arResult}`, "#c084fc");

    curPhase = "AGENT_HANDLING";
    s("LA", "LM", "Tool Lookup", `fn=treasury-${c.intent.id.replace(/([A-Z])/g, m => "-" + m.toLowerCase()).slice(1)}`, C.purple);
    s("LM", "LA", "200 OK + Details", `additional data for agent investigation`, C.green);
    s("LA", "CZ", "Investigation", `Agent applies expertise + AI recommendations`, "#e879f9");
    s("CZ", "LA", "Citizen Response", `Provides additional context`, C.blue);
    s("CL", "LA", "Quality Metrics", `empathy=detected talk_over=0 pace=${jitter(120,30)}wpm`, "#fda4af");
    s("LA", "CZ", "Resolution", `Agent resolves issue with policy guidance`, "#e879f9");
    s("CZ", "LA", "Confirm", `"Thank you, that's exactly what I needed"`, C.blue);

    curPhase = "AGENT_WRAPPING";
    s("LA", "LA", "Wrap-Up", `disposition=RESOLVED ACW started`, "#e879f9");
    s("LA", "CF", "Save Case Notes", `case notes + follow-up=${c.intent.id === "HardshipExemption" ? "30d check-in" : "none"}`, "#e879f9");
    s("CF", "CZ", "CSAT Survey", `post-interaction survey sent`, C.textDim);

    curPhase = "AGENT_COMPLETE";
    s("LA", "CF", "Agent Complete", `handle=${c.agentInfo.handleTimeSec}s disposition=RESOLVED`, C.green);
    s("CF", "CF", "AGENT_RESOLVED", `total_time=AI+${c.agentInfo.handleTimeSec}s FCR=YES`, C.green);
  }

  return { steps, actors: Object.entries(ACTORS) };
}

// ─── COLOR SYSTEM ───────────────────────────────────────────────────
const C = {
  bg: "#080b10", panel: "#0c1018", card: "#111822", border: "#1a2332", borderLight: "#243040",
  text: "#c8d3e0", textMuted: "#6b7a8d", textDim: "#3d4d60", accent: "#e8983e", accentDim: "#8b5a24",
  blue: "#4a9eff", purple: "#a78bfa", green: "#34d399", yellow: "#fbbf24", red: "#f87171", cyan: "#22d3ee",
  logInfo: "#6b7a8d", logWarn: "#fbbf24", logError: "#f87171",
};
const predC = (p) => p === "SELF_SERVICE" ? C.green : p === "AT_RISK" ? C.yellow : C.red;
const SEQ_ACTOR_COLORS = { CZ: C.blue, CF: "#7dd3fc", NS: C.purple, AG: C.cyan, LM: "#c084fc", KB: C.green, RR: "#4ade80", GR: "#fb923c", AR: "#f472b6", AP: C.accent, CL: "#fda4af", QM: "#f9a8d4", SB: "#e879f9", LA: "#e879f9" };
const SEQ_COL_W = 76;

// ─── MAIN COMPONENT ─────────────────────────────────────────────────
export default function FlowOpsCenter() {
  const [contacts, setContacts] = useState([]);
  const [selId, setSelId] = useState(null);
  const [globalLogs, setGlobalLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, contained: 0, escalated: 0, atRisk: 0, errors: 0, byBureau: {} });
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [tab, setTab] = useState("logs");
  const [logFilter, setLogFilter] = useState("ALL");
  const [showTranscript, setShowTranscript] = useState(false);
  const [txTab, setTxTab] = useState("dialog");
  const [demoMode, setDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoReady, setDemoReady] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const logEndRef = useRef(null);
  const spawnRef = useRef(null);
  const tickRef = useRef(null);
  const seqEndRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [globalLogs.length]);
  useEffect(() => { if (demoMode && tab === "sequence") setTimeout(() => seqEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }, [demoStep, tab, demoMode]);

  // WebSocket connection to real backend
  useEffect(() => {
    const ws = new WebSocket('wss://ibmbl856zi.execute-api.us-east-1.amazonaws.com/prod');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Connected to real backend');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 Received:', data);
      if (data.type === 'contact') {
        handleRealContact(data);
      }
    };

    ws.onerror = (err) => console.error('WebSocket error:', err);
    ws.onclose = () => {
      console.log('Disconnected from backend');
      setWsConnected(false);
    };

    return () => ws.close();
  }, []);

  const handleRealContact = (contact) => {
    setContacts(prev => [contact, ...prev].slice(0, 20));
    if (!selId) setSelId(contact.contactId);
    setStats(s => ({ ...s, total: s.total + 1 }));
  };

  const spawnContact = useCallback(async () => {
    const c = createContact();
    
    // Call real agent
    try {
      const response = await fetch('http://localhost:3001/api/invoke-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bureau: c.bureau.id,
          message: c.intent.utterance,
          sessionId: c.contactId
        })
      });
      
      const data = await response.json();
      c.agentResponse = data.response;
      c.latency = data.latency;
      c.realBackend = true;
    } catch (error) {
      console.error('Failed to invoke real agent:', error);
      c.agentResponse = 'Error: Could not reach backend';
      c.realBackend = false;
    }
    
    c.logs = generatePhaseLogs(c, 0);
    setContacts(prev => {
      const next = [c, ...prev].slice(0, 20);
      if (!selId) setSelId(c.contactId);
      return next;
    });
    setGlobalLogs(prev => [...prev, ...c.logs].slice(-600));
    setStats(s => ({ ...s, total: s.total + 1, byBureau: { ...s.byBureau, [c.bureau.id]: (s.byBureau[c.bureau.id] || 0) + 1 } }));
  }, [selId]);

  const tick = useCallback(() => {
    setContacts(prev => {
      const next = prev.map(c => {
        if (c.phase >= PHASES.length - 1 && c.agentInfo && c.agentState !== "COMPLETE") {
          const curIdx = c.agentState ? AGENT_STATES.indexOf(c.agentState) : -1;
          const nextIdx = curIdx + 1;
          if (nextIdx < AGENT_STATES.length) {
            const nextState = AGENT_STATES[nextIdx];
            const newLogs = [];
            const log = (lvl, act, det) => newLogs.push({ ts: now(), level: lvl, action: act, detail: det, contactId: c.contactId, bureau: c.bureau.id });
            if (nextState === "TRANSFERRING") log("INFO", "AgentTransfer", `Transferring to ${c.agentInfo.name} (${c.agentInfo.id}) │ Skill: ${c.routing?.skillId} │ Prof: P${c.agentInfo.prof} │ Queue wait: ${c.agentInfo.queueWaitSec}s`);
            else if (nextState === "CONNECTED") log("INFO", "AgentConnected", `Agent ${c.agentInfo.name} connected │ Screen pop delivered: ContactProfile, SelfServiceTranscript, AIRecommendations │ Agent assist: ACTIVE`);
            else if (nextState === "HANDLING") {
              log("INFO", "AgentHandling", `Agent ${c.agentInfo.name} actively handling │ Contact Lens: sentiment=${c.sentiment} talk-over=0 empathy=detected`);
              log("INFO", "AgentAssistPush", `Recommendation pushed to agent desktop: KB=${c.retrieved[0] || "N/A"} rerank=${c.rerankScores[0]?.toFixed(2)} AR=${c.arResult}`);
            } else if (nextState === "WRAPPING") log("INFO", "AgentWrapUp", `Agent ${c.agentInfo.name} in wrap-up │ Disposition: RESOLVED │ ACW started │ Case notes: saving`);
            else if (nextState === "COMPLETE") log("INFO", "AgentComplete", `Agent handle complete │ Handle time: ${c.agentInfo.handleTimeSec}s │ Disposition: RESOLVED │ CSAT survey: sent │ Follow-up: ${c.intent.id === "HardshipExemption" ? "30-day check-in" : "none"}`);
            const transcript = nextState === "CONNECTED" ? generateAgentTranscript(c) : c.agentTranscript;
            setGlobalLogs(p => [...p, ...newLogs].slice(-600));
            return { ...c, agentState: nextState, agentTranscript: transcript || c.agentTranscript, logs: [...c.logs, ...newLogs] };
          }
          return c;
        }
        if (c.phase >= PHASES.length - 1) return c;
        const nextPhase = c.phase + 1;
        const newLogs = generatePhaseLogs(c, nextPhase);
        const updated = { ...c, phase: nextPhase, phaseLabel: PHASES[nextPhase].id, logs: [...c.logs, ...newLogs] };
        setGlobalLogs(p => [...p, ...newLogs].slice(-600));
        if (nextPhase === PHASES.length - 1) {
          setStats(s => ({
            ...s,
            contained: s.contained + (updated.prediction === "SELF_SERVICE" ? 1 : 0),
            escalated: s.escalated + (updated.prediction === "ESCALATE" ? 1 : 0),
            atRisk: s.atRisk + (updated.prediction === "AT_RISK" ? 1 : 0),
            errors: s.errors + (updated.error ? 1 : 0),
          }));
        }
        return updated;
      });
      return next;
    });
  }, []);

  const start = () => {
    setRunning(true);
    spawnContact();
    spawnRef.current = setInterval(spawnContact, Math.max(5000 / speed, 2000));
    tickRef.current = setInterval(tick, Math.max(1800 / speed, 500));
  };
  const stop = () => {
    setRunning(false);
    clearInterval(spawnRef.current);
    clearInterval(tickRef.current);
  };

  const startDemo = () => {
    stop();
    setContacts([]); setGlobalLogs([]);
    setStats({ total: 0, contained: 0, escalated: 0, atRisk: 0, errors: 0, byBureau: {} });
    setShowTranscript(false);
    const c = createContact();
    c.logs = generatePhaseLogs(c, 0);
    setContacts([c]); setSelId(c.contactId); setGlobalLogs(c.logs);
    setStats({ total: 1, contained: 0, escalated: 0, atRisk: 0, errors: 0, byBureau: { [c.bureau.id]: 1 } });
    setDemoMode(true); setDemoStep(0); setDemoReady(true);
    setTab("logs");
  };

  const advanceDemo = () => {
    setDemoReady(false);
    setContacts(prev => {
      const c = prev[0];
      if (!c) return prev;
      const aiPhasesTotal = PHASES.length;
      const isAIPhase = demoStep < aiPhasesTotal - 1;
      const isResolvePhase = demoStep === aiPhasesTotal - 1;
      const isAgentStep = demoStep >= aiPhasesTotal;

      if (isAIPhase) {
        const nextPhase = c.phase + 1;
        if (nextPhase >= PHASES.length) return prev;
        const newLogs = generatePhaseLogs(c, nextPhase);
        const updated = { ...c, phase: nextPhase, phaseLabel: PHASES[nextPhase].id, logs: [...c.logs, ...newLogs] };
        setGlobalLogs(p => [...p, ...newLogs].slice(-600));
        if (nextPhase === PHASES.length - 1) {
          setStats(s => ({ ...s, contained: s.contained + (updated.prediction === "SELF_SERVICE" ? 1 : 0), escalated: s.escalated + (updated.prediction === "ESCALATE" ? 1 : 0), atRisk: s.atRisk + (updated.prediction === "AT_RISK" ? 1 : 0), errors: s.errors + (updated.error ? 1 : 0) }));
        }
        const narr = DEMO_NARRATION[PHASES[nextPhase]?.id];
        if (narr?.tab) setTab(narr.tab);
        setTimeout(() => { setDemoStep(ds => ds + 1); setDemoReady(true); }, 600);
        return [updated];
      }

      if (isResolvePhase && c.agentInfo && !c.routing?.callbackAccepted) {
        const newLogs = [];
        const log = (lvl, act, det) => newLogs.push({ ts: now(), level: lvl, action: act, detail: det, contactId: c.contactId, bureau: c.bureau.id });
        log("INFO", "AgentTransfer", `Transferring to ${c.agentInfo.name} (${c.agentInfo.id}) │ Skill: ${c.routing?.skillId} │ Prof: P${c.agentInfo.prof}`);
        setGlobalLogs(p => [...p, ...newLogs].slice(-600));
        const updated = { ...c, agentState: "TRANSFERRING", logs: [...c.logs, ...newLogs] };
        setTab("analytics");
        setTimeout(() => { setDemoStep(ds => ds + 1); setDemoReady(true); }, 600);
        return [updated];
      }

      if (isAgentStep && c.agentInfo) {
        const agentStepIdx = demoStep - aiPhasesTotal;
        const nextAgentIdx = agentStepIdx + 1;
        if (nextAgentIdx >= AGENT_STATES.length) { setDemoReady(true); return prev; }
        const nextState = AGENT_STATES[nextAgentIdx];
        const newLogs = [];
        const log = (lvl, act, det) => newLogs.push({ ts: now(), level: lvl, action: act, detail: det, contactId: c.contactId, bureau: c.bureau.id });
        if (nextState === "CONNECTED") log("INFO", "AgentConnected", `Agent ${c.agentInfo.name} connected │ Screen pop delivered`);
        else if (nextState === "HANDLING") { log("INFO", "AgentHandling", `Agent ${c.agentInfo.name} actively handling │ Contact Lens: sentiment=${c.sentiment}`); log("INFO", "AgentAssistPush", `Recommendation pushed: KB=${c.retrieved[0] || "N/A"} AR=${c.arResult}`); }
        else if (nextState === "WRAPPING") log("INFO", "AgentWrapUp", `Agent ${c.agentInfo.name} wrap-up │ Disposition: RESOLVED │ ACW started`);
        else if (nextState === "COMPLETE") log("INFO", "AgentComplete", `Agent handle complete │ Handle time: ${c.agentInfo.handleTimeSec}s │ CSAT survey: sent`);
        const transcript = nextState === "CONNECTED" ? generateAgentTranscript(c) : c.agentTranscript;
        setGlobalLogs(p => [...p, ...newLogs].slice(-600));
        const updated = { ...c, agentState: nextState, agentTranscript: transcript || c.agentTranscript, logs: [...c.logs, ...newLogs] };
        const narrKey = `AGENT_${nextState}`;
        const narr = DEMO_NARRATION[narrKey];
        if (narr?.tab) setTab(narr.tab);
        setTimeout(() => { setDemoStep(ds => ds + 1); setDemoReady(true); }, 600);
        return [updated];
      }

      setDemoReady(true);
      return prev;
    });
  };

  const endDemo = () => { setDemoMode(false); setDemoStep(0); setDemoReady(false); };

  const getDemoNarration = () => {
    if (!demoMode) return null;
    const c = contacts[0];
    if (!c) return null;
    const aiPhasesTotal = PHASES.length;
    if (demoStep < aiPhasesTotal) return DEMO_NARRATION[PHASES[demoStep]?.id] || null;
    const agentStepIdx = demoStep - aiPhasesTotal;
    if (agentStepIdx >= 0 && agentStepIdx < AGENT_STATES.length) return DEMO_NARRATION[`AGENT_${AGENT_STATES[agentStepIdx]}`] || null;
    return null;
  };

  const isDemoComplete = () => {
    if (!demoMode) return false;
    const c = contacts[0];
    if (!c) return false;
    if (c.prediction === "SELF_SERVICE" && demoStep >= PHASES.length - 1) return true;
    if (c.routing?.callbackAccepted && demoStep >= PHASES.length - 1) return true;
    if (c.agentInfo && c.agentState === "COMPLETE") return true;
    return false;
  };

  const getVisiblePhases = () => {
    if (!demoMode) return null;
    const visible = new Set();
    const aiPhasesTotal = PHASES.length;
    for (let i = 0; i <= Math.min(demoStep, aiPhasesTotal - 1); i++) visible.add(PHASES[i].id);
    if (demoStep >= aiPhasesTotal) {
      const agentStepsDone = demoStep - aiPhasesTotal + 1;
      for (let i = 0; i < Math.min(agentStepsDone, AGENT_STATES.length); i++) visible.add(`AGENT_${AGENT_STATES[i]}`);
    }
    return visible;
  };

  const getNewestPhase = () => {
    if (!demoMode) return null;
    const aiPhasesTotal = PHASES.length;
    if (demoStep < aiPhasesTotal) return PHASES[demoStep].id;
    const agentIdx = demoStep - aiPhasesTotal;
    if (agentIdx >= 0 && agentIdx < AGENT_STATES.length) return `AGENT_${AGENT_STATES[agentIdx]}`;
    return null;
  };

  useEffect(() => () => { clearInterval(spawnRef.current); clearInterval(tickRef.current); }, []);

  const sel = contacts.find(c => c.contactId === selId);
  const displayLogs = (tab === "logs" ? (sel ? sel.logs : globalLogs) : []).filter(l => logFilter === "ALL" || l.action.includes(logFilter) || l.level === logFilter);
  const containRate = stats.total > 0 ? ((stats.contained / (stats.contained + stats.escalated + stats.atRisk || 1)) * 100).toFixed(1) : "—";

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", background: C.bg, color: C.text, height: "100vh", fontSize: 11, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ background: `linear-gradient(90deg, ${C.panel}, ${C.card}, ${C.panel})`, borderBottom: `1px solid ${C.border}`, padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: running ? C.green : C.textDim, boxShadow: running ? `0 0 8px ${C.green}` : "none", animation: running ? "pulse 2s infinite" : "none" }} />
          <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8edf3", letterSpacing: 0.3 }}>AMAZON CONNECT</span>
          <span style={{ color: C.accent, fontWeight: 600, fontSize: 12, letterSpacing: 0.5 }}>FLOW OPERATIONS CENTER</span>
          <span style={{ color: C.textDim, fontSize: 10 }}>│ U.S. Treasury │ FedRAMP Moderate │ us-east-1</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: C.textMuted, fontSize: 10 }}>{now()}</span>
          <select value={speed} onChange={e => setSpeed(Number(e.target.value))} disabled={demoMode} style={{ background: C.card, color: demoMode ? C.textDim : C.text, border: `1px solid ${C.border}`, borderRadius: 3, padding: "2px 6px", fontSize: 10, fontFamily: "inherit", opacity: demoMode ? 0.4 : 1 }}>
            <option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option>
          </select>
          <button onClick={running ? stop : start} disabled={demoMode} style={{ background: demoMode ? C.card : running ? "#7f1d1d" : "#14532d", color: demoMode ? C.textDim : running ? C.red : C.green, border: `1px solid ${demoMode ? C.border : running ? "#991b1b" : "#166534"}`, borderRadius: 4, padding: "4px 14px", fontSize: 11, fontWeight: 600, cursor: demoMode ? "default" : "pointer", fontFamily: "inherit", letterSpacing: 0.5, opacity: demoMode ? 0.4 : 1 }}>
            {running ? "■ STOP" : "▶ START"}
          </button>
          {!demoMode ? (
            <button onClick={startDemo} style={{ background: "linear-gradient(135deg, #1a0a2e, #0f1a2e)", color: "#e879f9", border: "1px solid #e879f940", borderRadius: 4, padding: "4px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5 }}>
              🎯 GUIDED DEMO
            </button>
          ) : (
            <button onClick={endDemo} style={{ background: "#450a0a", color: C.red, border: "1px solid #991b1b", borderRadius: 4, padding: "4px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5 }}>
              ✕ EXIT DEMO
            </button>
          )}
        </div>
      </div>

      {demoMode && (
        <div style={{ background: "linear-gradient(90deg, #1a0a2e, #0f1a2e, #1a0a2e)", borderBottom: `1px solid ${C.accent}40`, padding: "6px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 14 }}>🎯</span>
          <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: 12, color: C.accent, letterSpacing: 0.5 }}>GUIDED WALKTHROUGH</span>
          <span style={{ fontSize: 10, color: C.textMuted }}>│ Single interaction stepping through the complete Amazon Connect AI pipeline │ Click "Continue" in the bottom panel to advance</span>
        </div>
      )}

      {/* METRICS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 1, background: C.border, flexShrink: 0 }}>
        {[
          { l: "IN AI", v: contacts.filter(c => c.phase < PHASES.length - 1).length, c: C.blue },
          { l: "WITH AGENT", v: contacts.filter(c => c.agentInfo && c.agentState && c.agentState !== "COMPLETE").length, c: "#e879f9" },
          { l: "CONTAINED", v: stats.contained, c: C.green },
          { l: "AT RISK", v: stats.atRisk, c: C.yellow },
          { l: "ESCALATED", v: stats.escalated, c: C.red },
          { l: "CONTAINMENT", v: containRate + "%", c: parseFloat(containRate) > 65 ? C.green : C.yellow },
          { l: "PROCESSED", v: stats.contained + stats.escalated + stats.atRisk, c: C.text },
          { l: "ERRORS", v: stats.errors, c: stats.errors > 0 ? C.red : C.green },
        ].map((m, i) => (
          <div key={i} style={{ background: C.bg, padding: "8px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 1.2, marginBottom: 3 }}>{m.l}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: m.c, fontFamily: "'IBM Plex Sans', sans-serif" }}>{m.v}</div>
          </div>
        ))}
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 320px", flex: 1, overflow: "hidden" }}>

        {/* LEFT: CONTACTS */}
        <div style={{ borderRight: `1px solid ${C.border}`, overflowY: "auto", background: C.bg }}>
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, fontSize: 9, color: C.textMuted, fontWeight: 600, letterSpacing: 1.5 }}>INTERACTIONS ({contacts.length})</div>
          {contacts.map(c => {
            const inAI = c.phase < PHASES.length - 1;
            const isContained = !inAI && c.prediction === "SELF_SERVICE";
            const withAgent = !inAI && c.agentInfo && c.agentState && c.agentState !== "COMPLETE";
            const agentDone = !inAI && c.agentInfo && c.agentState === "COMPLETE";
            const isCallback = !inAI && c.routing?.callbackAccepted;
            const pc = predC(c.prediction);
            const borderColor = withAgent ? "#e879f9" : isContained ? C.green : isCallback ? C.yellow : agentDone ? C.purple : pc;
            return (
              <div key={c.contactId} onClick={() => setSelId(c.contactId)} style={{ padding: "8px 10px", borderBottom: `1px solid ${C.panel}`, cursor: "pointer", background: selId === c.contactId ? C.card : "transparent", borderLeft: selId === c.contactId ? `2px solid ${borderColor}` : `2px solid transparent`, transition: "all 0.15s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {withAgent && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#e879f9", boxShadow: "0 0 6px #e879f9", animation: "pulse 1.5s infinite" }} />}
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#dce4ed" }}>{c.bureau.id}</span>
                  </div>
                  <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 2, fontWeight: 700, letterSpacing: 0.5, background: c.prediction === "SELF_SERVICE" ? "#052e16" : c.prediction === "AT_RISK" ? "#422006" : "#450a0a", color: pc }}>{c.prediction.replace("_", " ")}</span>
                </div>
                <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 3 }}>{c.intent.id} · {c.channel}{withAgent ? ` · ${c.agentInfo.name.split(" ")[0]}` : ""}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {inAI ? (
                    <>
                      <div style={{ flex: 1, background: C.border, borderRadius: 1, height: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${((c.phase + 1) / PHASES.length) * 100}%`, background: pc, transition: "width 0.4s" }} />
                      </div>
                      <span style={{ fontSize: 8, color: C.textDim, minWidth: 40 }}>{PHASES[c.phase]?.id}</span>
                    </>
                  ) : withAgent ? (
                    <>
                      <div style={{ flex: 1, background: C.border, borderRadius: 1, height: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${((AGENT_STATES.indexOf(c.agentState) + 1) / AGENT_STATES.length) * 100}%`, background: "#e879f9", transition: "width 0.4s" }} />
                      </div>
                      <span style={{ fontSize: 8, color: "#e879f9", fontWeight: 600, minWidth: 50 }}>👤 {c.agentState}</span>
                    </>
                  ) : isCallback ? (
                    <>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 3 }}>
                        <span style={{ fontSize: 9 }}>⏱</span>
                        <span style={{ fontSize: 8, color: C.yellow, fontWeight: 600 }}>~{c.routing.callbackEstMinutes}min</span>
                      </div>
                      <span style={{ fontSize: 8, color: C.yellow, fontWeight: 500 }}>CALLBACK</span>
                    </>
                  ) : (
                    <>
                      <div style={{ flex: 1, background: C.border, borderRadius: 1, height: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: "100%", background: isContained ? C.green : agentDone ? C.purple : C.textDim }} />
                      </div>
                      <span style={{ fontSize: 8, color: isContained ? C.green : agentDone ? C.purple : C.textDim, fontWeight: 600, minWidth: 55 }}>{isContained ? "✓ DONE" : agentDone ? "✓ AGENT" : "DONE"}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {contacts.length === 0 && <div style={{ padding: 24, textAlign: "center", color: C.textDim, fontSize: 10 }}>Press START to begin</div>}
        </div>

        {/* CENTER: TABS */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.panel, flexShrink: 0 }}>
            {[
              { id: "logs", label: "CloudWatch Logs" },
              { id: "analytics", label: sel && sel.phase >= PHASES.length - 1 && sel.agentState && sel.agentState !== "COMPLETE" ? `Agent: ${sel.agentState}` : sel && sel.phase >= PHASES.length - 1 ? "Post-Call Analytics" : "Live Analytics" },
              { id: "agent", label: "AI Agent" },
              { id: "rag", label: "RAG + Rerank" },
              { id: "governance", label: "Governance" },
              { id: "routing", label: "Routing" },
              { id: "sequence", label: demoMode ? `Sequence (${demoStep + 1}/${PHASES.length}${contacts[0]?.agentInfo && !contacts[0]?.routing?.callbackAccepted ? "+" + AGENT_STATES.length : ""})` : "Sequence" },
              { id: "errors", label: `Errors${stats.errors > 0 ? ` (${stats.errors})` : ""}` },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "7px 14px", fontSize: 10, fontWeight: tab === t.id ? 600 : 400, cursor: "pointer", fontFamily: "inherit", background: tab === t.id ? C.bg : "transparent", color: tab === t.id ? "#e8edf3" : C.textMuted, border: "none", borderBottom: tab === t.id ? `2px solid ${C.accent}` : "2px solid transparent", letterSpacing: 0.6, textTransform: "uppercase" }}>
                {t.label}
              </button>
            ))}
            {tab === "logs" && (
              <select value={logFilter} onChange={e => setLogFilter(e.target.value)} style={{ marginLeft: "auto", marginRight: 10, background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 3, padding: "1px 6px", fontSize: 9, fontFamily: "inherit", alignSelf: "center" }}>
                {["ALL","ContactFlowEvent","SetAttributes","InvokeLambda","AgentCorePolicy","AutomatedReasoning","BedrockKnowledgeBase","BedrockRerank","BedrockGuardrails","ContextualGrounding","AIAgentOrchestrator","PredictionFeatures","QueueMetricsSnapshot","QueueAgentProficiency","SkillsBasedRouting","ProficiencyRouting","CallbackEvaluation","CallbackScheduled","PriorityRouting","RoutingDecision","OrphanedContact","TransferToQueue","AgentTransfer","AgentConnected","AgentHandling","AgentAssistPush","AgentWrapUp","AgentComplete","Error","AutoRemediation"].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", fontSize: 10.5 }}>

            {/* LOGS TAB */}
            {tab === "logs" && (
              <div style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {displayLogs.map((l, i) => {
                  const lc = l.level === "ERROR" ? C.logError : l.level === "WARN" ? C.logWarn : C.logInfo;
                  const ac = { ContactFlowEvent: C.blue, SetAttributes: C.textMuted, InvokeLambda: C.purple, AgentCorePolicy: C.accent, AutomatedReasoning: "#f472b6", BedrockGuardrails: "#fb923c", BedrockKnowledgeBase: C.green, BedrockRerank: "#4ade80", ContextualGrounding: "#a78bfa", AIAgentOrchestrator: C.red, PredictionFeatures: C.cyan, PredictionReasoning: C.cyan, TransferToQueue: C.red, PostContactSummary: C.blue, Error: C.red, AutoRemediation: C.yellow, PolicyDeny: C.red, ARProof: "#f472b6", KBChunkRetrieved: "#4ade80", RerankResult: "#4ade80", GetCustomerInput: "#c084fc", InvokeModule: "#7dd3fc", QueueMetricsSnapshot: "#f9a8d4", QueueAgentProficiency: "#f9a8d4", SkillsBasedRouting: "#e879f9", ProficiencyRouting: "#e879f9", CallbackEvaluation: C.yellow, CallbackScheduled: C.green, PriorityRouting: C.red, RoutingDecision: "#e879f9", OrphanedContact: C.red, AgentTransfer: "#e879f9", AgentConnected: "#e879f9", AgentHandling: "#e879f9", AgentAssistPush: "#c084fc", AgentWrapUp: "#e879f9", AgentComplete: "#4ade80" }[l.action] || C.textMuted;
                  return (
                    <div key={i} style={{ padding: "2px 12px", borderBottom: `1px solid ${C.panel}`, display: "flex", gap: 8, background: l.level === "ERROR" ? "#0f0505" : l.level === "WARN" ? "#0f0c02" : "transparent", lineHeight: 1.55 }}>
                      <span style={{ color: C.textDim, minWidth: 170, flexShrink: 0 }}>{l.timestamp}</span>
                      <span style={{ color: lc, minWidth: 38, fontWeight: 600, flexShrink: 0 }}>{l.level}</span>
                      <span style={{ color: ac, minWidth: 160, fontWeight: 500, flexShrink: 0 }}>{l.action}</span>
                      <span style={{ color: C.textMuted, wordBreak: "break-all" }}>
                        {l.detail.split(/(\b(?:ALLOWED|VERIFIED|VALID|PASS|PASSED|SELF_SERVICE|SUCCESS|CONTAINED|MATCHED|CALLBACK_SCHEDULED|RESOLVED|AGENT_COMPLETE|200)\b|\b(?:DENIED|FAILED|INVALID|ERROR|TIMEOUT|ESCALATE|VERY_NEGATIVE|BLOCKED|ORPHANED|ORPHAN|NO_MATCH|503|401)\b|\b(?:AT_RISK|WARN|FLAG|DEGRADED|NO_DATA|OFFERED|PRIORITY|CALLBACK|CATCH_ALL|TRANSFERRING|HANDLING|WRAPPING)\b)/).map((part, j) => {
                          if (/^(ALLOWED|VERIFIED|VALID|PASS|PASSED|SELF_SERVICE|SUCCESS|CONTAINED|MATCHED|CALLBACK_SCHEDULED|RESOLVED|AGENT_COMPLETE|200)$/.test(part)) return <span key={j} style={{ color: C.green, fontWeight: 600 }}>{part}</span>;
                          if (/^(DENIED|FAILED|INVALID|ERROR|TIMEOUT|ESCALATE|VERY_NEGATIVE|BLOCKED|ORPHANED|ORPHAN|NO_MATCH|503|401)$/.test(part)) return <span key={j} style={{ color: C.red, fontWeight: 600 }}>{part}</span>;
                          if (/^(AT_RISK|WARN|FLAG|DEGRADED|NO_DATA|OFFERED|PRIORITY|CALLBACK|CATCH_ALL|TRANSFERRING|HANDLING|WRAPPING)$/.test(part)) return <span key={j} style={{ color: C.yellow, fontWeight: 600 }}>{part}</span>;
                          return <span key={j}>{part}</span>;
                        })}
                      </span>
                    </div>
                  );
                })}
                <div ref={logEndRef} />
                {displayLogs.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.textDim }}>No log entries{logFilter !== "ALL" ? ` matching "${logFilter}"` : " yet"}</div>}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
