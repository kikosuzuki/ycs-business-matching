<?php
// 誤った出力を防ぎ、エラー時も JSON を返す
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

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$email = trim((string) ($body['email'] ?? ''));
$password = (string) ($body['password'] ?? '');
if ($email === '' || $password === '') {
    ob_end_clean();
    json_response(['error' => 'email and password required'], 400);
    exit;
}
if (strlen($password) < 8) {
    ob_end_clean();
    json_response(['error' => 'Password must be at least 8 characters'], 400);
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    ob_end_clean();
    json_response(['error' => 'This email is already registered'], 400);
    exit;
}

try {
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $registeredAt = date('Y-m-d');
    $skills = isset($body['skills']) && is_array($body['skills']) ? json_encode($body['skills']) : '[]';
    $interests = isset($body['interests']) && is_array($body['interests']) ? json_encode($body['interests']) : '[]';

    // 最初の1人を管理者にする（users が0件のときのみ admin）
    $stmt = $pdo->query('SELECT COUNT(*) FROM users');
    $userCount = (int) $stmt->fetchColumn();
    $role = $userCount === 0 ? 'admin' : 'user';

    $stmt = $pdo->prepare(<<<'SQL'
INSERT INTO users (
  email, password_hash, name, phone, chatwork_id,
  sns1_type, sns1_account, sns2_type, sns2_account, sns3_type, sns3_account,
  business_name, industry, business_description, country, region, city,
  skills, interests, message, mission, profile_image_url, role, registered_at
) VALUES (
  ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?, ?
)
SQL);
    $stmt->execute([
        $email,
        $hash,
        (string) ($body['name'] ?? ''),
        (string) ($body['phone'] ?? ''),
        (string) ($body['chatworkId'] ?? ''),
        (string) ($body['sns1Type'] ?? ''),
        (string) ($body['sns1Account'] ?? ''),
        (string) ($body['sns2Type'] ?? ''),
        (string) ($body['sns2Account'] ?? ''),
        (string) ($body['sns3Type'] ?? ''),
        (string) ($body['sns3Account'] ?? ''),
        (string) ($body['businessName'] ?? ''),
        (string) ($body['industry'] ?? ''),
        (string) ($body['businessDescription'] ?? ''),
        (string) ($body['country'] ?? ''),
        (string) ($body['region'] ?? ''),
        (string) ($body['city'] ?? ''),
        $skills,
        $interests,
        (string) ($body['message'] ?? ''),
        (string) ($body['mission'] ?? ''),
        (string) ($body['profileImageUrl'] ?? $body['profileImage'] ?? ''),
        $role,
        $registeredAt,
    ]);
    $userId = (int) $pdo->lastInsertId();
    $name = (string) ($body['name'] ?? '');

    // 管理者へ新規登録通知メール
    $configFile = __DIR__ . '/config.php';
    if (is_file($configFile)) {
        $config = require $configFile;
        $adminEmail = trim((string) ($config['ADMIN_EMAIL'] ?? ''));
        $siteUrl = rtrim((string) ($config['SITE_URL'] ?? ''), '/');
        if ($adminEmail !== '') {
            $subject = '[YCSマッチング] 新規登録がありました';
            $bodyText = "新規登録がありました。\n\n";
            $bodyText .= "名前: " . $name . "\n";
            $bodyText .= "メールアドレス: " . $email . "\n";
            $bodyText .= "登録日時: " . $registeredAt . "\n";
            $bodyText .= "\n--\nYCS Business Matching";
            send_mail($adminEmail, $subject, $bodyText);
        }
        // 登録者へ確認メール（SITE_URL を config から取得）
        if ($email !== '' && $siteUrl !== '') {
            $subject = '[YCSマッチング] 登録が完了しました';
            $userBody = ($name !== '' ? $name . " 様\n\n" : '') . "YCSマッチングプラットフォームへの登録が完了しました。\n\n";
            $userBody .= "このメールアドレスと登録時にお決めいただいたパスワードで、以下のURLからログインできます。\n\n";
            $userBody .= "ログインURL: " . $siteUrl . "\n\n";
            $userBody .= "--\nYCS Business Matching";
            send_mail($email, $subject, $userBody);
        }
    }

    ob_end_clean();
    json_response(['success' => true, 'userId' => $userId]);
} catch (Throwable $e) {
    ob_end_clean();
    json_response(['error' => 'Registration failed'], 500);
}
