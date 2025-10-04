# Mistvoyage

テキストベースのオフラインローグライクゲーム

## 概要

Mistvoyageは霧に包まれた海域を航海するローグライクゲームです。プレイヤーは船長として様々な海域を探索し、モンスターとの戦闘、港での補給、宝探しなどを通じてチャプターを攻略していきます。

## 特徴

- 🌐 **オフライン対応**: インターネット接続なしでプレイ可能
- 💾 **自動セーブ**: LocalStorageを使用したセーブ・ロード機能
- 🗺️ **ランダムマップ**: 各チャプターで自動生成される航海マップ（最大4分岐）
- ⚔️ **オートバトル**: 戦闘は自動進行、武器属性システムによる戦略的ダメージ計算
- 🚢 **船舶選択**: 異なる性能を持つ船から選択して航海
- 🌦️ **天候システム**: 進行とともに悪化する天候と戦闘・航海への影響
- 🏛️ **寺院システム**: 祈りを捧げて天候をリセット
- 📱 **レスポンシブ**: モバイル端末でも快適にプレイ
- ⚙️ **JSON設定**: ゲーム内容の追加・編集が容易
- 🎯 **RPG要素**: レベルアップ、武器、レリック、パラメータ管理
- ❓ **未知イベント**: ランダムに他のイベントに変化する??? イベント
- 🖼️ **モーダルシステム**: 統一された武器・レリック詳細表示
- 📦 **インベントリ管理**: スロット満杯時のアイテム選択・破棄システム
- 💰 **売却システム**: 港で不要な武器・レリックを売却（定価の半額）
- 🔧 **デバッグツール**: 開発・テスト用の包括的なデバッグパネル
- ⚛️ **Vue 3**: モダンなリアクティブUI、コンポーネントベース

## 技術仕様

- **フロントエンド**: Vue 3 + TypeScript + Vite
- **UI Components**: Single File Components (SFC) with scoped styling
- **状態管理**: Reactive data with Vue 3 Composition API
- **コンパイル**: TypeScript → JavaScript (ES2020)
- **デプロイ**: GitHub Pages対応
- **データ保存**: LocalStorage
- **コンテンツ管理**: JSON形式（チャプター、モンスター、武器、戦闘設定、天候設定）
- **アーキテクチャ**: モジュール化されたゲームシステム（MapManager, BattleManager, NavigationManager, DisplayManager, PortManager, WeaponManager, RelicManager, WeatherManager, DebugManager）

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
│   ├── App.vue            # メインVueアプリケーション
│   ├── game.ts            # メインゲームエンジン
│   ├── types.ts           # TypeScript型定義
│   ├── style.css          # メインスタイルシート
│   ├── components/        # Vueコンポーネント
│   │   ├── BattleScreen.vue        # 戦闘画面
│   │   ├── BattleResultScreen.vue  # 戦闘結果画面
│   │   ├── BossRewardScreen.vue    # ボス報酬選択画面
│   │   ├── PortScreen.vue          # 港画面
│   │   ├── WeaponShop.vue          # 武器購入画面
│   │   ├── RelicShop.vue           # レリック購入画面
│   │   ├── WeaponSell.vue          # 武器売却画面
│   │   ├── RelicSell.vue           # レリック売却画面
│   │   ├── TempleScreen.vue        # 寺院画面
│   │   ├── ParameterDisplay.vue    # パラメータ表示
│   │   ├── MapDisplay.vue          # マップ表示
│   │   ├── CooldownDisplay.vue     # クールダウン表示
│   │   ├── StatusDisplay.vue       # ステータス表示
│   │   ├── WeaponDetailModal.vue   # 武器詳細モーダル
│   │   ├── RelicDetailModal.vue    # レリック詳細モーダル
│   │   ├── InventoryManagementModal.vue # インベントリ管理モーダル
│   │   └── DebugPanel.vue          # デバッグパネル
│   ├── MapManager.ts      # マップ生成・管理
│   ├── BattleManager.ts   # バトルシステム（オートバトル）
│   ├── NavigationManager.ts # ナビゲーション管理
│   ├── DisplayManager.ts   # 画面表示管理
│   ├── SaveManager.ts     # セーブ・ロード機能
│   ├── RelicManager.ts    # レリックシステム管理
│   ├── PortManager.ts     # 港イベント・サービス管理
│   ├── WeaponManager.ts   # 武器生成・管理システム
│   ├── WeatherManager.ts  # 天候システム管理
│   └── DebugManager.ts    # デバッグツール管理
├── dist/                  # ビルド出力（Vite）
├── data/
│   ├── game.json         # 基本ゲーム設定
│   ├── ships.json        # 船舶データ
│   ├── events.json       # イベントデータ
│   ├── chapters.json     # チャプター設定・エンカウンター
│   ├── monsters.json     # モンスターデータ
│   ├── weapons.json      # 武器データ
│   ├── battle_config.json # 戦闘設定
│   ├── relics.json       # レリックデータ
│   └── weather_config.json # 天候設定
├── spec.md              # ゲーム仕様書
├── CLAUDE.md            # Claude開発用指示
├── vite.config.ts       # Vite設定
├── tsconfig.json        # TypeScript設定
└── package.json         # パッケージ設定
```

## ゲームシステム

### チャプター構成
- **Chapter 1-3**: 各チャプターには異なる難易度の海域
- **必要イベント数**: チャプターごとに規定数のイベントクリアでボス出現
- **ランダムマップ**: ツリー構造で最大4分岐のマップを自動生成

### イベントタイプ
- **🔴 モンスター**: 通常の戦闘イベント
- **🟡 エリートモンスター**: 強力な敵との戦闘
- **🟢 港**: 補給・修理・武器/レリックの購入と売却
- **🟠 宝**: レリック入手
- **🏛️ 寺院**: 祈りを捧げて天候リセット
- **🟣 ボス**: チャプター最終戦
- **❓ ???**: 未知のイベント（ランダムに宝/港/寺院/モンスターに変化）

### 戦闘システム
- **完全オートバトル**: プレイヤーの操作なし
- **武器クールダウン**: 各武器に個別のクールダウン
- **命中計算**: Speed, Sight, Weather, Crewによる補正
- **武器属性システム**: 武器タイプと装甲タイプの相性でダメージ倍率決定
- **戦闘ログ**: 攻撃者別の色分け表示

### パラメータシステム
- **公開パラメータ**: Hull, Food, Money, Crew, Sight, Weather等
- **非公開パラメータ**: Speed, Karma等
- **RPG要素**: Level, Health, Attack, Defense, Experience
- **天候システム**: 0-20スケールの天候悪化、戦闘・航海への影響
- **動的ストレージ**: レリック効果による保管庫・船体上限の拡張

### 天候システム
- **天候進行**: イベント選択ごとに+1で悪化（0→快晴、10→霧/雨選択、15→濃霧/大雨、20→嵐）
- **戦闘影響**: 雨系は速度・命中率低下、霧系は命中率・視界低下、嵐は全て低下
- **寺院での回復**: 祈りを捧げることで天候値を0にリセット可能

### 武器属性システム
- **武器タイプ**: 貫通・火炎・衝撃・切断・捕縛の5種類
- **装甲タイプ**: 甲殻・船体・魚鱗・軟体・無形の5種類
- **ダメージ倍率**: 武器タイプと装甲タイプの組み合わせでダメージ効果決定
  - 貫通 → 魚鱗に2倍、甲殻・無形に0.5倍・0.3倍
  - 火炎 → 無形に2倍、魚鱗に0.5倍
  - 衝撃 → 甲殻・船体に2倍、魚鱗・軟体に0.5倍・0.3倍
  - 切断 → 軟体に2倍、無形に0.3倍
  - 捕縛 → 無形に完全無効（0倍）

### インベントリ管理システム
- **スロット満杯時の処理**: 武器・レリックのスロットが満杯時の選択システム
- **アイテム破棄**: 既存のアイテムを選択して破棄可能
- **入手確認**: 新しいアイテムの詳細表示と入手確認
- **キャンセル機能**: 入手せずに進む選択肢
- **UI/バックエンド検証**: 二重の上限チェックによる安全性確保

### 売却システム
- **港での売却**: 不要な武器・レリックを港で売却可能
- **売却価格**: 定価の半額で売却
- **効果の解除**: レリック売却時は効果を適切に解除
- **即時反映**: 売却後、資金とパラメータがリアルタイム更新

## ゲーム内容の編集

JSONファイルを編集してゲーム内容をカスタマイズできます：

### データファイル
- `data/game.json` - 基本ゲーム設定（タイトル、バージョン、チャプター定義）
- `data/ships.json` - 船舶ステータスと特殊ルール
- `data/events.json` - イベント定義（港、宝、ボス等のストーリーイベント）
- `data/monsters.json` - モンスターデータ、装甲タイプ、戦闘組み合わせ  
- `data/weapons.json` - 武器性能、武器タイプ、エフェクト
- `data/battle_config.json` - 戦闘計算の各種補正値、武器効果マトリックス
- `data/relics.json` - レリック効果とレアリティ設定

## ライセンス

MIT License
