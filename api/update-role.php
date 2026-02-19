<?php
/**
 * ユーザーの role を変更する（管理者のみ）
 * POST { userId: number, role: 'admin' | 'user' }
 */
ob_start();
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';

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

$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$token = preg_replace('/^Bearer\s+/i', '', $auth);
$payload = $token !== '' ? jwt_decode($token) : null;
if (!$payload || ($payload['role'] ?? 'user') !== 'admin') {
    ob_end_clean();
    json_response(['error' => 'Unauthorized', 'message' => 'Admin only'], 401);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$userId = (int) ($body['userId'] ?? 0);
$newRole = trim((string) ($body['role'] ?? ''));

if ($userId <= 0) {
    ob_end_clean();
    json_response(['error' => 'userId is required'], 400);
    exit;
}
if (!in_array($newRole, ['admin', 'user'], true)) {
    ob_end_clean();
    json_response(['error' => 'role must be "admin" or "user"'], 400);
    exit;
}

// 自分自身を user に降格させない（最後の管理者保護）
$currentUserId = (int) ($payload['sub'] ?? 0);
if ($currentUserId === $userId && $newRole === 'user') {
    // 他に admin がいるか確認
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM users WHERE role = ? AND id != ?');
    $stmt->execute(['admin', $userId]);
    $otherAdmins = (int) $stmt->fetchColumn();
    if ($otherAdmins === 0) {
        ob_end_clean();
        json_response(['error' => '最後の管理者は降格できません'], 400);
        exit;
    }
}

try {
    $stmt = $pdo->prepare('UPDATE users SET role = ? WHERE id = ?');
    $stmt->execute([$newRole, $userId]);
    if ($stmt->rowCount() === 0) {
        ob_end_clean();
        json_response(['error' => 'ユーザーが見つかりません'], 404);
        exit;
    }
    ob_end_clean();
    json_response(['success' => true]);
} catch (Throwable $e) {
    ob_end_clean();
    json_response(['error' => 'Role update failed'], 500);
}
