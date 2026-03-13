import json
import boto3
import os
from datetime import datetime

bedrock_agent = boto3.client('bedrock-agent-runtime')
bedrock = boto3.client('bedrock-runtime')

KB_ID = os.environ.get('KB_ID', 'PLACEHOLDER')

def lambda_handler(event, context):
    query = event.get('query', '')
    bureau = event.get('bureau', 'IRS')
    
    # Retrieve from knowledge base
    try:
        kb_response = bedrock_agent.retrieve(
            knowledgeBaseId=KB_ID,
            retrievalQuery={'text': query},
            retrievalConfiguration={
                'vectorSearchConfiguration': {
                    'numberOfResults': 5
                }
            }
        )
        
        chunks = []
        for result in kb_response.get('retrievalResults', []):
            chunks.append({
                'content': result['content']['text'],
                'score': result.get('score', 0),
                'source': result.get('location', {}).get('s3Location', {}).get('uri', 'unknown')
            })
        
        # Rerank with Cohere
        if chunks:
            rerank_response = bedrock.invoke_model(
                modelId='cohere.rerank-v3-5:0',
                body=json.dumps({
                    'query': query,
                    'documents': [c['content'] for c in chunks],
                    'top_n': 3
                })
            )
            rerank_data = json.loads(rerank_response['body'].read())
            
            # Reorder by rerank scores
            reranked = []
            for item in rerank_data.get('results', []):
                idx = item['index']
                reranked.append({
                    **chunks[idx],
                    'rerankScore': item['relevance_score']
                })
            chunks = reranked
        
        return {
            'statusCode': 200,
            'chunks': chunks,
            'query': query,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'error': str(e),
            'chunks': []
        }
