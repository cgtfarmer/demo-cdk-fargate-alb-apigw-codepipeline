import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import {
  CodeDeployEcsDeployAction, EcrSourceAction,
  S3SourceAction,
  S3Trigger} from 'aws-cdk-lib/aws-codepipeline-actions';
import { IRepository } from 'aws-cdk-lib/aws-ecr';
import { EcsDeploymentGroup } from 'aws-cdk-lib/aws-codedeploy';
import { IBucket } from 'aws-cdk-lib/aws-s3';

interface CodePipelineStackProps extends StackProps {
  ecrRepository: IRepository;

  s3Bucket: IBucket;

  ecsDeploymentGroup: EcsDeploymentGroup;
}

export class CodePipelineStack extends Stack {

  constructor(scope: Construct, id: string, props: CodePipelineStackProps) {
    super(scope, id, props);

    const codePipeline = new Pipeline(this, 'Pipeline', {
      crossAccountKeys: false,
    });

    const ecrImageArtifact = new Artifact();

    const ecsConfigArtifact = new Artifact();

    const ecrImageSourceAction = new EcrSourceAction({
      actionName: 'ECR-Image',
      repository: props.ecrRepository,
      output: ecrImageArtifact,
    });

    const s3EcsConfigSourceAction = new S3SourceAction({
      actionName: 'S3-EcsConfig',
      bucket: props.s3Bucket,
      // bucketKey: 'stratax-api/appspec.yaml',
      bucketKey: 'ecs-config.zip',
      output: ecsConfigArtifact,
      trigger: S3Trigger.POLL,
    });

    codePipeline.addStage({
      stageName: 'Source',
      actions: [ecrImageSourceAction, s3EcsConfigSourceAction],
    });

    const codeDeployEcsDeployAction = new CodeDeployEcsDeployAction({
      actionName: 'Fargate-Deploy',
      deploymentGroup: props.ecsDeploymentGroup,
      containerImageInputs: [{
        // NOTE: ECR Source actions automatically output the imageDetail.json file used here
        input: ecrImageArtifact,
        taskDefinitionPlaceholder: 'IMAGE',
      }],
      // NOTE: One of the following 2 lines MUST be present:
      // appSpecTemplateFile: 'appspec.yaml',
      appSpecTemplateInput: ecsConfigArtifact,
      // NOTE: One of the following 2 lines MUST be present:
      // taskDefinitionTemplateFile: 'appspec.yaml',
      taskDefinitionTemplateInput: ecsConfigArtifact,
    });

    codePipeline.addStage({
      stageName: 'Deploy',
      actions: [codeDeployEcsDeployAction],
    });
  }
}
