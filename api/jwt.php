<?php
/**
 * JWT 作成・検証（HMAC-SHA256）
 */
$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    throw new RuntimeException('config.php が見つかりません。');
}
$config = require $configFile;
$GLOBALS['_jwt_secret'] = $config['JWT_SECRET'] ?? '';

function jwt_encode(array $payload): string {
    $secret = $GLOBALS['_jwt_secret'];
    if ($secret === '') throw new RuntimeException('JWT_SECRET が設定されていません。');
    $exp = (int) ($payload['exp'] ?? (time() + 7 * 24 * 3600));
    $payload['exp'] = $exp;
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $b64Header = base64url_encode(json_encode($header));
    $b64Payload = base64url_encode(json_encode($payload));
    $signature = base64url_encode(hash_hmac('sha256', $b64Header . '.' . $b64Payload, $secret, true));
    return $b64Header . '.' . $b64Payload . '.' . $signature;
}

function jwt_decode(string $token): ?array {
    $secret = $GLOBALS['_jwt_secret'];
    if ($secret === '') return null;
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    $sig = hash_hmac('sha256', $parts[0] . '.' . $parts[1], $secret, true);
    if (base64url_encode($sig) !== $parts[2]) return null;
    $payload = json_decode(base64url_decode($parts[1]), true);
    if (!is_array($payload)) return null;
    if (!empty($payload['exp']) && (int) $payload['exp'] < time()) return null;
    return $payload;
}

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
}
