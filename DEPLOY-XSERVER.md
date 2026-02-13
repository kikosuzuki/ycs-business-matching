# Xserver へのアップロード手順（FTP）

公開URL: `https://ycscampaign.com/match`

---

## 1. ビルド（手元で1回だけ）

ターミナルでプロジェクトフォルダに入り、次を実行します。

```bash
cd "/Users/teru/Dropbox/cursor/YCS Business Matching"
npm install
npm run build
```

- `npm install` … 初回だけ（依存パッケージを入れる）
- `npm run build` … 本番用ファイルを **dist** フォルダに出力する

成功すると **dist** フォルダができ、中に `index.html` と `assets/` が入ります。

---

## 2. FTP でアップロードするもの

Xserver の FTP で、**ドキュメントルート**（通常は `public_html`）の下に **match** フォルダを作り、次のようにアップロードします。

### 2-1. フロント（画面）

| 手元 | FTP 上の場所 |
|------|------------------|
| **dist フォルダの中身**（index.html と assets フォルダごと） | **match/** の直下 |

- つまり `dist/index.html` → `match/index.html`
- `dist/assets/` フォルダごと → `match/assets/`

※ dist フォルダそのものは上げず、**中身だけ**を match に入れます。

### 2-2. API（PHP）

| 手元 | FTP 上の場所 |
|------|------------------|
| **api** フォルダの中身（.htaccess, config.php, db.php, jwt.php, helpers.php, register.php, login.php, me.php, users.php, members.php, delete-user.php） | **match/api/** |

- `api/config.php` は手元で作成しておく（config.sample.php をコピーし、DB・JWT を設定）。アップロードするのはその config.php。
- proxy.php は MariaDB 版では使わないですが、置いておいても害はありません。

### 2-3. その他

| 手元 | FTP 上の場所 |
|------|------------------|
| **privacy.html** | **match/privacy.html**（match の直下） |

メール送信を使う場合は、**mail** フォルダがあれば **match/mail/** にその中身をアップロードし、mail 用の config.php も設定してください。

---

## 3. フォルダ構成のイメージ（FTP 上）

```
public_html/
  └── match/
        ├── index.html          ← dist の中身
        ├── assets/
        │     └── (xxx.js, xxx.css など)
        ├── privacy.html
        ├── api/
        │     ├── .htaccess
        │     ├── config.php
        │     ├── db.php
        │     └── (その他 PHP)
        └── mail/               （使う場合のみ）
```

---

## 4. 確認

- ブラウザで `https://ycscampaign.com/match/` を開き、画面が表示されるか
- `https://ycscampaign.com/match/api/me` を開き、`{"error":"Unauthorized"}` などが返るか（API が動いているか）

---

## 5. 更新するとき

- 画面を変えたら、手元で **もう一度 `npm run build`** を実行し、**dist の中身だけ** を FTP で match に上書きする
- API の PHP を変えたら、該当ファイルだけ match/api/ に上書きする
