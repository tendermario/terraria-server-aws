require('dotenv').config()
const crypto = require('crypto')
import * as path from 'path'

import * as apigateway from '@aws-cdk/aws-apigateway'
import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'

export class TerrariaServerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const lambdaDir = path.join(__dirname, 'lambdas')

    const startLambda = new lambda.Function(this, 'StartTerrariaServerLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('TODO'),
      functionName: 'StartTerrariaServerLambda',
    })

    const stopLambda = new lambda.Function(this, 'StopTerrariaServerLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('TODO'),
      functionName: 'StopTerrariaServerLambda',
    })

    const statusLambda = new lambda.Function(this, 'TerrariaServerStatusLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('TODO'),
      functionName: 'TerrariaServerStatusLambda',
    })

    const authLambda = new lambda.Function(this, 'TerrariaServerAuthLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.AssetCode.fromAsset(lambdaDir + '/auth-lambda'),
      functionName: 'TerrariaServerAuthLambda',
      environment: {
        'PASSWORD': process.env.PASSWORD ?? crypto.randomUUID()
      },
    })

    const api = new apigateway.RestApi(this, 'TerrariaServerApi')
    const authorizer = new apigateway.RequestAuthorizer(this, 'TerrariaServerAuthorizer', {
      handler: authLambda,
      identitySources: [apigateway.IdentitySource.header('Authorization')]
    })

    api.root
      .addResource('start')
      .addMethod('POST', new apigateway.LambdaIntegration(startLambda), { authorizer })

    api.root
      .addResource('stop')
      .addMethod('POST', new apigateway.LambdaIntegration(stopLambda), { authorizer })

    api.root
      .addResource('status')
      .addMethod('GET', new apigateway.LambdaIntegration(statusLambda), { authorizer })
  }
}
