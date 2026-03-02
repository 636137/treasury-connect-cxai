import json
import boto3
import os
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
cloudwatch = boto3.client('cloudwatch')
predictions_table = dynamodb.Table(os.environ.get('PREDICTIONS_TABLE', 'treasury-predictions'))

weights = {
    'intentComplexity': 0.22,
    'sentimentRisk': 0.16,
    'authFriction': 0.08,
    'channelComplexity': 0.05,
    'toolHealth': 0.08,
    'kbRelevance': 0.08,
    'arConfidence': 0.06,
    'repeatCaller': 0.05,
    'queuePressure': 0.12,
    'agentAvailability': 0.10
}

def lambda_handler(event, context):
    contact_id = event['contactId']
    bureau = event['bureau']
    factors = event['factors']
    
    # Calculate weighted score
    score = sum(factors.get(factor, 0) * weight for factor, weight in weights.items())
    
    # Determine prediction based on thresholds
    if score > 0.62:
        prediction = 'SELF_SERVICE'
    elif score >= 0.38:
        prediction = 'AT_RISK'
    else:
        prediction = 'ESCALATE'
    
    # Save to DynamoDB
    prediction_item = {
        'contactId': contact_id,
        'bureau': bureau,
        'prediction': prediction,
        'score': round(score, 3),
        'factors': factors,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    predictions_table.put_item(Item=prediction_item)
    
    # Emit CloudWatch metric
    cloudwatch.put_metric_data(
        Namespace='TreasuryConnect/Prediction',
        MetricData=[
            {
                'MetricName': 'Prediction',
                'Dimensions': [
                    {'Name': 'Bureau', 'Value': bureau},
                    {'Name': 'Prediction', 'Value': prediction}
                ],
                'Value': 1,
                'Unit': 'Count'
            }
        ]
    )
    
    return {
        'contactId': contact_id,
        'prediction': prediction,
        'score': round(score, 3),
        'bureau': bureau
    }