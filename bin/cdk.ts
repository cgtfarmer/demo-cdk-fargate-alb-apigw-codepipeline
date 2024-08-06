#!/usr/bin/env node

import { App } from 'aws-cdk-lib';

import { NetworkStack } from '../cdk/lib/stacks/network-stack';
import { EcrStack } from '../cdk/lib/stacks/ecr-stack';
import { ApiStack } from '../cdk/lib/stacks/api-stack';
import { CodePipelineStack } from '../cdk/lib/stacks/codepipeline-stack';

const app = new App();

const networkStack = new NetworkStack(app, 'NetworkStack', {});

const ecrStack = new EcrStack(app, 'EcrStack', {});

const apiStack = new ApiStack(app, 'ApiStack', {
  vpc: networkStack.vpc,
});

const codePipelineStack = new CodePipelineStack(app, 'CodePipelineStack', {
  ecrRepository: ecrStack.ecrRepository,
  ecsDeploymentGroup: apiStack.ecsDeploymentGroup,
});
