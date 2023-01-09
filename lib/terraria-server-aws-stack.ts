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

const generation = ec2.AmazonLinuxGeneration.AMAZON_LINUX_2

// The type you want will be based mostly on:
// - The arch built for the docker image. Can reference https://hub.docker.com/r/ryshe/terraria/tags to see which
//   architecture you want.
// - The performance that architecture is best suited for.

interface InstanceTypes {
  [index: string]: {
    instanceClass: ec2.InstanceClass
    cpuType: ec2.AmazonLinuxCpuType
  }
}

// Add to this list if you want more options.
const instanceTypes = {
  // AMD64
  t3: {
    instanceClass: ec2.InstanceClass.BURSTABLE3_AMD,
    cpuType: ec2.AmazonLinuxCpuType.X86_64
  },
  // ARM64
  t4g: {
    instanceClass: ec2.InstanceClass.BURSTABLE4_GRAVITON,
    cpuType: ec2.AmazonLinuxCpuType.ARM_64
  },
}

interface TerrariaServerStackProps extends cdk.StackProps {
  // The IAM keypair associated with your root account or ideally your IAM user you use the CLI with.
  keyName: string
  // The email for alarms to go to
  email: string
  // The password set to turn on/off the server in the frontend UI
  UIpassword: string
  // (Optional) The name of the world file
  worldFileName?: string // Default: 'world.wld'
  // (Optional) The location of the world data, if you want to move a world onto the server 
  s3Files?: string // Default: none
  // (Optional) Whether to create an Elastic IP or not. Look below to see the guessed costs associated with it
  useElasticIP?: boolean // Default: false
  // (Optional) This allows deployment to OVERWRITE the files in S3 of an existing server
  // Luckily if an accidental overwrite happens, you should be able to go into S3 and roll back the file version.
  overwriteServerFiles?: boolean // Default: false

  // (Optional) Container type/size
  instanceType?: string
  instanceSize?: ec2.InstanceSize
 }

// We create this under a class just to link together resources with 'this'
export class TerrariaServerStack extends cdk.Stack {
  constructor(scope: any, id: string, props: TerrariaServerStackProps) {
    const app = 'Terraria'
    const service = `${app}-${id}` // Lambdas cant seem to handle `/` or " " in their names.
    super(scope, service, props)
    const {
      email,
      UIpassword,
      s3Files,
      overwriteServerFiles,
    } = props
    const {region} = this

    const instanceType = props.instanceType || 't3'
    const instanceSize = props.instanceSize || ec2.InstanceSize.SMALL
    const worldFileName = props.worldFileName || 'world.wld'
    const useElasticIP = props.useElasticIP || false
    const {instanceClass, cpuType} = instanceTypes[instanceType]
    
    // S3
    const bucket = new s3.Bucket(this, 'ServerFiles', {versioned: true})
    const assetFiles = s3Files || ""

    if (assetFiles && existsSync(assetFiles)) {
      new s3deploy.BucketDeployment(this, `${service}DeployFiles`, {
        sources: [s3deploy.Source.asset(assetFiles)],
        destinationBucket: bucket,
        prune: Boolean(overwriteServerFiles),
      });
    }

    // UserData start-up commands for EC2 Instance
    const commands = readFileSync(path.join(__dirname, 'user-data.sh'), 'utf8')
    const commandsReplaced = commands.replace(new RegExp('s3BucketName', 'g'), bucket.bucketName)
            .replace(new RegExp('worldFileName', 'g'), worldFileName)

    const userData = ec2.UserData.forLinux()
    userData.addCommands(commandsReplaced)

    // EC2 Instance
    const vpc = ec2.Vpc.fromLookup(this, "VPC", {isDefault: true})

    const securityGroup = new ec2.SecurityGroup(this, `${service}-SecurityGroup`, {
      vpc,
      description: `Access to server ports for ec2 instance`
    })
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(7777), `Allow ${app} server connections`)
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(7777), `Allow server connections`)
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), `Allow ssh access from the world`)

    const ec2Instance = new ec2.Instance(this, `Server`, {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(instanceClass, instanceSize),
      keyName,
      machineImage: new ec2.AmazonLinuxImage({
        generation,
        cpuType,
      }),
      securityGroup,
      userData,
      userDataCausesReplacement: true,
    })

    // ec2 access S3
    ec2Instance.role?.attachInlinePolicy(new iam.Policy(this, `${service}-AccessS3`, {
      document: new iam.PolicyDocument({
        statements: [new iam.PolicyStatement({
          actions: ['s3:*'],
          resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
        })],
      }),
    }))

    const {instanceId} = ec2Instance

    // I think I'll just not do an EIP unless I can get only one EIP provisioned
    if (useElasticIP) {
      // EC2 Instance has Elastic IP
      // Note: It costs 0.5 cents per hour to have an elastic IP address beyond your first one.
      // For some reason, it's creating 3 elastic IP addresses - one for this, and two for the
      // public subnets. At ~730 hrs/month, this makes it:
      // First server is $3.65/mo * 2 EIPs = $7.30/mo
      // each additional server is $3.65 * 3 = $10.95/mo
      const eip = new ec2.CfnEIP(this, `${service}-Ip`, {instanceId})
      // List the IP in the output
      new cdk.CfnOutput(this, `${service}-IpAddress`, { value: eip.ref });
    } else {
      // TODO: Output ec2 IP
    }

    // Lambdas
    const lambdaDir = path.join(__dirname, 'lambdas')

    const startLambda = new lambda.NodejsFunction(this, `${service}-StartServerLambda`, {
      entry: path.join(lambdaDir, 'start-lambda.ts'),
      handler: 'handler',
      functionName: `${service}-StartServerLambda`,
      environment: {
        'INSTANCE_ID': instanceId,
        'REGION': region,
      },
    })
    startLambda.role?.attachInlinePolicy(new iam.Policy(this, `${service}-StartEc2Policy`, {
      document: new iam.PolicyDocument({
        statements: [new iam.PolicyStatement({
          actions: ['ec2:StartInstances'],
          resources: ['*'],
        })],
      }),
    }))

    const stopLambda = new lambda.NodejsFunction(this, `${service}-StopServerLambda`, {
      entry: path.join(lambdaDir, 'stop-lambda.ts'),
      handler: 'handler',
      functionName: `${service}-StopServerLambda`,
      environment: {
        'INSTANCE_ID': instanceId,
        'REGION': region,
      },
    })
    stopLambda.role?.attachInlinePolicy(new iam.Policy(this, `${service}-StopEc2Policy`, {
      document: new iam.PolicyDocument({
        statements: [new iam.PolicyStatement({
          actions: ['ec2:StopInstances'],
          resources: ['*'],
        })],
      }),
    }))

    const statusLambda = new lambda.NodejsFunction(this, `${service}-ServerStatusLambda`, {
      entry: path.join(lambdaDir, 'status-lambda.ts'),
      handler: 'handler',
      functionName: `${service}-ServerStatusLambda`,
      environment: {
        'INSTANCE_ID': instanceId,
        'REGION': region,
      },
    })
    statusLambda.role?.attachInlinePolicy(new iam.Policy(this, `${service}-Ec2StatusPolicy`, {
      document: new iam.PolicyDocument({
        statements: [new iam.PolicyStatement({
          actions: ['ec2:DescribeInstanceStatus'],
          resources: ['*'],
        })],
      }),
    }))

    const authLambda = new lambda.NodejsFunction(this, `${service}-ServerAuthLambda`, {
      entry: path.join(lambdaDir, 'auth-lambda.ts'),
      handler: 'handler',
      functionName: `${service}-ServerAuthLambda`,
      environment: {
        'PASSWORD': UIpassword
      },
    })

    // API Gateway
    const api = new apigateway.RestApi(this, `${service}-ServerApi`, {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Authorization'],
      }
    })
    const authorizer = new apigateway.RequestAuthorizer(this, `${service}-ServerAuthorizer`, {
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
    const emailAlarm = new Topic(this, `${service}-EmailAlarms`)
    emailAlarm.addSubscription(new EmailSubscription(email))
    const emailAlarmAction = new SnsAction(emailAlarm)

    new cloudwatch.Alarm(this, `${service}- ec2 instance high CPU usage`, {
      metric: new cloudwatch.Metric({
        namespace: `${service}-ServerStack/Server`,
        metricName: 'CPUUtilization',
        statistic: 'avg',
        label: 'Average CPU usage %'
      }),
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      threshold: 90,
      treatMissingData: cloudwatch.TreatMissingData.IGNORE,
      alarmName: `${service}- ec2 instance high CPU usage`,
    }).addAlarmAction(emailAlarmAction)

    // TODO: Create a memory usage check - might be a bit more complicated with MemoryUtilized and MemoryReserved metrics
    // Or use `sudo yum install amazon-cloudwatch-agent` and add an IAM policy to let the instance report CloudWatch Agent metrics

    // Create alarms on instance being on for 8 hours, 24 hours
    const alarmOnUptime = (hour: number) => new cloudwatch.Alarm(this, `${service}-ec2 instance on for ${hour} hours`, {
      metric: new cloudwatch.Metric({
        namespace: `${service}-ServerStack`,
        metricName: 'CPUUtilization',
        statistic: 'avg',
        label: 'Average CPU usage %',
        period: Duration.hours(hour),
      }),
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      threshold: 0,
      treatMissingData: cloudwatch.TreatMissingData.IGNORE,
      alarmName: `${service}-ec2 instance on for ${hour} hours`,
    }).addAlarmAction(emailAlarmAction)
    
    ;[8,16,24].forEach(alarmOnUptime)
  }
}
