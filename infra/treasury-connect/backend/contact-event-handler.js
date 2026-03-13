const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME || "TreasuryContacts";

exports.handler = async (event) => {
  console.log("Contact Event:", JSON.stringify(event, null, 2));
  
  const contactId = event.Details?.ContactData?.ContactId;
  if (!contactId) return { statusCode: 400, body: "No ContactId" };

  const eventType = event.Name || event.EventType;
  const timestamp = new Date().toISOString();

  const contactData = {
    contactId,
    eventType,
    timestamp,
    channel: event.Details?.ContactData?.Channel,
    queue: event.Details?.ContactData?.Queue?.Name,
    attributes: event.Details?.ContactData?.Attributes || {},
    initiationMethod: event.Details?.ContactData?.InitiationMethod,
    rawEvent: event
  };

  await ddb.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `CONTACT#${contactId}`,
      SK: `EVENT#${timestamp}`,
      ...contactData,
      TTL: Math.floor(Date.now() / 1000) + 86400 * 7
    }
  }));

  // Broadcast to WebSocket clients if endpoint provided
  if (process.env.WS_ENDPOINT) {
    await broadcastToClients(contactData);
  }

  return { statusCode: 200, body: "OK" };
};

async function broadcastToClients(data) {
  // Implementation for WebSocket broadcast
  console.log("Broadcasting:", data);
}
