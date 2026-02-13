<?php
/**
 * MariaDB 接続と users テーブル初期化
 */
$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    throw new RuntimeException('config.php が見つかりません。config.sample.php を config.php にコピーして設定してください。');
}
$config = require $configFile;
$dsn = sprintf(
    'mysql:host=%s;dbname=%s;charset=%s',
    $config['DB_HOST'],
    $config['DB_NAME'],
    $config['DB_CHARSET'] ?? 'utf8mb4'
);
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];
$pdo = new PDO($dsn, $config['DB_USER'], $config['DB_PASSWORD'], $options);

$createTable = <<<'SQL'
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(64) NOT NULL DEFAULT '',
  chatwork_id VARCHAR(128) NOT NULL DEFAULT '',
  sns1_type VARCHAR(64) NOT NULL DEFAULT '',
  sns1_account VARCHAR(255) NOT NULL DEFAULT '',
  sns2_type VARCHAR(64) NOT NULL DEFAULT '',
  sns2_account VARCHAR(255) NOT NULL DEFAULT '',
  sns3_type VARCHAR(64) NOT NULL DEFAULT '',
  sns3_account VARCHAR(255) NOT NULL DEFAULT '',
  business_name VARCHAR(255) NOT NULL DEFAULT '',
  industry VARCHAR(128) NOT NULL DEFAULT '',
  business_description TEXT,
  country VARCHAR(128) NOT NULL DEFAULT '',
  region VARCHAR(128) NOT NULL DEFAULT '',
  city VARCHAR(128) NOT NULL DEFAULT '',
  skills JSON,
  interests JSON,
  message TEXT,
  mission TEXT,
  profile_image_url VARCHAR(512) NOT NULL DEFAULT '',
  role VARCHAR(32) NOT NULL DEFAULT 'user',
  registered_at DATE NOT NULL,
  UNIQUE KEY uk_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
SQL;
$pdo->exec($createTable);

$createResetTable = <<<'SQL'
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_token (token),
  KEY idx_email (email),
  KEY idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
SQL;
$pdo->exec($createResetTable);
