"""
Contact Lens Real-Time Analytics Processor
Processes sentiment, interruptions, silence, and quality metrics
"""
import json
import boto3
import os
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
cloudwatch = boto3.client('cloudwatch')
connect = boto3.client('connect')

CONTACTS_TABLE = os.environ.get('CONTACTS_TABLE', 'treasury-contacts')
INSTANCE_ID = os.environ.get('INSTANCE_ID')

def handler(event, context):
    """Process Contact Lens real-time segments from Kinesis"""
    for record in event['Records']:
        payload = json.loads(record['kinesis']['data'])
        
        contact_id = payload.get('ContactId')
        channel = payload.get('Channel')
        segments = payload.get('Segments', [])
        
        for segment in segments:
            process_segment(contact_id, channel, segment)
    
    return {'statusCode': 200}

def process_segment(contact_id, channel, segment):
    """Process individual Contact Lens segment"""
    segment_type = segment.get('Transcript', {}).get('ParticipantRole')
    
    # Sentiment Analysis
    sentiment = segment.get('Transcript', {}).get('Sentiment')
    if sentiment:
        handle_sentiment(contact_id, sentiment, segment_type)
    
    # Interruptions / Talk-Over
    interruptions = segment.get('Categories', {}).get('MatchedDetails', {}).get('Interruptions')
    if interruptions:
        handle_interruptions(contact_id, interruptions)
    
    # Non-Talk Time (Silence)
    non_talk_time = segment.get('Categories', {}).get('MatchedDetails', {}).get('NonTalkTime')
    if non_talk_time:
        handle_silence(contact_id, non_talk_time)
    
    # Issue Detection
    issues = segment.get('Categories', {}).get('MatchedDetails', {}).get('IssuesDetected')
    if issues:
        handle_issues(contact_id, issues)

def handle_sentiment(contact_id, sentiment, role):
    """Track sentiment trends and trigger alerts"""
    score = sentiment.get('Score', 0)
    label = sentiment.get('Label', 'NEUTRAL')
    
    # Store in DynamoDB
    table = dynamodb.Table(CONTACTS_TABLE)
    table.update_item(
        Key={'contactId': contact_id},
        UpdateExpression='SET sentiment = :s, sentimentScore = :sc, lastUpdated = :ts',
        ExpressionAttributeValues={
            ':s': label,
            ':sc': score,
            ':ts': datetime.utcnow().isoformat()
        }
    )
    
    # CloudWatch metric
    cloudwatch.put_metric_data(
        Namespace='TreasuryConnect/ContactLens',
        MetricData=[{
            'MetricName': 'SentimentScore',
            'Value': score,
            'Unit': 'None',
            'Dimensions': [
                {'Name': 'ContactId', 'Value': contact_id},
                {'Name': 'Role', 'Value': role}
            ]
        }]
    )
    
    # Alert on very negative sentiment
    if label == 'VERY_NEGATIVE' and role == 'CUSTOMER':
        trigger_supervisor_alert(contact_id, 'NEGATIVE_SENTIMENT', f'Customer sentiment: {label}')

def handle_interruptions(contact_id, interruptions):
    """Track talk-over and interruption patterns"""
    count = len(interruptions)
    
    cloudwatch.put_metric_data(
        Namespace='TreasuryConnect/ContactLens',
        MetricData=[{
            'MetricName': 'Interruptions',
            'Value': count,
            'Unit': 'Count',
            'Dimensions': [{'Name': 'ContactId', 'Value': contact_id}]
        }]
    )
    
    if count > 5:
        trigger_supervisor_alert(contact_id, 'HIGH_INTERRUPTIONS', f'{count} interruptions detected')

def handle_silence(contact_id, non_talk_time):
    """Track silence periods"""
    duration = non_talk_time.get('DurationMillis', 0) / 1000
    
    cloudwatch.put_metric_data(
        Namespace='TreasuryConnect/ContactLens',
        MetricData=[{
            'MetricName': 'SilenceDuration',
            'Value': duration,
            'Unit': 'Seconds',
            'Dimensions': [{'Name': 'ContactId', 'Value': contact_id}]
        }]
    )
    
    if duration > 30:
        trigger_supervisor_alert(contact_id, 'LONG_SILENCE', f'{duration}s silence detected')

def handle_issues(contact_id, issues):
    """Track detected issues"""
    for issue in issues:
        issue_type = issue.get('Type')
        cloudwatch.put_metric_data(
            Namespace='TreasuryConnect/ContactLens',
            MetricData=[{
                'MetricName': 'IssuesDetected',
                'Value': 1,
                'Unit': 'Count',
                'Dimensions': [
                    {'Name': 'ContactId', 'Value': contact_id},
                    {'Name': 'IssueType', 'Value': issue_type}
                ]
            }]
        )

def trigger_supervisor_alert(contact_id, alert_type, message):
    """Create supervisor task for real-time intervention"""
    try:
        # In production, this would create a Connect task or SNS notification
        print(f"SUPERVISOR ALERT [{alert_type}] Contact: {contact_id} - {message}")
        
        # Store alert in DynamoDB
        table = dynamodb.Table(CONTACTS_TABLE)
        table.update_item(
            Key={'contactId': contact_id},
            UpdateExpression='SET alerts = list_append(if_not_exists(alerts, :empty), :alert)',
            ExpressionAttributeValues={
                ':alert': [{
                    'type': alert_type,
                    'message': message,
                    'timestamp': datetime.utcnow().isoformat()
                }],
                ':empty': []
            }
        )
    except Exception as e:
        print(f"Error triggering alert: {e}")
