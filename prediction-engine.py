import json

def calculate_self_service_probability(contact_data):
    """10-feature weighted prediction model"""
    
    features = {
        'intentComplexity': contact_data.get('intentComplexity', 0.5),
        'sentimentRisk': 1.0 if contact_data.get('sentiment') == 'VERY_NEGATIVE' else 0.3,
        'authFriction': 0.2 if contact_data.get('authSuccess') else 0.8,
        'toolHealth': 0.0 if contact_data.get('toolSuccess') else 0.7,
        'kbRelevance': contact_data.get('topRerankScore', 0.5),
        'arConfidence': 1.0 if contact_data.get('arResult') == 'VALID' else 0.3,
        'queuePressure': min(contact_data.get('queueDepth', 0) / 20.0, 1.0),
        'agentAvailability': contact_data.get('availableAgents', 0) / max(contact_data.get('staffedAgents', 1), 1),
        'priorEscalations': min(contact_data.get('priorEscalations', 0) / 3.0, 1.0),
        'channelComplexity': 0.2 if contact_data.get('channel') == 'VOICE' else 0.4
    }
    
    weights = {
        'intentComplexity': -0.25,
        'sentimentRisk': -0.20,
        'authFriction': -0.15,
        'toolHealth': -0.10,
        'kbRelevance': 0.15,
        'arConfidence': 0.15,
        'queuePressure': -0.05,
        'agentAvailability': 0.05,
        'priorEscalations': -0.05,
        'channelComplexity': -0.05
    }
    
    score = 0.62  # Base probability
    for feature, value in features.items():
        score += value * weights[feature]
    
    score = max(0.0, min(1.0, score))
    
    if score > 0.62:
        prediction = 'SELF_SERVICE'
    elif score > 0.38:
        prediction = 'AT_RISK'
    else:
        prediction = 'ESCALATE'
    
    return {
        'prediction': prediction,
        'probability': score,
        'features': features,
        'weights': weights
    }

def lambda_handler(event, context):
    contact_data = event.get('contactData', {})
    result = calculate_self_service_probability(contact_data)
    
    return {
        'statusCode': 200,
        'body': json.dumps(result)
    }
