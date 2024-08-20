import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IRepository, Repository } from 'aws-cdk-lib/aws-ecr';
import { BlockPublicAccess, Bucket, IBucket } from 'aws-cdk-lib/aws-s3';

export class PersistenceStack extends Stack {

  public readonly ecrRepository: IRepository;

  public readonly s3Bucket: IBucket;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.ecrRepository = new Repository(this, 'EcrRepository', {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.s3Bucket = new Bucket(this, 'S3Bucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      versioned: true,
    });
  }
}
