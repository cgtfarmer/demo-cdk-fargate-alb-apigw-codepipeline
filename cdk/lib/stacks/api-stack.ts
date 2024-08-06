import { Construct } from 'constructs';
import { Duration, Size, Stack, StackProps } from 'aws-cdk-lib';
import { CorsHttpMethod, HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpAlbIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { InstanceClass, InstanceSize, InstanceType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { AwsLogDriverMode, Cluster, FargateService, FargateTaskDefinition, LogDrivers, Protocol, AssetImage, DeploymentControllerType } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { EcsDeploymentConfig, EcsDeploymentGroup } from 'aws-cdk-lib/aws-codedeploy';

interface ApiStackProps extends StackProps {
  vpc: Vpc;
}

export class ApiStack extends Stack {

  public readonly ecsDeploymentGroup: EcsDeploymentGroup;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const cluster = new Cluster(this, 'Cluster', {
      vpc: props.vpc,
      capacity: {
        instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.NANO),
        desiredCapacity: 2,
        maxCapacity: 2,
      }
    });

    const taskDefinition = new FargateTaskDefinition(this, 'TaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
    });

    taskDefinition.addContainer('DefaultContainer', {
      image: AssetImage.fromAsset('src/user-service', {
        // References: Dockerfile "FROM (...) AS <target-name>"
        target: 'user-service',
      }),
      memoryLimitMiB: 512,
      logging: LogDrivers.awsLogs({
        streamPrefix: 'TestStreamPrefix',
        mode: AwsLogDriverMode.NON_BLOCKING,
        maxBufferSize: Size.mebibytes(25),
      }),
      portMappings: [ { containerPort: 80, protocol: Protocol.TCP, } ],
      healthCheck: {
        command: [ "CMD-SHELL", "curl -f http://localhost:80/health || exit 1" ],
        interval: Duration.minutes(1),
        retries: 3,
        startPeriod: Duration.minutes(1),
        timeout: Duration.minutes(1),
      },
      environment: {
        TEST_VALUE: 'test-value',
      },
    });

    const fargateService = new FargateService(this, 'FargateService', {
      cluster,
      taskDefinition,
      assignPublicIp: false,
      desiredCount: 2,
      deploymentController: {
        type: DeploymentControllerType.CODE_DEPLOY,
      },
    });

    const alb = new ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
      vpc: props.vpc,
      internetFacing: false,
    });

    const listener = alb.addListener('AlbListener', { port: 80 });

    const blueTargetGroup = listener.addTargets('target', {
      port: 80,
      targets: [ fargateService ],
      healthCheck: {
        path: '/health',
        interval: Duration.minutes(2),
        timeout: Duration.minutes(1),
      }
    });

    const greenTargetGroup = listener.addTargets('target', {
      port: 80,
      targets: [ fargateService ],
      healthCheck: {
        path: '/health',
        interval: Duration.minutes(2),
        timeout: Duration.minutes(1),
      }
    });

    this.ecsDeploymentGroup = new EcsDeploymentGroup(this, 'BlueGreenDG', {
      service: fargateService,
      blueGreenDeploymentConfig: {
        blueTargetGroup,
        greenTargetGroup,
        listener,
      },
      deploymentConfig: EcsDeploymentConfig.ALL_AT_ONCE,
    });

    const httpAlbIntegration = new HttpAlbIntegration('DefaultIntegration', listener);

    const httpApi = new HttpApi(this, 'HttpApi', {
      createDefaultStage: false,
      corsPreflight: {
        allowHeaders: ['Authorization'],
        allowMethods: [CorsHttpMethod.ANY],
        allowOrigins: ['*'],
        maxAge: Duration.days(10),
      },
    });

    httpApi.addStage('DefaultStage', {
      stageName: '$default',
      autoDeploy: true,
      throttle: {
        burstLimit: 2,
        rateLimit: 1,
      }
    });

    httpApi.addRoutes({
      path: '/users',
      methods: [HttpMethod.GET, HttpMethod.POST],
      integration: httpAlbIntegration,
    });

    httpApi.addRoutes({
      path: '/users/{id}',
      methods: [HttpMethod.GET, HttpMethod.PUT, HttpMethod.DELETE],
      integration: httpAlbIntegration,
    });
  }
}
