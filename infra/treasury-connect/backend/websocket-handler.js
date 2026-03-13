const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME || "TreasuryContacts";

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const routeKey = event.requestContext.routeKey;

  if (routeKey === "$connect") {
    return { statusCode: 200, body: "Connected" };
  }

  if (routeKey === "$disconnect") {
    return { statusCode: 200, body: "Disconnected" };
  }

  if (routeKey === "getContacts") {
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": "ACTIVE_CONTACTS" },
      Limit: 50,
      ScanIndexForward: false
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ contacts: result.Items || [] })
    };
  }

  return { statusCode: 400, body: "Unknown route" };
};
