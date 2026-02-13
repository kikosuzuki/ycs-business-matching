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
if (!$payload || ($payload['role'] ?? 'user') !== 'admin') {
    json_response(['error' => 'Unauthorized', 'message' => 'Admin only'], 401);
    exit;
}

$industry = trim((string) ($_GET['industry'] ?? ''));
$region = trim((string) ($_GET['region'] ?? ''));
$skill = trim((string) ($_GET['skill'] ?? ''));
$interest = trim((string) ($_GET['interest'] ?? ''));

$sql = 'SELECT * FROM users WHERE 1=1';
$params = [];
if ($industry !== '') {
    $sql .= ' AND LOWER(industry) LIKE ?';
    $params[] = '%' . mb_strtolower($industry) . '%';
}
if ($region !== '') {
    $sql .= ' AND (LOWER(region) LIKE ? OR LOWER(city) LIKE ?)';
    $params[] = '%' . mb_strtolower($region) . '%';
    $params[] = '%' . mb_strtolower($region) . '%';
}
if ($skill !== '') {
    $sql .= ' AND skills LIKE ?';
    $params[] = '%' . $skill . '%';
}
if ($interest !== '') {
    $sql .= ' AND interests LIKE ?';
    $params[] = '%' . $interest . '%';
}

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$users = [];
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $users[] = row_to_user($row);
}
json_response(['users' => $users]);
