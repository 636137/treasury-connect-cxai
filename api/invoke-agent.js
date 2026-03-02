const AWS = require('aws-sdk');
const bedrock = new AWS.BedrockAgentRuntime({ region: 'us-east-1' });

const AGENT_IDS = {
  IRS: 'Y7IIVROJX6',
  MINT: 'PGEVUOGPH7',
  TOP: 'F4A9TP4IPS',
  TD: 'JWAUX8YZVZ',
  DE: '2GUMJA92BE'
};

exports.handler = async (event) => {
  const { bureau, message, sessionId } = JSON.parse(event.body);
  
  const agentId = AGENT_IDS[bureau];
  if (!agentId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid bureau' }) };
  }

  try {
    const response = await bedrock.invokeAgent({
      agentId,
      agentAliasId: 'TSTALIASID',
      sessionId: sessionId || `session-${Date.now()}`,
      inputText: message
    }).promise();

    let completion = '';
    for await (const chunk of response.completion) {
      if (chunk.chunk?.bytes) {
        completion += Buffer.from(chunk.chunk.bytes).toString('utf-8');
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: completion, sessionId })
    };
  } catch (error) {
    console.error('Agent invocation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
