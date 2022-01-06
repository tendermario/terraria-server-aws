require('dotenv').config()
const crypto = require('crypto')
import * as path from 'path'
import { readFileSync } from 'fs'

import * as cdk from 'aws-cdk-lib'
import { Duration } from 'aws-cdk-lib'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import { Topic, } from 'aws-cdk-lib/aws-sns'
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions'
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions'

const App = 'Terraria'
const email = process.env.EMAIL ?? ""
const password = process.env.PASSWORD ?? crypto.randomUUID()

// We create this under a class just to link together resources with 'this'
export class TerrariaServerStack extends cdk.Stack {
  constructor(scope: any, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // UserData start-up commands for EC2 Instance
    const commands = readFileSync(path.join(__dirname, 'user-data.sh'), 'utf8')
    const userData = ec2.UserData.forLinux()
    userData.addCommands(commands)

    // EC2 Instance
    const vpc = new ec2.Vpc(this, `${App}VPC`, {
      enableDnsHostnames: true,
      enableDnsSupport: true,
    })

    const securityGroup = new ec2.SecurityGroup(this, `${App}SecurityGroup`, {
      vpc,
      description: `Access to server ports for ec2 instance`
    })
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(7777), `Allow ${App} server connections`)
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(7777), `Allow ${App} server connections`)
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'allow ssh access from the world')

    const ec2Instance = new ec2.Instance(this, `Server`, {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.SMALL),
      keyName: 'ec2-key-pair',
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      securityGroup,
      userData,
      userDataCausesReplacement: true,
    })
    const {instanceId} = ec2Instance
    // EC2 Instance has Elastic IP
    const eip = new ec2.CfnEIP(this, `${App}Ip`, {instanceId: instanceId})
    // List the IP in the output
    new cdk.CfnOutput(this, `${App}IpAddress`, { value: eip.ref });

    // Lambdas
    const lambdaDir = path.join(__dirname, 'lambdas')

    const startLambda = new lambda.NodejsFunction(this, `Start${App}ServerLambda`, {
      entry: path.join(lambdaDir, 'start-lambda.ts'),
      handler: 'handler',
      functionName: `Start${App}ServerLambda`,
      environment: {
        'INSTANCE_ID': instanceId,
      },
    })
    startLambda.role?.attachInlinePolicy(new iam.Policy(this, `Start${App}Ec2Policy`, {
      document: new iam.PolicyDocument({
        statements: [new iam.PolicyStatement({
          actions: ['ec2:StartInstances'],
          resources: ['*'],
        })],
      }),
    }))

    const stopLambda = new lambda.NodejsFunction(this, `Stop${App}ServerLambda`, {
      entry: path.join(lambdaDir, 'stop-lambda.ts'),
      handler: 'handler',
      functionName: `Stop${App}ServerLambda`,
      environment: {
        'INSTANCE_ID': instanceId,
      },
    })
    stopLambda.role?.attachInlinePolicy(new iam.Policy(this, `Stop${App}Ec2Policy`, {
      document: new iam.PolicyDocument({
        statements: [new iam.PolicyStatement({
          actions: ['ec2:StopInstances'],
          resources: ['*'],
        })],
      }),
    }))

    const statusLambda = new lambda.NodejsFunction(this, `${App}ServerStatusLambda`, {
      entry: path.join(lambdaDir, 'status-lambda.ts'),
      handler: 'handler',
      functionName: `${App}ServerStatusLambda`,
      environment: {
        'INSTANCE_ID': instanceId,
      },
    })
    statusLambda.role?.attachInlinePolicy(new iam.Policy(this, `${App}Ec2StatusPolicy`, {
      document: new iam.PolicyDocument({
        statements: [new iam.PolicyStatement({
          actions: ['ec2:DescribeInstanceStatus'],
          resources: ['*'],
        })],
      }),
    }))

    const authLambda = new lambda.NodejsFunction(this, `${App}ServerAuthLambda`, {
      entry: path.join(lambdaDir, 'auth-lambda.ts'),
      handler: 'handler',
      functionName: `${App}ServerAuthLambda`,
      environment: {
        'PASSWORD': password
      },
    })

    // API Gateway
    const api = new apigateway.RestApi(this, `${App}ServerApi`, {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Authorization'],
      }
    })
    const authorizer = new apigateway.RequestAuthorizer(this, `${App}ServerAuthorizer`, {
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

    // Alarms

    // This topic is how emails get sent on alarm, just .addAlarmAction(emailAlarmAction) to attach it to an alarm
    const emailAlarm = new Topic(this, 'EmailAlarms')
    emailAlarm.addSubscription(new EmailSubscription(email))
    const emailAlarmAction = new SnsAction(emailAlarm)

    new cloudwatch.Alarm(this, `${App} ec2 instance high CPU usage`, {
      metric: new cloudwatch.Metric({
        namespace: 'TerrariaServerStack/Server',
        metricName: 'CPUUtilization',
        statistic: 'avg',
        label: 'Average CPU usage %'
      }),
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      threshold: 98,
      treatMissingData: cloudwatch.TreatMissingData.IGNORE,
      alarmName: `${App} ec2 instance high CPU usage`,
    }).addAlarmAction(emailAlarmAction)

    // TODO: Create a memory usage check - might be a bit more complicated with MemoryUtilized and MemoryReserved metrics
    // Or use `sudo yum install amazon-cloudwatch-agent` and add an IAM policy to let the instance report CloudWatch Agent metrics

    // Create alarms on instance being on for 8 hours, 24 hours
    const alarmOnUptime = (hour: number) => new cloudwatch.Alarm(this, `${App} ec2 instance on for ${hour} hours`, {
      metric: new cloudwatch.Metric({
        namespace: 'TerrariaServerStack/Server',
        metricName: 'CPUUtilization',
        statistic: 'avg',
        label: 'Average CPU usage %',
        period: Duration.hours(1),
      }),
      evaluationPeriods: hour,
      datapointsToAlarm: hour,
      threshold: 0,
      treatMissingData: cloudwatch.TreatMissingData.IGNORE,
      alarmName: `${App} ec2 instance on for ${hour} hours`,
    }).addAlarmAction(emailAlarmAction)
    
    ;[8,16,24].forEach(alarmOnUptime)
  }
}
