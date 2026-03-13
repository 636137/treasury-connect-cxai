"""
Automated Reasoning Verifier for Treasury
Validates tax calculations, dates, and eligibility criteria
"""
import json
import re
from decimal import Decimal

# Tax rules for 2025
TAX_RULES = {
    "standard_deduction": {
        "single": 15000,
        "married_joint": 30000,
        "married_separate": 15000,
        "head_of_household": 22500,
    },
    "ira_contribution_limit": {
        "under_50": 7000,
        "50_and_over": 8000,
    },
    "magi_phase_out": {
        "single": {"start": 77000, "end": 87000},
        "married_joint": {"start": 123000, "end": 143000},
    }
}

def handler(event, context):
    """
    Verify AI response against tax rules
    Input: {
        "response": "The standard deduction for single filers in 2025 is $15,000",
        "context": {"filing_status": "single", "tax_year": 2025}
    }
    Output: {"result": "VALID" | "INVALID", "corrections": [...], "proof": "..."}
    """
    response_text = event.get('response', '')
    ctx = event.get('context', {})
    
    corrections = []
    proof_steps = []
    
    # Extract claims from response
    claims = extract_claims(response_text)
    
    for claim in claims:
        verification = verify_claim(claim, ctx)
        if not verification['valid']:
            corrections.append(verification)
        proof_steps.append(verification['proof'])
    
    result = "VALID" if len(corrections) == 0 else "INVALID"
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'result': result,
            'corrections': corrections,
            'proof': " → ".join(proof_steps),
            'claims_verified': len(claims)
        })
    }

def extract_claims(text):
    """Extract verifiable claims from text"""
    claims = []
    
    # Standard deduction claims
    match = re.search(r'standard deduction.*?(\w+)\s+filers.*?\$?([\d,]+)', text, re.IGNORECASE)
    if match:
        claims.append({
            'type': 'standard_deduction',
            'filing_status': match.group(1).lower(),
            'amount': int(match.group(2).replace(',', ''))
        })
    
    # IRA contribution claims
    match = re.search(r'IRA contribution limit.*?\$?([\d,]+)', text, re.IGNORECASE)
    if match:
        claims.append({
            'type': 'ira_contribution',
            'amount': int(match.group(1).replace(',', ''))
        })
    
    # Penalty abatement claims
    if 'first-time penalty abatement' in text.lower():
        claims.append({'type': 'penalty_abatement', 'program': 'first_time'})
    
    return claims

def verify_claim(claim, context):
    """Verify a single claim against tax rules"""
    claim_type = claim.get('type')
    
    if claim_type == 'standard_deduction':
        filing_status = claim.get('filing_status')
        stated_amount = claim.get('amount')
        
        # Map filing status variations
        status_map = {
            'single': 'single',
            'married': 'married_joint',
            'joint': 'married_joint',
            'head': 'head_of_household',
        }
        
        mapped_status = None
        for key, value in status_map.items():
            if key in filing_status:
                mapped_status = value
                break
        
        if not mapped_status:
            return {
                'valid': False,
                'claim': claim,
                'expected': None,
                'correction': f"Unknown filing status: {filing_status}",
                'proof': f"INVALID: Unrecognized filing status"
            }
        
        correct_amount = TAX_RULES['standard_deduction'].get(mapped_status)
        
        if stated_amount == correct_amount:
            return {
                'valid': True,
                'claim': claim,
                'expected': correct_amount,
                'proof': f"VALID: Standard deduction {mapped_status} = ${correct_amount:,} (IRC §63(c)(2))"
            }
        else:
            return {
                'valid': False,
                'claim': claim,
                'expected': correct_amount,
                'correction': f"Stated ${stated_amount:,}, should be ${correct_amount:,}",
                'proof': f"INVALID: Stated ${stated_amount:,} ≠ ${correct_amount:,} (IRC §63(c)(2))"
            }
    
    elif claim_type == 'ira_contribution':
        stated_amount = claim.get('amount')
        age = context.get('age', 40)
        
        correct_amount = TAX_RULES['ira_contribution_limit']['50_and_over'] if age >= 50 else TAX_RULES['ira_contribution_limit']['under_50']
        
        if stated_amount == correct_amount:
            return {
                'valid': True,
                'claim': claim,
                'expected': correct_amount,
                'proof': f"VALID: IRA limit age {age} = ${correct_amount:,} (IRC §219(b)(5))"
            }
        else:
            return {
                'valid': False,
                'claim': claim,
                'expected': correct_amount,
                'correction': f"Stated ${stated_amount:,}, should be ${correct_amount:,} for age {age}",
                'proof': f"INVALID: Stated ${stated_amount:,} ≠ ${correct_amount:,} (IRC §219(b)(5))"
            }
    
    elif claim_type == 'penalty_abatement':
        # First-time penalty abatement is valid if no penalties in prior 3 years
        prior_penalties = context.get('prior_penalties', 0)
        
        if prior_penalties == 0:
            return {
                'valid': True,
                'claim': claim,
                'proof': "VALID: First-time abatement eligible (no penalties prior 3 years, IRM 20.1.1.3.3.2.1)"
            }
        else:
            return {
                'valid': False,
                'claim': claim,
                'correction': f"Not eligible: {prior_penalties} penalties in prior 3 years",
                'proof': f"INVALID: {prior_penalties} prior penalties (IRM 20.1.1.3.3.2.1)"
            }
    
    # Default: assume valid if no rule to check
    return {
        'valid': True,
        'claim': claim,
        'proof': f"VALID: No verification rule for {claim_type}"
    }
