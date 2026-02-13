# YCS Business Matching - セットアップ手順

Xserver の **MariaDB 10.5** をデータベースとし、`ycscampaign.com/match` で公開するための手順です。

---

## 1. Xserver で MariaDB を用意

1. **サーバパネルで MySQL（MariaDB）を有効化**
   - Xserver の「MySQL 設定」で、MariaDB 10.5 のデータベースを 1 つ作成する。
   - **MySQL サーバー**（ホスト名）、**データベース名**、**ユーザー名**、**パスワード** を控える。
   - 多くの場合、同じサーバ上の PHP からは **ホスト: `localhost`** で接続します（Xserver の案内に従ってください）。

2. **PHP から接続できることを確認**
   - 本番では `api/db.php` が最初に呼ばれたときに `users` テーブルが自動作成されます。

---

## 2. API（PHP）の配置と設定

1. **ファイルをアップロード**
   - `api/` フォルダ一式を、ドメインの **`/match/api/`** にアップロード。
   - 含めるもの:  
     `config.sample.php`, `db.php`, `jwt.php`, `helpers.php`,  
     `register.php`, `login.php`, `me.php`, `users.php`, `members.php`, `delete-user.php`,  
     `.htaccess`

2. **config.php を作成**
   - `config.sample.php` をコピーして **config.php** にリネーム。
   - 以下を編集:
     - **DB_HOST**: 通常は `localhost`（Xserver の案内どおり）。
     - **DB_NAME**: 作成したデータベース名。
     - **DB_USER**: 作成したユーザー名。
     - **DB_PASSWORD**: 作成したパスワード。
     - **JWT_SECRET**: ランダムな長い文字列に変更（JWT 署名用）。

3. **初回アクセスでテーブル作成**
   - ブラウザで `https://ycscampaign.com/match/api/register` に一度アクセスするか、  
     どこかで `api/db.php` が読み込まれるようにすると、`users` テーブルが自動作成されます。
   - エラーになる場合は、config.php の接続情報と、Xserver の PHP バージョン・MySQL 拡張を確認してください。

4. **動作確認**
   - `https://ycscampaign.com/match/api/me` を開く。
   - 「{"error":"Unauthorized"}」が返れば、API 経路は動作しています。

---

## 3. 管理者アカウントの作り方

- まず **通常の新規登録** で 1 人分のアカウントを作成する。
- その後、phpMyAdmin または MySQL クライアントで、そのユーザーの **role** を `admin` に更新する。

  ```sql
  UPDATE users SET role = 'admin' WHERE email = '管理者にしたいメールアドレス';
  ```

- 以降、そのアカウントでログインすると管理画面にアクセスできます。
- 管理者キーワードは使わず、**ロールは DB の `role` のみ**で判定します。

---

## 4. フロント（React）

1. **apiClient の配置**
   - `src/apiClient.ts` をプロジェクト内に配置。
   - `App.tsx` が `YCS Business Matching` 直下にある場合: import は `'./src/apiClient'`。
   - `App.tsx` が `src/` 内にある場合: import は `'./apiClient'`。

2. **App.tsx に API 連携を反映**
   - `APPLY-API-CHANGES.md` の手順に従い、ログイン・登録・一覧・管理者・退会者削除を API 連携に変更してください。

3. **ビルドと配置**
   - ビルド後、`index.html` と JS/CSS を `/match/` にアップロード。
   - 公開 URL: `https://ycscampaign.com/match`。

---

## 5. API エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/match/api/register` | 新規登録（body: name, email, password, ...） |
| POST | `/match/api/login` | ログイン（body: email, password）→ token と user を返す |
| GET | `/match/api/me` | 現在のユーザー取得（Header: Authorization: Bearer &lt;token&gt;） |
| GET | `/match/api/members` | メンバー一覧（マッチング・検索用、要ログイン） |
| GET | `/match/api/users` | 管理者用ユーザー一覧（role=admin のみ） |
| POST | `/match/api/delete-user` | 退会者削除（管理者のみ。body: `{ "userId": number }`） |

---

## 6. スプレッドシート版から移行する場合

- 以前は Google Apps Script + スプレッドシートを使っていましたが、**削除などの運用を考えると MariaDB 利用を推奨**しています。
- 本手順では **データ保存は Xserver の MariaDB のみ** です。`proxy.php` および `backend/Code.gs` は **使用しません**。
- 既存データを移行する場合は、スプレッドシートの内容を CSV などで出力し、`users` テーブルのカラムに合わせて INSERT するか、簡単な移行スクリプトを用意してください。パスワードは PHP の `password_hash()` で再ハッシュする必要があります。
