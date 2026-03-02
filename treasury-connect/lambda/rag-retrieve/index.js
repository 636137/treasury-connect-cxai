const { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } = require('@aws-sdk/client-bedrock-agent-runtime');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const bedrockAgent = new BedrockAgentRuntimeClient({});
const bedrock = new BedrockRuntimeClient({});

const KB_ID = process.env.KB_ID;
const MODEL_ID = process.env.MODEL_ID || 'amazon.nova-pro-v1:0';
const RERANK_MODEL = 'cohere.rerank-v3-5:0';

exports.handler = async (event) => {
  const { query, topK = 4 } = JSON.parse(event.body || '{}');
  
  try {
    // Retrieve from Knowledge Base
    const retrieveResponse = await bedrockAgent.send(new RetrieveAndGenerateCommand({
      input: { text: query },
      retrieveAndGenerateConfiguration: {
        type: 'KNOWLEDGE_BASE',
        knowledgeBaseConfiguration: {
          knowledgeBaseId: KB_ID,
          modelArn: `arn:aws:bedrock:${process.env.AWS_REGION}::foundation-model/${MODEL_ID}`
        }
      }
    }));
    
    const chunks = retrieveResponse.citations?.[0]?.retrievedReferences || [];
    
    // Rerank with Cohere
    const rerankInput = {
      model: RERANK_MODEL,
      query,
      documents: chunks.map(c => c.content?.text || ''),
      topN: topK
    };
    
    const rerankResponse = await bedrock.send(new InvokeModelCommand({
      modelId: RERANK_MODEL,
      body: JSON.stringify(rerankInput)
    }));
    
    const rerankResults = JSON.parse(new TextDecoder().decode(rerankResponse.body));
    
    // Combine results
    const rankedChunks = rerankResults.results.map((r, i) => ({
      docId: chunks[r.index]?.location?.s3Location?.uri || `doc-${i}`,
      text: chunks[r.index]?.content?.text || '',
      score: r.relevanceScore,
      originalRank: r.index + 1,
      rerankRank: i + 1
    }));
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        query,
        chunks: rankedChunks,
        topScore: rankedChunks[0]?.score || 0,
        retrievalLatencyMs: retrieveResponse.$metadata.totalRetryDelay || 0,
        rerankLatencyMs: rerankResponse.$metadata.totalRetryDelay || 0
      })
    };
  } catch (error) {
    console.error('RAG error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
