import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as redis from 'aws-cdk-lib/aws-elasticache';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import { PaywayStack } from '../lib/payway-stack';

const app = new cdk.App();
new PaywayStack(app, 'PaywayStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'eu-west-1' },
});
void ec2;
void ecs;
void rds;
void redis;
void secrets;
