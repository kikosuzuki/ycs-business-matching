# プライバシーポリシー・フッターの反映手順

## 1. デプロイするファイル

- **privacy.html** を `/match/` に配置し、`https://ycscampaign.com/match/privacy.html` で表示できるようにしてください。
- 同一サーバに置く場合、`index.html` と同じ階層に `privacy.html` を置けば、リンクは `./privacy.html` または `/match/privacy.html` で問題ありません。

## 2. フッターコンポーネントの利用

- **src/Footer.tsx** をプロジェクトに追加してあります。
- 表示したい画面で `Footer` を読み込み、画面下部に配置してください。

### 例：ウェルカム画面の下にフッターを出す

```tsx
import { Footer } from './src/Footer';

// renderWelcomeView 内の return の末尾（閉じタグの直前）に追加
<div className="min-h-screen flex flex-col ...">
  {/* 既存のボタンや説明 */}
  <div className="mt-8">
    <button onClick={() => setCurrentView('admin-login')}>...</button>
  </div>
  <Footer />
</div>
```

### 例：レイアウトが flex の場合

`min-h-screen flex flex-col` のコンテナで、最後に `<Footer />` を置くと、フッターが下に来ます。必要に応じて `mt-auto` を Footer 側で使っています。

## 3. 新規登録画面の「プライバシーポリシー」リンク

登録フォームの「利用規約とプライバシーポリシーに同意します」のリンクを、ダミー `#` から実際のページに差し替えてください。

### 変更例

**変更前:**
```tsx
<a href="#" className="text-purple-600 hover:underline">プライバシーポリシー</a>
```

**変更後:**
```tsx
<a
  href="/match/privacy.html"
  target="_blank"
  rel="noopener noreferrer"
  className="text-purple-600 hover:underline"
>
  プライバシーポリシー
</a>
```

- ルートが `/match` でない環境（例: 開発時）の場合は、`href` を `./privacy.html` や `${window.location.pathname.replace(/\/$/, '')}/privacy.html` などに変更しても構いません。

## 4. 複数画面にフッターを出したい場合

- ウェルカム、ログイン、新規登録、登録完了など、共通でフッターを出したい画面の return 内の末尾に `<Footer />` を追加してください。
- ホームやマイページなど、ログイン後のレイアウトが共通の場合は、共通レイアウトの末尾に 1 回だけ `<Footer />` を置くと重複を避けられます。
