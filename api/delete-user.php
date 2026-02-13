<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    json_headers();
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Method not allowed'], 405);
    exit;
}

$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$token = preg_replace('/^Bearer\s+/i', '', $auth);
$payload = $token !== '' ? jwt_decode($token) : null;
if (!$payload || ($payload['role'] ?? 'user') !== 'admin') {
    json_response(['error' => 'Unauthorized', 'message' => 'Admin only'], 401);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$userId = isset($body['userId']) ? (int) $body['userId'] : (isset($body['id']) ? (int) $body['id'] : null);
if ($userId === null || $userId < 1) {
    json_response(['error' => 'userId required'], 400);
    exit;
}
if ((int) $payload['userId'] === $userId) {
    json_response(['error' => 'Cannot delete your own account'], 400);
    exit;
}

$stmt = $pdo->prepare('SELECT id, role FROM users WHERE id = ?');
$stmt->execute([$userId]);
$target = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$target) {
    json_response(['error' => 'User not found'], 400);
    exit;
}
if ($target['role'] === 'admin') {
    $stmt = $pdo->query('SELECT COUNT(*) FROM users WHERE role = \'admin\'');
    $adminCount = (int) $stmt->fetchColumn();
    if ($adminCount <= 1) {
        json_response(['error' => 'Cannot delete the last admin'], 400);
        exit;
    }
}

$stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
$stmt->execute([$userId]);
json_response(['success' => true]);
