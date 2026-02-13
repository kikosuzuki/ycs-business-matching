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

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$email = trim((string) ($body['email'] ?? ''));
$password = (string) ($body['password'] ?? '');
if ($email === '' || $password === '') {
    json_response(['error' => 'email and password required'], 400);
    exit;
}

$stmt = $pdo->prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
$stmt->execute([$email]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row || !password_verify($password, $row['password_hash'])) {
    json_response(['error' => 'Invalid email or password'], 401);
    exit;
}

$user = row_to_user($row);
$token = jwt_encode(['userId' => $user['id'], 'email' => $user['email'], 'role' => $user['role']]);
json_response(['success' => true, 'token' => $token, 'user' => $user]);
