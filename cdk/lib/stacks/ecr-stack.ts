import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Repository, TagMutability } from 'aws-cdk-lib/aws-ecr';

export class EcrStack extends Stack {

  public readonly ecrRepository: Repository;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.ecrRepository = new Repository(this, 'EcrRepository', {
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
