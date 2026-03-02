const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambda = new LambdaClient({});

const AR_VERIFIER_FUNCTION = process.env.AR_VERIFIER_FUNCTION;

exports.handler = async (event) => {
  const { response, policyId, context } = JSON.parse(event.body || '{}');
  
  try {
    // Invoke Automated Reasoning verifier
    const result = await lambda.send(new InvokeCommand({
      FunctionName: AR_VERIFIER_FUNCTION,
      Payload: JSON.stringify({
        response,
        policyId,
        context
      })
    }));
    
    const payload = JSON.parse(new TextDecoder().decode(result.Payload));
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        result: payload.result, // VALID, INVALID, NO_DATA
        rulesEvaluated: payload.rulesEvaluated || 0,
        variablesExtracted: payload.variablesExtracted || 0,
        proof: payload.proof || null,
        corrections: payload.corrections || [],
        latencyMs: payload.latencyMs || 0
      })
    };
  } catch (error) {
    console.error('AR verification error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        result: 'ERROR',
        error: error.message 
      })
    };
  }
};
