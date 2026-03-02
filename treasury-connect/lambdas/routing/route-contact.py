import json
import boto3
import os

# Intent to skill mapping for all 5 bureaus
INTENT_SKILL_MAP = {
    'IRS': {
        'tax_payment': 'tax_processing', 'refund_status': 'refund_inquiry',
        'account_balance': 'account_management', 'payment_plan': 'payment_services',
        'tax_transcript': 'document_services'
    },
    'BFS': {
        'check_status': 'payment_inquiry', 'direct_deposit': 'banking_services',
        'savings_bond': 'securities_management', 'treasury_bill': 'securities_management',
        'payment_trace': 'payment_inquiry'
    },
    'FMS': {
        'debt_collection': 'collections', 'offset_inquiry': 'offset_management',
        'payment_research': 'payment_inquiry', 'vendor_payment': 'vendor_services',
        'cross_servicing': 'collections'
    },
    'MINT': {
        'coin_order': 'numismatic_sales', 'medal_inquiry': 'numismatic_sales',
        'shipping_status': 'order_fulfillment', 'product_catalog': 'customer_service',
        'return_exchange': 'order_fulfillment'
    },
    'OCC': {
        'bank_complaint': 'regulatory_compliance', 'examination_inquiry': 'supervision',
        'enforcement_action': 'enforcement', 'charter_application': 'licensing',
        'consumer_assistance': 'consumer_protection'
    }
}

def lambda_handler(event, context):
    contact_id = event['contactId']
    bureau = event['bureau']
    intent = event['intent']
    factors = event['factors']
    queue_metrics = event.get('queueMetrics', {})
    
    # Get skill for intent
    skill = INTENT_SKILL_MAP.get(bureau, {}).get(intent, 'general_inquiry')
    
    # Determine proficiency level
    complexity = factors.get('intentComplexity', 0)
    sentiment = factors.get('sentimentRisk', 0)
    
    if complexity > 0.8 or sentiment > 0.7:
        proficiency = 'P4'
    elif complexity > 0.6 or sentiment > 0.5:
        proficiency = 'P3'
    elif complexity > 0.4 or sentiment > 0.3:
        proficiency = 'P2'
    else:
        proficiency = 'P1'
    
    # Check callback conditions
    queue_name = f"{bureau.lower()}_queue"
    queue_data = queue_metrics.get(queue_name, {})
    queue_depth = queue_data.get('contacts_in_queue', 0)
    oldest_wait = queue_data.get('oldest_contact_age', 0)
    available_agents = queue_data.get('agents_available', 0)
    
    offer_callback = (queue_depth > 8 and oldest_wait > 120) or available_agents == 0
    
    # Determine priority
    priority = 1  # Default
    very_negative = sentiment > 0.8
    high_complexity_friction = complexity > 0.8 and factors.get('authFriction', 0) > 0.15
    
    if very_negative or high_complexity_friction:
        priority = 5  # High priority
    elif complexity > 0.6:
        priority = 3  # Medium priority
    
    # Determine action
    if offer_callback:
        action = 'CALLBACK'
    elif available_agents > 0:
        action = 'ROUTE'
    else:
        action = 'ORPHAN'
    
    return {
        'action': action,
        'queue': queue_name,
        'priority': priority,
        'skill': skill,
        'proficiency': proficiency,
        'contactId': contact_id
    }