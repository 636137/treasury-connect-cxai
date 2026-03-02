# Treasury Connect - Quick Start with Contact Lens

## 🚀 Deploy Everything

```bash
cd /home/ec2-user/CXAIDemo1
./deploy-all.sh
```

This deploys all 7 stacks including Contact Lens real-time analytics.

## 🎯 What You Get

### Contact Lens Features
- ✅ Real-time sentiment analysis (POSITIVE → VERY_NEGATIVE)
- ✅ Interruption/talk-over detection
- ✅ Silence period monitoring
- ✅ Issue detection and categorization
- ✅ Supervisor alerts for critical events
- ✅ CloudWatch metrics dashboard
- ✅ DynamoDB contact tracking

### Demo Features
- ✅ 5 Treasury bureau agents (IRS, TD, TOP, Mint, DE)
- ✅ Bedrock Guardrails (PII protection)
- ✅ Skills-based routing
- ✅ AI prediction engine
- ✅ Error detection + auto-remediation
- ✅ Real-time flow visualization

## 🖥️ Run the Demo

```bash
cd /home/ec2-user/CXAIDemo1
npm install
npm start
```

Open http://localhost:3000

### Demo Flow
1. Click "Generate Contact"
2. Select a bureau (IRS, TreasuryDirect, etc.)
3. Watch the contact flow through 9 phases
4. See Contact Lens metrics in agent handling phases
5. Check Analytics tab for sentiment timeline

## 📊 Monitor Contact Lens

### CloudWatch Metrics
```bash
aws cloudwatch list-metrics --namespace TreasuryConnect/ContactLens
```

### Lambda Logs
```bash
aws logs tail /aws/lambda/TreasuryContactLensStack-ContactLensProcessor --follow
```

### DynamoDB Contacts
```bash
aws dynamodb scan --table-name treasury-contacts --max-items 5
```

## 🧪 Test Locally

```bash
cd /home/ec2-user/CXAIDemo1
python3 test-contact-lens.py
```

## 📁 Key Files

**Infrastructure**:
- `treasury-connect/infrastructure/lib/stacks/contact-lens-stack.ts`
- `treasury-connect/infrastructure/lib/stacks/connect-stack.ts`

**Lambda**:
- `treasury-connect/lambdas/analytics/contact_lens_processor.py`

**Frontend**:
- `src/FlowOpsCenter.jsx` (already has Contact Lens references)

**Docs**:
- `BUILD_STATUS.md` - Full build status
- `CONTACT_LENS_STATUS.md` - Detailed Contact Lens info
- `README.md` - Project overview

## 💰 Cost Estimate

~$47-67/month for light demo usage:
- Amazon Connect: $10-20
- Bedrock Agents: $20-30
- Lambda: $5
- DynamoDB: $5
- Kinesis (Contact Lens): $5
- S3: $2

## 🔧 Troubleshooting

**CDK Deploy Fails**:
```bash
npx cdk bootstrap --force
```

**Frontend Won't Start**:
```bash
rm -rf node_modules package-lock.json
npm install
```

**Contact Lens Not Processing**:
- Check Lambda function exists
- Verify Kinesis streams are active
- Check IAM permissions

## 📚 Documentation

- [BUILD_STATUS.md](BUILD_STATUS.md) - Complete build status
- [CONTACT_LENS_STATUS.md](CONTACT_LENS_STATUS.md) - Contact Lens details
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [README.md](README.md) - Project overview

## ✅ Verification Checklist

After deployment:
- [ ] All 7 CDK stacks deployed successfully
- [ ] Frontend starts at http://localhost:3000
- [ ] Can generate synthetic contacts
- [ ] Contact flow advances through all phases
- [ ] Agent handling shows Contact Lens metrics
- [ ] CloudWatch metrics namespace exists
- [ ] DynamoDB tables created

## 🎓 Demo Script

**For Presentations**:

1. **Show Architecture** - Explain 7 stacks and Contact Lens integration
2. **Generate Contact** - Pick IRS RefundStatus intent
3. **Walk Through Phases** - Explain each phase (INIT → RESOLVE)
4. **Highlight Contact Lens** - Show sentiment tracking in agent phase
5. **Show Analytics** - Display post-call analytics with metrics
6. **Explain Governance** - Three-layer safety (Policy, AR, Guardrails)
7. **Demonstrate Routing** - Skills-based matching with proficiency
8. **Show Error Handling** - Inject error and watch auto-remediation

**Key Talking Points**:
- Real-time quality monitoring with Contact Lens
- AI prediction engine prevents unnecessary escalations
- Three-layer governance ensures compliance
- Skills-based routing optimizes agent utilization
- Automated remediation reduces manual intervention

---

**Ready to deploy?** Run `./deploy-all.sh` now!
