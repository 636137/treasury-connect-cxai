const { ConnectClient, GetMetricDataV2Command } = require('@aws-sdk/client-connect');

const connect = new ConnectClient({});

const INSTANCE_ID = process.env.CONNECT_INSTANCE_ID;

exports.handler = async (event) => {
  const { queueId, bureau } = JSON.parse(event.body || '{}');
  
  try {
    const now = new Date();
    const startTime = new Date(now.getTime() - 5 * 60 * 1000); // Last 5 minutes
    
    const response = await connect.send(new GetMetricDataV2Command({
      ResourceArn: `arn:aws:connect:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:instance/${INSTANCE_ID}/queue/${queueId}`,
      StartTime: startTime,
      EndTime: now,
      Filters: [{
        FilterKey: 'QUEUE',
        FilterValues: [queueId]
      }],
      Metrics: [
        { Name: 'CONTACTS_IN_QUEUE' },
        { Name: 'OLDEST_CONTACT_AGE' },
        { Name: 'AGENTS_AVAILABLE' },
        { Name: 'AGENTS_STAFFED' },
        { Name: 'AVG_HANDLE_TIME' },
        { Name: 'AVG_SPEED_OF_ANSWER' },
        { Name: 'SERVICE_LEVEL' },
        { Name: 'CONTACTS_ABANDONED' }
      ]
    }));
    
    const metrics = response.MetricResults?.[0]?.Collections?.[0]?.Metric || {};
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        queueName: `${bureau}_Tier1`,
        depth: metrics.CONTACTS_IN_QUEUE || 0,
        oldestContactSec: metrics.OLDEST_CONTACT_AGE || 0,
        availableAgents: metrics.AGENTS_AVAILABLE || 0,
        staffedAgents: metrics.AGENTS_STAFFED || 0,
        avgHandleTimeSec: metrics.AVG_HANDLE_TIME || 0,
        avgSpeedAnswerSec: metrics.AVG_SPEED_OF_ANSWER || 0,
        serviceLevel: metrics.SERVICE_LEVEL || 0,
        abandonmentRate: metrics.CONTACTS_ABANDONED || 0,
        timestamp: now.toISOString()
      })
    };
  } catch (error) {
    console.error('Queue metrics error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
