# サーバーレス画像解析プラットフォーム アーキテクチャ図

## 概要
アップロードした画像をAIで解析・分類するサーバーレスプラットフォーム

## 主な機能
- 画像認識 (Amazon Rekognition)
- 文字認識 (Amazon Textract)
- S3イベント駆動処理
- 非同期処理 (SQS + Lambda)
- REST/GraphQL API (API Gateway)

## アーキテクチャ図

```mermaid
graph TB
    %% スタイル定義
    classDef user fill:#f9f,stroke:#333,stroke-width:2px
    classDef s3 fill:#569A31,stroke:#333,stroke-width:2px,color:#fff
    classDef lambda fill:#FF9900,stroke:#333,stroke-width:2px,color:#fff
    classDef api fill:#FF4B00,stroke:#333,stroke-width:2px,color:#fff
    classDef ai fill:#9D5CFF,stroke:#333,stroke-width:2px,color:#fff
    classDef queue fill:#FF9900,stroke:#333,stroke-width:2px,color:#fff
    classDef db fill:#4B72FF,stroke:#333,stroke-width:2px,color:#fff
    classDef cf fill:#2C5282,stroke:#333,stroke-width:2px,color:#fff
    classDef cognito fill:#DD344C,stroke:#333,stroke-width:2px,color:#fff

    %% ユーザー
    User[👤 ユーザー]:::user

    %% フロントエンド
    CF[CloudFront<br/>CDN配信]:::cf
    S3Web[S3<br/>静的Webホスティング]:::s3
    
    %% 認証
    Cognito[Amazon Cognito<br/>ユーザー認証]:::cognito

    %% API層
    APIGW[API Gateway<br/>REST/GraphQL]:::api
    
    %% 画像アップロード
    S3Upload[S3<br/>画像アップロード用]:::s3
    
    %% イベント駆動処理
    S3Event{S3 Event<br/>Notification}
    
    %% 処理キュー
    SQS[Amazon SQS<br/>処理キュー]:::queue
    
    %% Lambda関数群
    LambdaAPI[Lambda<br/>API処理]:::lambda
    LambdaProcess[Lambda<br/>画像処理制御]:::lambda
    LambdaRekognition[Lambda<br/>画像認識処理]:::lambda
    LambdaTextract[Lambda<br/>文字認識処理]:::lambda
    LambdaResult[Lambda<br/>結果統合処理]:::lambda
    
    %% AI/MLサービス
    Rekognition[Amazon Rekognition<br/>画像認識AI]:::ai
    Textract[Amazon Textract<br/>文字認識AI]:::ai
    
    %% データストア
    DDB[DynamoDB<br/>メタデータ保存]:::db
    S3Result[S3<br/>解析結果保存]:::s3
    
    %% フロー定義
    User -->|アクセス| CF
    CF --> S3Web
    User -->|認証| Cognito
    User -->|API呼び出し| APIGW
    
    APIGW -->|認証確認| Cognito
    APIGW --> LambdaAPI
    
    LambdaAPI -->|画像アップロード| S3Upload
    LambdaAPI -->|メタデータ保存| DDB
    
    S3Upload -->|イベント発火| S3Event
    S3Event -->|メッセージ送信| SQS
    
    SQS -->|トリガー| LambdaProcess
    
    LambdaProcess -->|並列実行| LambdaRekognition
    LambdaProcess -->|並列実行| LambdaTextract
    
    LambdaRekognition -->|画像解析| Rekognition
    LambdaTextract -->|文字抽出| Textract
    
    LambdaRekognition -->|結果送信| LambdaResult
    LambdaTextract -->|結果送信| LambdaResult
    
    LambdaResult -->|結果保存| S3Result
    LambdaResult -->|メタデータ更新| DDB
    
    %% 結果取得
    LambdaAPI -->|結果取得| DDB
    LambdaAPI -->|結果取得| S3Result
```

## 処理フロー

1. **画像アップロード**
   - ユーザーがCloudFront経由でWebアプリケーションにアクセス
   - Cognitoで認証
   - API Gateway経由で画像をS3にアップロード

2. **イベント駆動処理**
   - S3イベント通知がSQSにメッセージを送信
   - SQSがLambda関数をトリガー

3. **並列AI処理**
   - Lambda関数が画像解析を並列実行
   - Rekognitionで画像内のオブジェクト、シーン、顔などを認識
   - Textractで画像内のテキストを抽出

4. **結果統合・保存**
   - 解析結果を統合してS3に保存
   - メタデータをDynamoDBに保存

5. **結果取得**
   - クライアントがAPI経由で解析結果を取得
   - リアルタイムで結果を表示

## 特徴

- **完全サーバーレス**: すべてのコンポーネントがマネージドサービス
- **スケーラブル**: 自動的にスケールし、大量の画像処理に対応
- **非同期処理**: SQSを使用した信頼性の高い非同期処理
- **並列処理**: 複数のAI機能を並列実行し、処理時間を短縮
- **セキュア**: Cognitoによる認証、IAMロールによる権限管理
- **コスト効率**: 使用した分だけの従量課金