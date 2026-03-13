const { VerifiedPermissionsClient, IsAuthorizedCommand } = require('@aws-sdk/client-verifiedpermissions');

const avp = new VerifiedPermissionsClient({});

const POLICY_STORE_ID = process.env.POLICY_STORE_ID;

exports.handler = async (event) => {
  const { principal, action, resource, context } = JSON.parse(event.body || '{}');
  
  try {
    const response = await avp.send(new IsAuthorizedCommand({
      policyStoreId: POLICY_STORE_ID,
      principal: {
        entityType: 'TreasuryConnect::Agent',
        entityId: principal
      },
      action: {
        actionType: 'TreasuryConnect::Action',
        actionId: action
      },
      resource: {
        entityType: 'TreasuryConnect::Tool',
        entityId: resource
      },
      context: {
        contextMap: context
      }
    }));
    
    const decision = response.decision; // ALLOW or DENY
    const determiningPolicies = response.determiningPolicies || [];
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        decision,
        allowed: decision === 'ALLOW',
        policies: determiningPolicies.map(p => p.policyId),
        evaluationTimeMs: response.$metadata.totalRetryDelay || 0
      })
    };
  } catch (error) {
    console.error('Policy evaluation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        decision: 'DENY',
        error: error.message 
      })
    };
  }
};
