<?php
/**
 * Apps Script へのプロキシ
 * リクエストを転送し、CORS と JSON をそのまま返す。
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'Server config missing. Copy config.sample.php to config.php.']);
    exit;
}
$config = require $configFile;
$baseUrl = $config['APP_SCRIPT_URL'] ?? '';
if ($baseUrl === '' || strpos($baseUrl, 'YOUR_SCRIPT_ID') !== false) {
    http_response_code(500);
    echo json_encode(['error' => 'APP_SCRIPT_URL not configured.']);
    exit;
}

$path = $_GET['path'] ?? '';
$allowed = ['register', 'login', 'users', 'me', 'members', 'delete-user'];
if (!in_array($path, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid path']);
    exit;
}

$url = rtrim($baseUrl, '?&');
$method = $_SERVER['REQUEST_METHOD'];
$headers = ['Content-Type: application/json'];
$auth = null;
$getHeaders = function_exists('getallheaders') ? getallheaders() : [];
if (empty($getHeaders) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $getHeaders = ['Authorization' => $_SERVER['HTTP_AUTHORIZATION']];
}
foreach ($getHeaders as $k => $v) {
    if (strtolower($k) === 'authorization') {
        $auth = $v;
        break;
    }
}
if ($auth !== null) {
    $headers[] = 'Authorization: ' . $auth;
}

if ($method === 'POST') {
    $body = file_get_contents('php://input');
    $decoded = json_decode($body, true);
    if ($decoded === null && $body !== '' && $body !== 'null') {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON body']);
        exit;
    }
    if ($path === 'register') {
        $decoded = $decoded ?: [];
        $decoded['action'] = 'register';
    } elseif ($path === 'login') {
        $decoded = $decoded ?: [];
        $decoded['action'] = 'login';
    } elseif ($path === 'delete-user') {
        $decoded = $decoded ?: [];
        $decoded['action'] = 'deleteUser';
    }
    $body = json_encode($decoded);
    $actionParam = ($path === 'delete-user') ? 'deleteUser' : $path;
    $url .= (strpos($url, '?') !== false ? '&' : '?') . 'action=' . $actionParam;
    $ctx = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", $headers),
            'content' => $body,
            'ignore_errors' => true,
        ],
    ]);
    $response = @file_get_contents($url, false, $ctx);
} else {
    $params = $_GET;
    unset($params['path']);
    $params['action'] = $path;
    $url .= (strpos($url, '?') !== false ? '&' : '?') . http_build_query($params);
    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", $headers),
            'ignore_errors' => true,
        ],
    ]);
    $response = @file_get_contents($url, false, $ctx);
}

if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Backend unavailable']);
    exit;
}

$code = 200;
$decoded = json_decode($response, true);
if (is_array($decoded) && isset($decoded['error'])) {
    $code = ($decoded['error'] === 'Unauthorized' || (isset($decoded['message']) && $decoded['message'] === 'Admin only')) ? 401 : 400;
}
http_response_code($code);
echo $response;
