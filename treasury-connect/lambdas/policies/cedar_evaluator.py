"""
Cedar Policy Evaluator for Treasury AgentCore
Evaluates tool authorization based on bureau boundaries and session context
"""
import json
import os

POLICIES = {
    "auth-policy": {
        "rules": [
            {"effect": "permit", "principal": "Agent", "action": "validateIdentity", "conditions": ["ssn_match", "bureau_match"]},
            {"effect": "permit", "principal": "Agent", "action": "verifyANI", "conditions": ["ani_confidence > 85"]},
        ]
    },
    "tool-policy": {
        "rules": [
            {"effect": "permit", "principal": "Agent", "action": "getRefundStatus", "resource": "IRS", "conditions": ["bureau == IRS", "authenticated"]},
            {"effect": "permit", "principal": "Agent", "action": "getBondValue", "resource": "TreasuryDirect", "conditions": ["bureau == TreasuryDirect", "authenticated"]},
            {"effect": "permit", "principal": "Agent", "action": "getOffsetInfo", "resource": "TOP", "conditions": ["bureau == TOP", "authenticated"]},
            {"effect": "permit", "principal": "Agent", "action": "getOrderStatus", "resource": "USMint", "conditions": ["bureau == USMint", "authenticated"]},
            {"effect": "permit", "principal": "Agent", "action": "getBalance", "resource": "DirectExpress", "conditions": ["bureau == DirectExpress", "authenticated"]},
            {"effect": "deny", "principal": "Agent", "action": "*", "resource": "*", "conditions": ["bureau_mismatch"]},
        ]
    }
}

def handler(event, context):
    """
    Evaluate Cedar policy
    Input: {
        "policy": "auth-policy" | "tool-policy",
        "action": "validateIdentity" | "getRefundStatus" | etc,
        "context": {
            "bureau": "IRS",
            "authenticated": true,
            "ssn_match": true,
            "ani_confidence": 92
        }
    }
    Output: {"decision": "ALLOW" | "DENY", "reason": "..."}
    """
    policy_name = event.get('policy', 'tool-policy')
    action = event.get('action')
    ctx = event.get('context', {})
    
    policy = POLICIES.get(policy_name, {})
    rules = policy.get('rules', [])
    
    for rule in rules:
        if rule['action'] == action or rule['action'] == '*':
            # Check resource match
            if 'resource' in rule:
                if rule['resource'] != '*' and rule['resource'] != ctx.get('bureau'):
                    continue
            
            # Evaluate conditions
            conditions_met = True
            for condition in rule.get('conditions', []):
                if not evaluate_condition(condition, ctx):
                    conditions_met = False
                    break
            
            if conditions_met:
                decision = "ALLOW" if rule['effect'] == "permit" else "DENY"
                return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'decision': decision,
                        'reason': f"Rule matched: {rule['effect']} {action}",
                        'rule': rule
                    })
                }
    
    # Default deny
    return {
        'statusCode': 200,
        'body': json.dumps({
            'decision': 'DENY',
            'reason': 'No matching policy rule found',
            'rule': None
        })
    }

def evaluate_condition(condition, context):
    """Evaluate a single condition against context"""
    if condition == "authenticated":
        return context.get('authenticated', False)
    elif condition == "ssn_match":
        return context.get('ssn_match', False)
    elif condition == "bureau_match":
        return context.get('bureau_match', True)
    elif condition == "bureau_mismatch":
        return not context.get('bureau_match', True)
    elif "bureau ==" in condition:
        expected = condition.split("==")[1].strip()
        return context.get('bureau') == expected
    elif ">" in condition:
        parts = condition.split(">")
        key = parts[0].strip()
        threshold = float(parts[1].strip())
        return context.get(key, 0) > threshold
    return True
