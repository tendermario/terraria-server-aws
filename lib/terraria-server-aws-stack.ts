require('dotenv').config()
const crypto = require('crypto')
import * as path from 'path'

import * as apigateway from '@aws-cdk/aws-apigateway'
import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda-nodejs'
import { Duration } from '@aws-cdk/core'

export class TerrariaServerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const lambdaDir = path.join(__dirname, 'lambdas')

    const startLambda = new lambda.NodejsFunction(this, 'StartTerrariaServerLambda', {
      entry: path.join(lambdaDir, 'start-lambda.ts'),
      handler: 'handler',
      functionName: 'StartTerrariaServerLambda',
    })

    const stopLambda = new lambda.NodejsFunction(this, 'StopTerrariaServerLambda', {
      entry: path.join(lambdaDir, 'stop-lambda.js'),
      handler: 'handler',
      functionName: 'StopTerrariaServerLambda',
    })

    const statusLambda = new lambda.NodejsFunction(this, 'TerrariaServerStatusLambda', {
      entry: path.join(lambdaDir, 'status-lambda.js'),
      handler: 'handler',
      functionName: 'TerrariaServerStatusLambda',
    })

    const authLambda = new lambda.NodejsFunction(this, 'TerrariaServerAuthLambda', {
      entry: path.join(lambdaDir, 'auth-lambda.js'),
      handler: 'handler',
      functionName: 'TerrariaServerAuthLambda',
      environment: {
        'PASSWORD': process.env.PASSWORD ?? crypto.randomUUID()
      },
    })

    const api = new apigateway.RestApi(this, 'TerrariaServerApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Authorization'],
      }
    })
    const authorizer = new apigateway.RequestAuthorizer(this, 'TerrariaServerAuthorizer', {
      handler: authLambda,
      identitySources: [apigateway.IdentitySource.header('Authorization')],
      resultsCacheTtl: Duration.seconds(0),
    })

    api.root
      .addResource('start')
      .addMethod('POST', new apigateway.LambdaIntegration(startLambda), { authorizer })

    api.root
      .addResource('stop')
      .addMethod('POST', new apigateway.LambdaIntegration(stopLambda), { authorizer })

    api.root
      .addResource('status')
      .addMethod('GET', new apigateway.LambdaIntegration(statusLambda))
  }
}
