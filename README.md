# Mistvoyage

テキストベースのオフラインローグライクゲーム

## 概要

Mistvoyageは霧に包まれた海域を航海するローグライクゲームです。プレイヤーは船長として様々な海域を探索し、モンスターとの戦闘、港での補給、宝探しなどを通じてチャプターを攻略していきます。

## 特徴

- 🌐 **オフライン対応**: インターネット接続なしでプレイ可能
- 💾 **自動セーブ**: LocalStorageを使用したセーブ・ロード機能
- 🗺️ **ランダムマップ**: 各チャプターで自動生成される航海マップ
- ⚔️ **オートバトル**: 戦闘は自動進行、戦闘ログを観察して楽しむ
- 🚢 **船舶選択**: 異なる性能を持つ船から選択して航海
- 📱 **レスポンシブ**: モバイル端末でも快適にプレイ
- ⚙️ **JSON設定**: ゲーム内容の追加・編集が容易
- 🎯 **RPG要素**: レベルアップ、武器、レリック、パラメータ管理

## 技術仕様

- **フロントエンド**: TypeScript, HTML5, CSS3
- **コンパイル**: TypeScript → JavaScript (ES2020)
- **デプロイ**: GitHub Pages対応
- **データ保存**: LocalStorage
- **コンテンツ管理**: JSON形式（チャプター、モンスター、武器、戦闘設定）
- **アーキテクチャ**: モジュール化されたゲームシステム（MapManager, BattleManager, NavigationManager, DisplayManager, PortManager, WeaponManager, RelicManager）

## 開発・実行

```bash
# 依存関係のインストール
npm install

# TypeScriptコンパイル
npm run build

# ウォッチモード（開発時）
npm run watch

# 開発サーバー起動
npm run dev

# http://localhost:8000 でゲームにアクセス

# コードフォーマット
npm run format
```

## ファイル構成

```
/
├── index.html              # メインゲーム画面
├── src/
│   ├── game.ts            # メインゲームエンジン
│   ├── types.ts           # TypeScript型定義
│   ├── MapManager.ts      # マップ生成・管理
│   ├── CombatSystem.ts    # 戦闘システム（簡易RPG風）
│   ├── BattleManager.ts   # バトルシステム（オートバトル）
│   ├── NavigationManager.ts # ナビゲーション管理
│   ├── DisplayManager.ts   # 画面表示管理
│   ├── SaveManager.ts     # セーブ・ロード機能
│   ├── RelicManager.ts    # レリックシステム管理
│   ├── PortManager.ts     # 港イベント・サービス管理
│   └── WeaponManager.ts   # 武器生成・管理システム
├── dist/                  # コンパイル済みJavaScript
├── data/
│   ├── game.json         # 基本ゲーム設定
│   ├── ships.json        # 船舶データ
│   ├── events.json       # イベントデータ
│   ├── monsters.json     # モンスターデータ
│   ├── weapons.json      # 武器データ
│   ├── battle_config.json # 戦闘設定
│   └── relics.json       # レリックデータ
├── css/style.css         # スタイルシート
├── spec.md              # ゲーム仕様書
├── CLAUDE.md            # Claude開発用指示
├── tsconfig.json        # TypeScript設定
└── package.json         # パッケージ設定
```

## ゲームシステム

### チャプター構成
- **Chapter 1-3**: 各チャプターには異なる難易度の海域
- **必要イベント数**: チャプターごとに規定数のイベントクリアでボス出現
- **ランダムマップ**: ツリー構造で最大3分岐のマップを自動生成

### イベントタイプ
- **🔴 モンスター**: 通常の戦闘イベント
- **🟡 エリートモンスター**: 強力な敵との戦闘
- **🟢 港**: 補給・修理・買い物
- **🟠 宝**: レリック入手
- **🟣 ボス**: チャプター最終戦
- **❓ ???**: Sight不足で詳細不明

### 戦闘システム
- **完全オートバトル**: プレイヤーの操作なし
- **武器クールダウン**: 各武器に個別のクールダウン
- **命中計算**: Speed, Sight, Weather, Crewによる補正
- **戦闘ログ**: 攻撃者別の色分け表示

### パラメータシステム
- **公開パラメータ**: Hull, Food, Money, Crew, Sight, Weather等
- **非公開パラメータ**: Speed, Karma等
- **RPG要素**: Level, Health, Attack, Defense, Experience

## ゲーム内容の編集

JSONファイルを編集してゲーム内容をカスタマイズできます：

### データファイル
- `data/game.json` - 基本ゲーム設定（タイトル、バージョン、チャプター定義）
- `data/ships.json` - 船舶ステータスと特殊ルール
- `data/events.json` - イベント定義（港、宝、ボス等のストーリーイベント）
- `data/monsters.json` - モンスターデータと戦闘組み合わせ  
- `data/weapons.json` - 武器性能とエフェクト
- `data/battle_config.json` - 戦闘計算の各種補正値
- `data/relics.json` - レリック効果とレアリティ設定

## ライセンス

MIT License
