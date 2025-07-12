import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

export class CdkArchitectureJudgeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // =====================================================
    // S3 Buckets
    // =====================================================
    
    // 画像アップロード用バケット
    const imagesBucket = new s3.Bucket(this, 'ArchitectureImagesBucket', {
      bucketName: `architecture-images-${cdk.Aws.ACCOUNT_ID}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // 静的サイト用バケット
    const websiteBucket = new s3.Bucket(this, 'ArchitectureJudgeWebsite', {
      bucketName: `architecture-judge-website-${cdk.Aws.ACCOUNT_ID}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
    });

    // =====================================================
    // DynamoDB Tables
    // =====================================================
    
    // 解析結果保存テーブル
    const analysisResultsTable = new dynamodb.Table(this, 'AnalysisResultsTable', {
      tableName: 'ArchitectureAnalysisResults',
      partitionKey: { name: 'imageId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // ランキング用テーブル
    const rankingsTable = new dynamodb.Table(this, 'RankingsTable', {
      tableName: 'ArchitectureRankings',
      partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'score', type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // =====================================================
    // Lambda Functions
    // =====================================================
    
    // 画像アップロード処理用Lambda
    const uploadFunction = new lambda.Function(this, 'UploadFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/upload'),
      environment: {
        BUCKET_NAME: imagesBucket.bucketName,
        ANALYSIS_TABLE: analysisResultsTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // 画像解析処理用Lambda
    const analysisFunction = new lambda.Function(this, 'AnalysisFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/analysis'),
      environment: {
        ANALYSIS_TABLE: analysisResultsTable.tableName,
        RANKINGS_TABLE: rankingsTable.tableName,
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
    });

    // 結果取得用Lambda
    const resultsFunction = new lambda.Function(this, 'ResultsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/results'),
      environment: {
        ANALYSIS_TABLE: analysisResultsTable.tableName,
        RANKINGS_TABLE: rankingsTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // =====================================================
    // IAM Permissions
    // =====================================================
    
    // S3バケットへの権限
    imagesBucket.grantReadWrite(uploadFunction);
    imagesBucket.grantRead(analysisFunction);
    
    // DynamoDBテーブルへの権限
    analysisResultsTable.grantReadWriteData(uploadFunction);
    analysisResultsTable.grantReadWriteData(analysisFunction);
    analysisResultsTable.grantReadData(resultsFunction);
    rankingsTable.grantReadWriteData(analysisFunction);
    rankingsTable.grantReadData(resultsFunction);
    
    // AI サービスへの権限
    analysisFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'rekognition:DetectLabels',
        'rekognition:DetectText',
        'rekognition:DetectFaces',
        'rekognition:DetectModerationLabels',
        'textract:DetectDocumentText',
        'textract:AnalyzeDocument',
        'bedrock:InvokeModel',
      ],
      resources: ['*'],
    }));

    // =====================================================
    // S3 Event Notifications
    // =====================================================
    
    // S3に画像がアップロードされたら解析Lambda実行
    imagesBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(analysisFunction),
      { prefix: 'uploads/', suffix: '.jpg' }
    );
    
    imagesBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(analysisFunction),
      { prefix: 'uploads/', suffix: '.png' }
    );

    // =====================================================
    // API Gateway
    // =====================================================
    
    const api = new apigateway.RestApi(this, 'ArchitectureJudgeApi', {
      restApiName: 'Architecture Judge API',
      description: 'API for architecture judgment service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
    });

    // /upload エンドポイント
    const uploadIntegration = new apigateway.LambdaIntegration(uploadFunction);
    api.root.addResource('upload').addMethod('POST', uploadIntegration);

    // /results/{imageId} エンドポイント
    const resultsResource = api.root.addResource('results');
    const resultsIntegration = new apigateway.LambdaIntegration(resultsFunction);
    resultsResource.addResource('{imageId}').addMethod('GET', resultsIntegration);

    // /rankings エンドポイント
    const rankingsResource = api.root.addResource('rankings');
    rankingsResource.addMethod('GET', resultsIntegration);

    // /stats エンドポイント
    const statsResource = api.root.addResource('stats');
    statsResource.addMethod('GET', resultsIntegration);

    // =====================================================
    // CloudFront Distribution
    // =====================================================
    
    const distribution = new cloudfront.Distribution(this, 'ArchitectureJudgeDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.RestApiOrigin(api),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        },
      },
      defaultRootObject: 'index.html',
    });

    // =====================================================
    // Outputs
    // =====================================================
    
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Architecture Judge Website URL',
    });

    new cdk.CfnOutput(this, 'ApiURL', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'ImagesBucketName', {
      value: imagesBucket.bucketName,
      description: 'S3 Bucket for architecture images',
    });
  }
}
