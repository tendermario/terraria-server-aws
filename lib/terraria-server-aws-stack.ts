import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'

export class TerrariaServerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

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
  }
}
