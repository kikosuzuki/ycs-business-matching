<?php
/**
 * パスワード再設定実行
 * POST { "token": "...", "newPassword": "..." }
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
$token = trim((string) ($body['token'] ?? ''));
$newPassword = (string) ($body['newPassword'] ?? '');
if ($token === '' || strlen($newPassword) < 8) {
    ob_end_clean();
    json_response(['error' => 'Invalid token or password (8 characters minimum)'], 400);
    exit;
}

$stmt = $pdo->prepare('SELECT email, expires_at FROM password_reset_tokens WHERE token = ?');
$stmt->execute([$token]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    ob_end_clean();
    json_response(['error' => 'Invalid or expired token'], 400);
    exit;
}
if (strtotime($row['expires_at']) < time()) {
    $pdo->prepare('DELETE FROM password_reset_tokens WHERE token = ?')->execute([$token]);
    ob_end_clean();
    json_response(['error' => 'Token has expired'], 400);
    exit;
}

$email = $row['email'];
$hash = password_hash($newPassword, PASSWORD_DEFAULT);
$stmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE LOWER(email) = LOWER(?)');
$stmt->execute([$hash, $email]);
$pdo->prepare('DELETE FROM password_reset_tokens WHERE token = ?')->execute([$token]);

ob_end_clean();
json_response(['success' => true]);
