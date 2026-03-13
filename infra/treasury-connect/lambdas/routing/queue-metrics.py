import json
import boto3
import redis
import os
from datetime import datetime

connect = boto3.client('connect')
redis_client = redis.Redis(
    host=os.environ.get('REDIS_HOST', 'localhost'),
    port=int(os.environ.get('REDIS_PORT', 6379)),
    decode_responses=True
)

CONNECT_INSTANCE_ID = os.environ['CONNECT_INSTANCE_ID']
BUREAU_QUEUES = ['irs_queue', 'bfs_queue', 'fms_queue', 'mint_queue', 'occ_queue']

def lambda_handler(event, context):
    cache_key = 'treasury_queue_metrics'
    
    # Check cache first
    try:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception:
        pass  # Cache miss or error, proceed to fetch fresh data
    
    # Fetch fresh metrics from Connect
    metrics = {}
    
    try:
        # Get queue ARNs first
        queues_response = connect.list_queues(InstanceId=CONNECT_INSTANCE_ID)
        queue_arns = {q['Name']: q['Arn'] for q in queues_response['QueueSummaryList'] 
                     if q['Name'] in BUREAU_QUEUES}
        
        if queue_arns:
            # Get current metrics
            response = connect.get_current_metric_data(
                InstanceId=CONNECT_INSTANCE_ID,
                Filters={
                    'Queues': list(queue_arns.values())
                },
                CurrentMetrics=[
                    {'Name': 'AGENTS_AVAILABLE', 'Unit': 'COUNT'},
                    {'Name': 'CONTACTS_IN_QUEUE', 'Unit': 'COUNT'},
                    {'Name': 'OLDEST_CONTACT_AGE', 'Unit': 'SECONDS'}
                ]
            )
            
            # Process metrics by queue
            for metric_result in response['MetricResults']:
                queue_arn = metric_result['Dimensions']['Queue']['Arn']
                queue_name = next(name for name, arn in queue_arns.items() if arn == queue_arn)
                
                if queue_name not in metrics:
                    metrics[queue_name] = {}
                
                for metric in metric_result['Collections']:
                    metric_name = metric['Metric']['Name'].lower()
                    metrics[queue_name][metric_name] = metric.get('Value', 0)
        
        # Cache for 15 seconds
        try:
            redis_client.setex(cache_key, 15, json.dumps(metrics))
        except Exception:
            pass  # Cache write failed, but we have the data
        
        return metrics
        
    except Exception as e:
        # Return empty metrics on error
        return {queue: {'agents_available': 0, 'contacts_in_queue': 0, 'oldest_contact_age': 0} 
                for queue in BUREAU_QUEUES}