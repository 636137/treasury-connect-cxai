"""
Knowledge Base Query Handler
Queries Bedrock Knowledge Base and applies Cohere rerank
"""
import json
import boto3
import os

bedrock_agent = boto3.client('bedrock-agent-runtime')
bedrock_runtime = boto3.client('bedrock-runtime')

KB_ID = os.environ.get('KB_ID')

def handler(event, context):
    """
    Query knowledge base with rerank
    Input: {"query": "What is the standard deduction for 2025?", "top_k": 5}
    Output: {"documents": [...], "rerank_scores": [...]}
    """
    query = event.get('query', '')
    top_k = event.get('top_k', 5)
    
    # Query Bedrock KB
    response = bedrock_agent.retrieve(
        knowledgeBaseId=KB_ID,
        retrievalQuery={'text': query},
        retrievalConfiguration={
            'vectorSearchConfiguration': {
                'numberOfResults': top_k * 2  # Get more for reranking
            }
        }
    )
    
    documents = []
    for result in response.get('retrievalResults', []):
        documents.append({
            'id': result.get('location', {}).get('s3Location', {}).get('uri', 'unknown'),
            'text': result.get('content', {}).get('text', ''),
            'score': result.get('score', 0),
            'metadata': result.get('metadata', {})
        })
    
    # Rerank with Cohere (via Bedrock)
    if len(documents) > 0:
        rerank_request = {
            'query': query,
            'documents': [doc['text'] for doc in documents],
            'top_n': top_k,
            'return_documents': False
        }
        
        rerank_response = bedrock_runtime.invoke_model(
            modelId='cohere.rerank-v3-5:0',
            body=json.dumps(rerank_request)
        )
        
        rerank_body = json.loads(rerank_response['body'].read())
        rerank_results = rerank_body.get('results', [])
        
        # Reorder documents by rerank score
        reranked_docs = []
        for result in rerank_results:
            idx = result['index']
            doc = documents[idx].copy()
            doc['rerank_score'] = result['relevance_score']
            reranked_docs.append(doc)
        
        documents = reranked_docs[:top_k]
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'documents': documents,
            'count': len(documents),
            'query': query
        })
    }
