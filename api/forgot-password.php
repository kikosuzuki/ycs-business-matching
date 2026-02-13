<?php
/**
 * パスワード再設定リンク送信
 * POST { "email": "user@example.com" }
 * セキュリティのため、登録されていないメールでも「送信しました」を返す。
 */
ob_start();
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    json_headers();
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_end_clean();
    json_response(['error' => 'Method not allowed'], 405);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$email = trim((string) ($body['email'] ?? ''));
if ($email === '' || !str_contains($email, '@')) {
    ob_end_clean();
    json_response(['success' => true]);
    exit;
}

$configFile = __DIR__ . '/config.php';
$siteUrl = '';
$adminEmail = '';
if (is_file($configFile)) {
    $config = require $configFile;
    $siteUrl = rtrim((string) ($config['SITE_URL'] ?? ''), '/');
    $adminEmail = trim((string) ($config['ADMIN_EMAIL'] ?? ''));
}

$stmt = $pdo->prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)');
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    ob_end_clean();
    json_response(['success' => true]);
    exit;
}

$token = bin2hex(random_bytes(32));
$expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));
$stmt = $pdo->prepare('INSERT INTO password_reset_tokens (email, token, expires_at) VALUES (?, ?, ?)');
$stmt->execute([$email, $token, $expiresAt]);

if ($siteUrl !== '') {
    $resetLink = $siteUrl . '/#reset-password?token=' . $token;
    $subject = '[YCSマッチング] パスワード再設定のご案内';
    $bodyText = "パスワード再設定のリクエストを受け付けました。\n\n";
    $bodyText .= "以下のリンクをクリックし、新しいパスワードを設定してください。\n";
    $bodyText .= "（有効期限: 1時間）\n\n";
    $bodyText .= $resetLink . "\n\n";
    $bodyText .= "このメールに心当たりがない場合は、無視してください。\n\n";
    $bodyText .= "--\nYCS Business Matching";
    send_mail($email, $subject, $bodyText);
}

ob_end_clean();
json_response(['success' => true]);
