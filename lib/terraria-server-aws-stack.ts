require('dotenv').config()
import * as path from 'path'
import { readFileSync, existsSync } from 'fs'

import * as cdk from 'aws-cdk-lib'
import { Duration } from 'aws-cdk-lib'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions'
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'

const App = 'Terraria'


interface TerrariaServerStackProps extends cdk.StackProps {
  // The name of the world file
  worldFileName?: string;
  // The email for alarms to go to
  email: string;
  // The password set to turn on/off the server in the frontend UI
  UIpassword: string;
  // (Optional) The location of the world data, if you want to move a world onto the server 
  s3Files?: string;
}

// We create this under a class just to link together resources with 'this'
export class TerrariaServerStack extends cdk.Stack {
  constructor(scope: any, id: string, props: TerrariaServerStackProps) {
    super(scope, id, props)
    const {
      email,
      UIpassword,
      s3Files,
    } = props

    const worldFileName = props.worldFileName || 'world.wld'
    
    // S3
    const bucket = new s3.Bucket(this, 'ServerFiles', {versioned: true})
    const assetFiles = s3Files || ""

    if (assetFiles && !existsSync(assetFiles)) {
      throw "Cannot locate the files to upload to s3"
    }

    new s3deploy.BucketDeployment(this, `${App}DeployFiles-${id}`, {
      sources: [s3deploy.Source.asset(assetFiles)],
      destinationBucket: bucket,
      prune: false, // This makes it not delete the files if they already exist in s3
    });

    // UserData start-up commands for EC2 Instance
    const commands = readFileSync(path.join(__dirname, 'user-data.sh'), 'utf8')
    const commandsReplaced = commands.replace(new RegExp('s3BucketName', 'g'), bucket.bucketName)
            .replace(new RegExp('worldFileName', 'g'), worldFileName)

    const userData = ec2.UserData.forLinux()
    userData.addCommands(commandsReplaced)

    // EC2 Instance
    const vpc = new ec2.Vpc(this, `${App}VPC`, {
      enableDnsHostnames: true,
      enableDnsSupport: true,
    })

    const securityGroup = new ec2.SecurityGroup(this, `${App}SecurityGroup-${id}`, {
      vpc,
      description: `Access to server ports for ec2 instance`
    })
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(7777), `Allow ${App} server connections`)
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(7777), `Allow ${App} server connections`)
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'allow ssh access from the world')

    const ec2Instance = new ec2.Instance(this, `${id}Server`, {
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

    // ec2 access S3
    ec2Instance.role?.attachInlinePolicy(new iam.Policy(this, `${App}AccessS3-${id}`, {
      document: new iam.PolicyDocument({
        statements: [new iam.PolicyStatement({
          actions: ['s3:*'],
          resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
        })],
      }),
    }))

    const {instanceId} = ec2Instance
    // EC2 Instance has Elastic IP
    const eip = new ec2.CfnEIP(this, `${App}Ip-${id}`, {instanceId: instanceId})
    // List the IP in the output
    new cdk.CfnOutput(this, `${App}IpAddress-${id}`, { value: eip.ref });

    // Lambdas
    const lambdaDir = path.join(__dirname, 'lambdas')

    const startLambda = new lambda.NodejsFunction(this, `${App}StartServerLambda-${id}`, {
      entry: path.join(lambdaDir, 'start-lambda.ts'),
      handler: 'handler',
      functionName: `Start${App}ServerLambda`,
      environment: {
        'INSTANCE_ID': instanceId,
      },
    })
    startLambda.role?.attachInlinePolicy(new iam.Policy(this, `${App}StartEc2Policy-${id}`, {
      document: new iam.PolicyDocument({
        statements: [new iam.PolicyStatement({
          actions: ['ec2:StartInstances'],
          resources: ['*'],
        })],
      }),
    }))

    const stopLambda = new lambda.NodejsFunction(this, `${App}StopServerLambda-${id}`, {
      entry: path.join(lambdaDir, 'stop-lambda.ts'),
      handler: 'handler',
      functionName: `Stop${App}ServerLambda`,
      environment: {
        'INSTANCE_ID': instanceId,
      },
    })
    stopLambda.role?.attachInlinePolicy(new iam.Policy(this, `${App}StopEc2Policy-${id}`, {
      document: new iam.PolicyDocument({
        statements: [new iam.PolicyStatement({
          actions: ['ec2:StopInstances'],
          resources: ['*'],
        })],
      }),
    }))

    const statusLambda = new lambda.NodejsFunction(this, `${App}ServerStatusLambda-${id}`, {
      entry: path.join(lambdaDir, 'status-lambda.ts'),
      handler: 'handler',
      functionName: `${App}ServerStatusLambda`,
      environment: {
        'INSTANCE_ID': instanceId,
      },
    })
    statusLambda.role?.attachInlinePolicy(new iam.Policy(this, `${App}Ec2StatusPolicy-${id}`, {
      document: new iam.PolicyDocument({
        statements: [new iam.PolicyStatement({
          actions: ['ec2:DescribeInstanceStatus'],
          resources: ['*'],
        })],
      }),
    }))

    const authLambda = new lambda.NodejsFunction(this, `${App}ServerAuthLambda-${id}`, {
      entry: path.join(lambdaDir, 'auth-lambda.ts'),
      handler: 'handler',
      functionName: `${App}ServerAuthLambda`,
      environment: {
        'PASSWORD': UIpassword
      },
    })

    // API Gateway
    const api = new apigateway.RestApi(this, `${App}ServerApi-${id}`, {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Authorization'],
      }
    })
    const authorizer = new apigateway.RequestAuthorizer(this, `${App}ServerAuthorizer-${id}`, {
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
        namespace: `${App}ServerStack/Server-${id}`,
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
        namespace: `${App}TerrariaServerStack-${id}`,
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
