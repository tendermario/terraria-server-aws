import { EC2Client, StopInstancesCommand } from '@aws-sdk/client-ec2'
import { APIGatewayProxyResult } from 'aws-lambda'

const {INSTANCE_ID: instanceId, REGION: region} = process.env

export const handler = async (): Promise<APIGatewayProxyResult> => {
  let result, statusCode
  try {
    const ec2Result = await spinDownInstance({instanceId, region})
    result = ec2Result.StoppingInstances
      ?.find(i => i.InstanceId === instanceId)
      ?.CurrentState?.Name
    statusCode = result ? 200 : 404
    result = result ?? 'not found'
  } catch (e) {
    console.error(`[ERROR] ${e}`)
    statusCode = 500
    result = 'error'
  }

  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({result}),
    isBase64Encoded: false,
  }
}

// Stops an EC2 instance.
// For now, we are targeting an instance that we've already created.
const spinDownInstance = async ({instanceId, region}) => {
  const client = new EC2Client({region})
  const command = new StopInstancesCommand({
    InstanceIds: [instanceId],
  })

  return await client.send(command)
}
