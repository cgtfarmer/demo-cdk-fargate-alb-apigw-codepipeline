#!/usr/bin/env node

import { App } from 'aws-cdk-lib';

import { NetworkStack } from '../cdk/lib/stacks/network-stack';
import { PersistenceStack } from '../cdk/lib/stacks/persistence-stack';
import { ApiStack } from '../cdk/lib/stacks/api-stack';
import { CodePipelineStack } from '../cdk/lib/stacks/codepipeline-stack';

const app = new App();

const networkStack = new NetworkStack(app, 'NetworkStack', {});

const persistenceStack = new PersistenceStack(app, 'PersistenceStack', {});

const apiStack = new ApiStack(app, 'ApiStack', {
  vpc: networkStack.vpc,
  ecrRepository: persistenceStack.ecrRepository,
});

const codePipelineStack = new CodePipelineStack(app, 'CodePipelineStack', {
  ecrRepository: persistenceStack.ecrRepository,
  s3Bucket: persistenceStack.s3Bucket,
  ecsDeploymentGroup: apiStack.ecsDeploymentGroup,
});
