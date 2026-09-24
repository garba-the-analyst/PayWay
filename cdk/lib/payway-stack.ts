import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

/**
 * PayWay eu-west-1: VPC + ECS Fargate (API+worker) + RDS Postgres Multi-AZ
 * + ElastiCache Redis + Secrets Manager. API Gateway + WAF attached at deploy.
 */
export class PaywayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'PaywayVpc', { maxAzs: 3, natGateways: 1 });

    const cluster = new ecs.Cluster(this, 'PaywayCluster', { vpc });

    const db = new rds.DatabaseInstance(this, 'PaywayDb', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.MICRO),
      vpc,
      multiAz: true,
      allocatedStorage: 20,
      databaseName: 'payway',
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
    });

    const apiSecrets = new secrets.Secret(this, 'PaywaySecrets', {
      secretName: 'payway/eu-west-1/api',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ DATABASE_URL: '' }),
        generateStringKey: 'placeholder',
      },
    });

    const task = new ecs.FargateTaskDefinition(this, 'PaywayTask', { cpu: 512, memoryLimitMiB: 1024 });
    task.addContainer('api', {
      image: ecs.ContainerImage.fromRegistry('payway/api:latest'),
      portMappings: [{ containerPort: 3000 }],
      environment: { AWS_REGION: 'eu-west-1', DEFAULT_CURRENCY: 'USD' },
      secrets: { DATABASE_URL: ecs.Secret.fromSecretsManager(apiSecrets, 'DATABASE_URL') },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'payway-api' }),
    });

    new ecs.FargateService(this, 'PaywayService', {
      cluster,
      taskDefinition: task,
      desiredCount: 2,
      assignPublicIp: false,
    });

    new cdk.CfnOutput(this, 'DbEndpoint', { value: db.dbInstanceEndpointAddress });
    new cdk.CfnOutput(this, 'SecretsArn', { value: apiSecrets.secretArn });
  }
}
