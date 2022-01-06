import { EC2Client, StartInstancesCommand } from '@aws-sdk/client-ec2'
import { APIGatewayProxyResult } from 'aws-lambda'

const {INSTANCE_ID} = process.env

export const handler = async (): Promise<APIGatewayProxyResult> => {
  let result, statusCode
  try {
    const ec2Result = await spinUpInstance(INSTANCE_ID)
    result = ec2Result.StartingInstances
      ?.find(i => i.InstanceId === INSTANCE_ID)
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
    body: JSON.stringify({ result }),
    isBase64Encoded: false,
  }
}

// Starts up an EC2 instance.
// For now, we are targeting an instance that we've already created.
const spinUpInstance = async (InstanceId: any) => {
  const client = new EC2Client({ region: 'us-west-2' })
  const command = new StartInstancesCommand({
    InstanceIds: [InstanceId],
  })

  return await client.send(command)
}
