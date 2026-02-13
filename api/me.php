<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    json_headers();
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['error' => 'Method not allowed'], 405);
    exit;
}

$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$token = preg_replace('/^Bearer\s+/i', '', $auth);
$payload = $token !== '' ? jwt_decode($token) : null;
if (!$payload) {
    json_response(['error' => 'Unauthorized'], 401);
    exit;
}

$stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
$stmt->execute([$payload['userId']]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    json_response(['error' => 'User not found'], 401);
    exit;
}
json_response(['user' => row_to_user($row)]);
