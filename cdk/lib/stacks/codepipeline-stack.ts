import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import {
  CodeDeployEcsDeployAction, EcrSourceAction} from 'aws-cdk-lib/aws-codepipeline-actions';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { EcsDeploymentGroup } from 'aws-cdk-lib/aws-codedeploy';

interface CodePipelineStackProps extends StackProps {
  ecrRepository: Repository;

  ecsDeploymentGroup: EcsDeploymentGroup;
}

export class CodePipelineStack extends Stack {

  constructor(scope: Construct, id: string, props: CodePipelineStackProps) {
    super(scope, id, props);

    const codePipeline = new Pipeline(this, 'Pipeline', {
      crossAccountKeys: false,
    });

    const sourceOutput = new Artifact();

    const sourceAction = new EcrSourceAction({
      actionName: 'ECR',
      repository: props.ecrRepository,
      // imageTag: 'some-tag', // optional, default: 'latest'
      output: sourceOutput,
    });

    codePipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction],
    });

    const codeDeployEcsDeployAction = new CodeDeployEcsDeployAction({
      actionName: 'CodeDeploy: ECS Deploy',
      deploymentGroup: props.ecsDeploymentGroup,
      containerImageInputs: [{
        input: sourceOutput,
      }],
    });

    codePipeline.addStage({
      stageName: 'Deploy',
      actions: [codeDeployEcsDeployAction],
    });
  }
}
