<?php
/**
 * 設定サンプル
 * このファイルを config.php にコピーし、Xserver の MariaDB 接続情報と JWT 秘密鍵を設定してください。
 */
return [
    // Xserver MariaDB 10.5 接続情報（サーバパネル > MySQL 設定で確認）
    'DB_HOST'     => 'localhost',           // 多くの場合 localhost または mysqlXXX.xserver.jp
    'DB_NAME'     => 'your_database_name',
    'DB_USER'     => 'your_database_user',
    'DB_PASSWORD' => 'your_database_password',
    'DB_CHARSET'  => 'utf8mb4',

    // JWT 署名用（ランダムな長い文字列に変更すること）
    'JWT_SECRET'  => 'change-me-to-a-long-random-string',

    // メール送信（管理者通知・パスワードリセット用）
    'ADMIN_EMAIL' => 'admin@example.com',   // 管理者メールアドレス（通知先）
    'SITE_URL'    => 'https://example.com/match',  // サイトのベースURL（リセットリンク用）

    // SMTP送信（Xserver の送信サーバーを使う場合）
    'SMTP_HOST'     => 'sv14397.xserver.jp',
    'SMTP_PORT'     => 587,                 // 587=STARTTLS / 465=SSL
    'SMTP_USER'     => 'match@ycsacampaign.com',
    'SMTP_PASSWORD' => 'your_smtp_password', // 上記ユーザーのパスワード
    'MAIL_FROM'     => 'match@ycsacampaign.com',  // 送信元（From）に使うアドレス
];
