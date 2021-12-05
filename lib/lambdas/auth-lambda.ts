import { Handler } from 'aws-lambda'

interface Event {
  headers: {
    Authorization: string
  },
  methodArn: string
}

interface IamStatement {
  Action: string
  Effect: string
  Resource: string
}

interface IamPolicy {
  policyDocument: {
    Version: string
    Statement: IamStatement[]
  }
  principalId: string
}

export const handler: Handler<Event, IamPolicy> = async (event) => {
  const authHeader = event.headers.Authorization
  const password = process.env.PASSWORD

  if (password && authHeader === password) {
    return iamPolicy('Allow', event.methodArn)
  }

  return iamPolicy('Deny', event.methodArn)
}

const iamPolicy = (effect: string, resource: string): IamPolicy => ({
  policyDocument: {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
      }
    ],
  },
  principalId: 'user',
})
