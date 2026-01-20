import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as elasticache from 'aws-cdk-lib/aws-elasticache'

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // VPC for database resources
    const vpc = new ec2.Vpc(this, 'InfrastructureVpc', {
      maxAzs: 2,
      natGateways: 1,
    })

    // Cloudflare CDN (cloudflare)
    // Custom resource implementation needed

    // Django Application (laravel)
    // Custom resource implementation needed

    // DynamoDB
    const db_dynamodb = new rds.DatabaseInstance(this, 'DynamoDB', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      allocatedStorage: 20,
    })

    // MongoDB
    const db_mongodb = new rds.DatabaseInstance(this, 'MongoDB', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      allocatedStorage: 20,
    })

    // Redis Cache
    const db_redis = new elasticache.CfnCacheCluster(this, 'Redis Cache', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
    })

    // Outputs
   
    new cdk.CfnOutput(this, 'Django_ApplicationOutput', { 
      value: app.node.addr,
      description: 'Django Application resource identifier'
    })
    new cdk.CfnOutput(this, 'DynamoDBOutput', { 
      value: db_dynamodb.node.addr,
      description: 'DynamoDB resource identifier'
    })
    new cdk.CfnOutput(this, 'MongoDBOutput', { 
      value: db_mongodb.node.addr,
      description: 'MongoDB resource identifier'
    })
    new cdk.CfnOutput(this, 'Redis_CacheOutput', { 
      value: db_redis.node.addr,
      description: 'Redis Cache resource identifier'
    })
  }
}

const app = new cdk.App()
new CdkStack(app, 'InfrastructureStack')
app.synth()
