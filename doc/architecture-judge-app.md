# 🏗️ AWSアーキテクチャ図AI判定アプリ

## 📋 アプリ概要

**コンセプト**: AWSアーキテクチャ図をアップロードすると、AIが自動で解析して「いけてる度」を判定するアプリ

## 🎯 主要機能

### 1. 📤 アーキテクチャ図アップロード
- ドラッグ&ドロップ対応
- 複数フォーマット対応（PNG, JPG, PDF）
- プレビュー機能

### 2. 🤖 AI解析機能
- **リソース識別**: AWS サービスの自動認識
- **構成分析**: サービス間の接続関係解析
- **ベストプラクティス判定**: AWS Well-Architected準拠度チェック
- **セキュリティ評価**: セキュリティ設計の評価
- **コスト効率評価**: リソース配置の最適性

### 3. 📊 判定結果表示
- **いけてる度スコア**: 0-100点
- **改善提案**: 具体的な改善ポイント
- **ベストプラクティス**: 推奨パターン提示
- **リソース一覧**: 検出されたAWSサービス

### 4. 🏆 ランキング機能
- 今日のベストアーキテクチャ
- カテゴリ別ランキング
- みんなの投稿アーキテクチャ

## 🏛️ システムアーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Frontend      │    │   CloudFront    │    │   S3 Static     │
│   (React)       │◄──►│   (CDN)         │◄──►│   Website       │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       
         │ (API calls)           
         ▼                       
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   API Gateway   │◄──►│   Lambda        │◄──►│   S3 Bucket     │
│   (REST API)    │    │   Functions     │    │   (画像保存)    │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                │                       │ (S3 Event)
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │                 │    │                 │
                       │   DynamoDB      │    │   Lambda        │
                       │   (結果保存)    │    │   (画像解析)    │
                       │                 │    │                 │
                       └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  AI Services    │
                                               │                 │
                                               │ • Textract      │
                                               │ • Rekognition   │
                                               │ • Bedrock       │
                                               │ • Comprehend    │
                                               │                 │
                                               └─────────────────┘
```

## 🔍 AI判定ロジック設計

### Phase 1: 画像解析
1. **Textract**: 図中のテキスト抽出
2. **Rekognition**: AWSアイコン/形状認識
3. **テキスト正規化**: サービス名の標準化

### Phase 2: 構造解析
1. **サービス識別**: 検出されたAWSサービス一覧化
2. **接続関係**: 矢印・線の解析で関係性抽出
3. **レイヤー分析**: Frontend/Backend/Database層の分離

### Phase 3: ベストプラクティス判定
```typescript
interface JudgmentCriteria {
  security: {
    vpcUsage: boolean;           // VPC使用
    iamRoles: boolean;           // IAM適切設定
    encryption: boolean;         // 暗号化
    wafUsage: boolean;          // WAF使用
  };
  
  reliability: {
    multiAZ: boolean;           // Multi-AZ構成
    loadBalancer: boolean;      // LB使用
    autoScaling: boolean;       // Auto Scaling
    backup: boolean;            // バックアップ
  };
  
  performance: {
    caching: boolean;           // キャッシュ戦略
    cdn: boolean;              // CDN使用
    rightSizing: boolean;      // 適切なインスタンスサイズ
  };
  
  cost: {
    serverless: boolean;        // サーバーレス活用
    reservedInstances: boolean; // RI使用
    lifecycle: boolean;         // S3ライフサイクル
  };
}
```

### Phase 4: スコア算出
```typescript
function calculateScore(criteria: JudgmentCriteria): number {
  const weights = {
    security: 30,     // セキュリティ重視
    reliability: 25,  // 可用性
    performance: 25,  // パフォーマンス
    cost: 20         // コスト効率
  };
  
  // 各カテゴリのスコア計算
  const scores = {
    security: calculateCategoryScore(criteria.security) * weights.security,
    reliability: calculateCategoryScore(criteria.reliability) * weights.reliability,
    performance: calculateCategoryScore(criteria.performance) * weights.performance,
    cost: calculateCategoryScore(criteria.cost) * weights.cost
  };
  
  return Math.round(Object.values(scores).reduce((a, b) => a + b, 0));
}
```

## 🎨 判定結果UI設計

### スコア表示
```
┌─────────────────────────────────────┐
│  🏆 いけてる度: 87点 / 100点        │
│                                     │
│  ████████████████████░░░░░░  87%    │
│                                     │
│  評価: かなりいけてる！🔥           │
└─────────────────────────────────────┘
```

### カテゴリ別評価
```
🛡️ セキュリティ    ████████████░░░░  75% (改善余地あり)
🔧 可用性          ██████████████░░  90% (素晴らしい！)
⚡ パフォーマンス  ████████████████  95% (完璧)
💰 コスト効率      ██████████░░░░░░  60% (要改善)
```

## 🚀 技術スタック

### フロントエンド
- **React 18** + TypeScript
- **Material-UI v5** (ダークテーマ対応)
- **React Query** (状態管理)
- **React Dropzone** (ファイルアップロード)

### バックエンド
- **AWS Lambda** (Node.js 18.x)
- **API Gateway** (REST API)
- **DynamoDB** (NoSQL)
- **S3** (画像保存)

### AI/ML
- **Amazon Textract** (テキスト抽出)
- **Amazon Rekognition** (画像認識)
- **Amazon Bedrock** (Claude for 判定ロジック)
- **Amazon Comprehend** (テキスト分析)

### インフラ
- **AWS CDK v2** (TypeScript)
- **CloudFront** (CDN)
- **Route 53** (DNS)

## 🎪 デモシナリオ

### 1. 基本デモ（5分）
1. シンプルなアーキテクチャ図アップロード
2. リアルタイム解析表示
3. スコア・改善提案表示

### 2. 比較デモ（3分）
1. 「イマイチ」なアーキテクチャ → 低スコア
2. 「いけてる」アーキテクチャ → 高スコア
3. 改善前後の比較

### 3. インタラクティブデモ（2分）
- 会場参加者のアーキテクチャ図を実際に判定
- リアルタイムランキング表示

## 💡 CDKカンファレンス的魅力

### 1. 技術アピールポイント
- **マルチAIサービス連携**
- **サーバーレス完全構成**
- **リアルタイム処理**
- **スケーラブル設計**

### 2. 実用性
- AWS学習者の教育ツール
- アーキテクチャレビュー支援
- ベストプラクティス普及

### 3. エンターテイメント性
- ゲーミフィケーション
- SNS共有機能
- リアルタイム競争

---

このアプリでアーキテクチャ設計を詳しく進めましょうか？それとも特定の部分から実装を始めますか？