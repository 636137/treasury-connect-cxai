const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

const RUNTIME_FUNCTIONS = {
  IRS: 'TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR',
  MINT: 'TreasuryAgentCoreStack-AgentMINTRuntime14C8D456-SBKYsYEZF0Eg',
  TOP: 'TreasuryAgentCoreStack-AgentTOPRuntime071D2934-HPN9JTUkogG9',
  TD: 'TreasuryAgentCoreStack-AgentTDRuntimeA5106084-C1YR5ulT2wLJ',
  DE: 'TreasuryAgentCoreStack-AgentDERuntime778B6C5C-IADf7Pmqvk32'
};

exports.handler = async (event) => {
  const { routeKey, connectionId, body } = event.requestContext || {};
  const message = body ? JSON.parse(body) : {};

  if (routeKey === '$connect') {
    return { statusCode: 200, body: 'Connected' };
  }

  if (routeKey === '$disconnect') {
    return { statusCode: 200, body: 'Disconnected' };
  }

  if (message.action === 'invokeAgent') {
    const { bureau, input, sessionId } = message;
    const functionName = RUNTIME_FUNCTIONS[bureau];

    if (!functionName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid bureau' }) };
    }

    try {
      const startTime = Date.now();
      const result = await lambda.invoke({
        FunctionName: functionName,
        Payload: JSON.stringify({ input, sessionId })
      }).promise();

      const response = JSON.parse(result.Payload);
      const latency = Date.now() - startTime;

      // Store in DynamoDB
      await dynamodb.put({
        TableName: 'TreasuryContacts',
        Item: {
          contactId: sessionId,
          bureau,
          timestamp: new Date().toISOString(),
          input,
          response: response.body,
          latency,
          status: 'completed'
        }
      }).promise();

      return {
        statusCode: 200,
        body: JSON.stringify({
          type: 'agentResponse',
          sessionId,
          bureau,
          response: response.body,
          latency
        })
      };
    } catch (error) {
      console.error('Error invoking agent:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  if (message.action === 'subscribe') {
    return { statusCode: 200, body: JSON.stringify({ subscribed: true }) };
  }

  return { statusCode: 400, body: 'Unknown action' };
};
