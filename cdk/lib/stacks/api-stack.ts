import { Construct } from 'constructs';
import { Duration, Size, Stack, StackProps } from 'aws-cdk-lib';
import { CorsHttpMethod, HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpAlbIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { InstanceClass, InstanceSize, InstanceType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { AwsLogDriverMode, Cluster, FargateService, FargateTaskDefinition, LogDrivers, Protocol, AssetImage, DeploymentControllerType, ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancer, ApplicationTargetGroup, ListenerAction, WeightedTargetGroup } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { EcsDeploymentConfig, EcsDeploymentGroup } from 'aws-cdk-lib/aws-codedeploy';
import { IRepository } from 'aws-cdk-lib/aws-ecr';

interface ApiStackProps extends StackProps {
  vpc: Vpc;

  ecrRepository: IRepository
}

export class ApiStack extends Stack {

  public readonly ecsDeploymentGroup: EcsDeploymentGroup;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const cluster = new Cluster(this, 'Cluster', {
      vpc: props.vpc,
      // capacity: {
      //   instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.NANO),
      //   maxCapacity: 3,
      // }
    });

    const taskDefinition = new FargateTaskDefinition(this, 'TaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
    });

    const appPort = 80;

    taskDefinition.addContainer('DefaultContainer', {
      image: ContainerImage.fromEcrRepository(props.ecrRepository, 'latest'),
      // image: AssetImage.fromAsset('src/user-service', {
      //   // References: Dockerfile "FROM (...) AS <target-name>"
      //   target: 'user-service',
      // }),
      // cpu: 256,
      // memoryLimitMiB: 512,
      logging: LogDrivers.awsLogs({
        streamPrefix: 'TestStreamPrefix',
        mode: AwsLogDriverMode.NON_BLOCKING,
        maxBufferSize: Size.mebibytes(25),
      }),
      portMappings: [ { hostPort: appPort, containerPort: appPort, protocol: Protocol.TCP, } ],
      healthCheck: {
        command: [ "CMD-SHELL", `curl -f http://localhost:${appPort}/health || exit 1` ],
        interval: Duration.minutes(1),
        retries: 3,
        startPeriod: Duration.minutes(1),
        timeout: Duration.minutes(1),
      },
      environment: {
        PORT: appPort.toString(),
        TEST_VALUE: 'test-value',
      },
    });

    const fargateService = new FargateService(this, 'FargateService', {
      cluster,
      taskDefinition,
      assignPublicIp: false,
      desiredCount: 2,
      healthCheckGracePeriod: Duration.minutes(2),
      deploymentController: {
        type: DeploymentControllerType.CODE_DEPLOY,
      },
    });

    const scalableTarget = fargateService.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 3,
    });

    scalableTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 80,
    });

    scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
    });

    const alb = new ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
      vpc: props.vpc,
      internetFacing: false,
    });

    const listener = alb.addListener('AlbListener', { port: 80 });

    // NOT attached
    // ----------------------------------------
    // const blueTargetGroup = new ApplicationTargetGroup(this, 'BlueTargetGroup', {
    //   port: appPort,
    //   targets: [ fargateService ],
    //   healthCheck: {
    //     path: '/health',
    //     interval: Duration.minutes(2),
    //     timeout: Duration.minutes(1),
    //   },
    //   vpc: props.vpc,
    // });

    // const greenTargetGroup = new ApplicationTargetGroup(this, 'GreenTargetGroup', {
    //   port: appPort,
    //   targets: [ fargateService ],
    //   healthCheck: {
    //     path: '/health',
    //     interval: Duration.minutes(2),
    //     timeout: Duration.minutes(1),
    //   },
    //   vpc: props.vpc,
    // });

    // Attached
    // ----------------------------------------
    // const blueTargetGroup = listener.addTargets('BlueTargetGroup', {
    //   port: appPort,
    //   targets: [ fargateService ],
    //   healthCheck: {
    //     path: '/health',
    //     interval: Duration.minutes(2),
    //     timeout: Duration.minutes(1),
    //   }
    // });

    // const greenTargetGroup = listener.addTargets('GreenTargetGroup', {
    //   port: appPort,
    //   targets: [ fargateService ],
    //   healthCheck: {
    //     path: '/health',
    //     interval: Duration.minutes(2),
    //     timeout: Duration.minutes(1),
    //   }
    // });

    const blueTargetGroup = new ApplicationTargetGroup(this, 'BlueTargetGroup', {
      vpc: props.vpc,
      port: appPort,
      targets: [fargateService],
      healthCheck: {
        path: '/health',
        interval: Duration.minutes(2),
        timeout: Duration.minutes(1),
      },
    });

    const greenTargetGroup = new ApplicationTargetGroup(this, 'GreenTargetGroup', {
      vpc: props.vpc,
      port: appPort,
      targets: [fargateService],
      healthCheck: {
        path: '/health',
        interval: Duration.minutes(2),
        timeout: Duration.minutes(1),
      },
    });

    fargateService.node.addDependency(listener, blueTargetGroup, greenTargetGroup);

    listener.addTargetGroups('TargetGroups', {
      targetGroups: [blueTargetGroup],
    });

    // listener.addTargetGroups('TargetGroups', {
    //   targetGroups: [blueTargetGroup, greenTargetGroup],
    // });

    // EXPLICIT WEIGHTED ACTION:
    // const weightedTargetGroup: WeightedTargetGroup[] = [
    //   { targetGroup: blueTargetGroup, weight: 100 },
    //   { targetGroup: greenTargetGroup, weight: 0 },
    // ];

    // listener.addAction('AlbAction', {
    //   action: ListenerAction.weightedForward(weightedTargetGroup)
    // });

    this.ecsDeploymentGroup = new EcsDeploymentGroup(this, 'BlueGreenDG', {
      service: fargateService,
      blueGreenDeploymentConfig: {
        blueTargetGroup: blueTargetGroup,
        greenTargetGroup: greenTargetGroup,
        listener: listener,
        terminationWaitTime: Duration.hours(1),
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
        maxAge: Duration.hours(1),
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
