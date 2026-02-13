# YCS Business Matching を GitHub に上げる手順

このフォルダを**単独のリポジトリ**として GitHub に push する手順です。

---

## 1. このフォルダで Git を初期化する

ターミナルで次を実行します。

```bash
cd "/Users/teru/Dropbox/cursor/YCS Business Matching"
git init
```

※ 親の cursor フォルダとは別のリポジトリになります。

---

## 2. 初回コミットを作る

```bash
git add .
git status   # 追加されるファイルを確認（node_modules, api/config.php は .gitignore で除外されます）
git commit -m "Initial commit: YCS Business Matching"
```

---

## 3. GitHub でリポジトリを作成する

1. [GitHub](https://github.com) にログイン
2. 右上の **+** → **New repository**
3. **Repository name**: 例）`ycs-business-matching`
4. **Public** を選択
5. **Add a README file** は**チェックしない**（既に手元にコードがあるため）
6. **Create repository** をクリック

---

## 4. リモートを追加して push する

GitHub の画面に表示される「…or push an existing repository from the command line」のコマンドを使います。

```bash
git remote add origin https://github.com/<あなたのユーザー名>/ycs-business-matching.git
git branch -M main
git push -u origin main
```

※ `<あなたのユーザー名>` を実際の GitHub ユーザー名に置き換えてください。  
※ HTTPS の代わりに SSH を使う場合は、リポジトリの「Code」で **SSH** の URL をコピーして `git remote add origin git@github.com:...` にしてください。

---

## 注意

- **api/config.php** は .gitignore に入っているため push されません。本番・開発用の DB や SMTP の設定はサーバー側で別途用意してください。
- **node_modules** と **dist** も .gitignore で除外しています。clone した人は `npm install` と `npm run build` で再現できます。
- 親の cursor リポジトリで「YCS Business Matching フォルダごと」を追跡したくない場合は、親の `.gitignore` に `YCS Business Matching/` を追加すると、このフォルダは親リポジトリでは無視されます。
