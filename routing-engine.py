import json

SKILLS = {
    'IRS': {
        'RefundStatus': {'skill': 'IRS_TaxReturns', 'minProf': 1},
        'PaymentPlan': {'skill': 'IRS_Collections', 'minProf': 2},
        'NoticeExplanation': {'skill': 'IRS_Notices', 'minProf': 3},
        'PenaltyAbatement': {'skill': 'IRS_Appeals', 'minProf': 4},
        'AmendedReturn': {'skill': 'IRS_TaxReturns', 'minProf': 3}
    },
    'TreasuryDirect': {
        'BondValue': {'skill': 'TD_BondServices', 'minProf': 1},
        'AccountUnlock': {'skill': 'TD_AccountSupport', 'minProf': 2},
        'BondRedemption': {'skill': 'TD_BondServices', 'minProf': 2}
    },
    'TOP': {
        'OffsetInquiry': {'skill': 'TOP_OffsetResearch', 'minProf': 2},
        'DisputeInitiation': {'skill': 'TOP_DisputeResolution', 'minProf': 3}
    }
}

def route_contact(bureau, intent, complexity, sentiment, queue_metrics):
    skill_map = SKILLS.get(bureau, {}).get(intent, {'skill': 'GENERAL', 'minProf': 2})
    
    required_prof = skill_map['minProf']
    
    # Escalate proficiency for high complexity or negative sentiment
    if complexity > 0.6 or sentiment == 'VERY_NEGATIVE':
        required_prof = min(required_prof + 1, 4)
    
    available_at_prof = queue_metrics.get('agentsByProficiency', {}).get(str(required_prof), 0)
    
    # Offer callback if queue is deep or no agents available
    offer_callback = (
        queue_metrics.get('depth', 0) > 8 or
        queue_metrics.get('oldestContactSec', 0) > 120 or
        available_at_prof == 0
    )
    
    priority_boost = sentiment == 'VERY_NEGATIVE' or complexity > 0.7
    
    return {
        'skillId': skill_map['skill'],
        'requiredProficiency': required_prof,
        'availableAtProf': available_at_prof,
        'offerCallback': offer_callback,
        'priorityBoost': priority_boost,
        'estimatedWaitSec': queue_metrics.get('avgSpeedAnswerSec', 30)
    }

def lambda_handler(event, context):
    routing = route_contact(
        event.get('bureau', 'IRS'),
        event.get('intent', 'RefundStatus'),
        event.get('complexity', 0.5),
        event.get('sentiment', 'NEUTRAL'),
        event.get('queueMetrics', {})
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps(routing)
    }
