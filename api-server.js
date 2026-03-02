#!/usr/bin/env node
/**
 * Simple Express API server for real agent invocation
 * Bridges React UI to deployed AgentCore runtimes
 */
const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');
const WebSocket = require('ws');

const app = express();
const lambda = new AWS.Lambda({ region: 'us-east-1' });
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

app.use(cors());
app.use(express.json());

const RUNTIMES = {
  IRS: 'TreasuryAgentCoreStack-AgentIRSRuntimeEF528323-jDt5qsNk3hyR',
  MINT: 'TreasuryAgentCoreStack-AgentMINTRuntime14C8D456-SBKYsYEZF0Eg',
  TOP: 'TreasuryAgentCoreStack-AgentTOPRuntime071D2934-HPN9JTUkogG9',
  TD: 'TreasuryAgentCoreStack-AgentTDRuntimeA5106084-C1YR5ulT2wLJ',
  DE: 'TreasuryAgentCoreStack-AgentDERuntime778B6C5C-IADf7Pmqvk32'
};

// Invoke real agent
app.post('/api/invoke-agent', async (req, res) => {
  const { bureau, message, sessionId } = req.body;
  
  const functionName = RUNTIMES[bureau];
  if (!functionName) {
    return res.status(400).json({ error: 'Invalid bureau' });
  }

  try {
    const start = Date.now();
    const result = await lambda.invoke({
      FunctionName: functionName,
      Payload: JSON.stringify({ input: message, sessionId })
    }).promise();

    const response = JSON.parse(result.Payload);
    const latency = Date.now() - start;

    // Store in DynamoDB
    await dynamodb.put({
      TableName: 'TreasuryContacts',
      Item: {
        contactId: sessionId,
        bureau,
        timestamp: new Date().toISOString(),
        input: message,
        response: response.body,
        latency
      }
    }).promise();

    res.json({
      response: response.body,
      latency,
      sessionId,
      bureau
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recent contacts
app.get('/api/contacts', async (req, res) => {
  try {
    const result = await dynamodb.scan({
      TableName: 'TreasuryContacts',
      Limit: 20
    }).promise();

    res.json({ contacts: result.Items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', backend: 'real' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n✅ Real backend API running on http://localhost:${PORT}`);
  console.log(`📡 Connected to deployed AgentCore runtimes`);
  console.log(`🗄️  Using DynamoDB table: TreasuryContacts\n`);
});
