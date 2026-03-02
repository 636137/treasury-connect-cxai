#!/bin/bash
echo "=========================================="
echo "📊 RECENT ACTIVITY SUMMARY"
echo "=========================================="
echo ""
echo "🕐 Lambda Invocations (Last 15 min):"
aws logs tail /aws/lambda/TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR --since 15m --format short | grep -E "START|END|REPORT" | tail -10
echo ""
echo "=========================================="
echo "📞 Connect Contacts (Last 30 min):"
aws connect search-contacts \
  --instance-id a88ddab9-3b29-409f-87f0-bdb614abafef \
  --time-range Type=INITIATION_TIMESTAMP,StartTime=$(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ),EndTime=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --query 'Contacts[].{ID:Id,Time:InitiationTimestamp,Channel:Channel}' \
  --output table 2>/dev/null || echo "No contacts found"
echo ""
echo "=========================================="
echo "💾 Latest DynamoDB Records:"
aws dynamodb scan --table-name TreasuryContacts --limit 3 --query 'Items[].{Contact:contactId.S,Time:timestamp.S,Bureau:bureau.S}' --output table
echo ""
echo "=========================================="
