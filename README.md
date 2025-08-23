# Mistvoyage

テキストベースのオフラインアドベンチャーゲーム

## 概要

Mistvoyageは霧に覆われた古い港町を舞台とした日本語のテキストアドベンチャーゲームです。プレイヤーは旅の商人として町を探索し、選択肢によって物語が分岐する体験を楽しめます。

## 特徴

- 🌐 **オフライン対応**: インターネット接続なしでプレイ可能
- 💾 **自動セーブ**: LocalStorageを使用したセーブ・ロード機能
- 🎮 **分岐ストーリー**: 選択肢によって変化する物語展開
- 📱 **レスポンシブ**: モバイル端末でも快適にプレイ
- ⚙️ **JSON設定**: ゲーム内容の追加・編集が容易
- 🔄 **変数システム**: ゲーム状態の追跡と条件分岐

## 技術仕様

- **フロントエンド**: TypeScript, HTML5, CSS3
- **コンパイル**: TypeScript → JavaScript (ES2020)
- **デプロイ**: GitHub Pages対応
- **データ保存**: LocalStorage
- **コンテンツ管理**: JSON形式

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
```

## ファイル構成

```
/
├── index.html          # メインゲーム画面
├── src/
│   ├── game.ts        # ゲームエンジン（TypeScript）
│   └── types.ts       # 型定義
├── js/game.js         # コンパイル済みゲームエンジン
├── data/game.json     # ゲームコンテンツ
├── css/style.css      # スタイルシート
├── tsconfig.json      # TypeScript設定
└── package.json       # パッケージ設定
```

## ゲーム内容の編集

`data/game.json` を編集することでストーリーや選択肢を追加・変更できます。

### シーン構造

```json
{
  "scenes": {
    "scene_id": {
      "id": "scene_id",
      "text": "表示するテキスト",
      "choices": [
        {
          "text": "選択肢のテキスト",
          "nextScene": "次のシーンID",
          "actions": ["set:変数名:値"],
          "condition": "変数名:期待値"
        }
      ]
    }
  }
}
```

## ライセンス

MIT License
