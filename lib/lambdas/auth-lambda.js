const iamPolicy = (effect, resource) => ({
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

exports.handler = async (event, context) => {
  const authHeader = event.headers.Authorization
  const password = process.env.PASSWORD

  if (password && authHeader === password) {
    return iamPolicy('Allow', event.methodArn)
  }

  return iamPolicy('Deny', event.methodArn)
}
