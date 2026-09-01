<?php
/**
 * Suite license verification endpoint.
 *
 * POST { "key": "SUITE-XXXXX-CC", "device_fingerprint": "<sha256 hex, client-computed>" }
 * →  200 { "ok": true, "payload": "<base64 json>", "signature": "<base64 RSA-SHA256 signature>" }
 *    or
 *    200 { "ok": false, "error": "..." }
 *
 * The client (suite.html) verifies the signature itself using the matching public
 * key (embedded client-side, safe to expose — it's a public key). This means after
 * the first successful check, the app never needs to call this endpoint again for
 * that device: it just re-verifies the stored signed token locally, fully offline.
 *
 * Device binding: each key allows up to `max_devices` (default 3) distinct devices,
 * identified by a fingerprint computed client-side from a few weak, non-invasive
 * signals. This isn't foolproof — nothing client-side ever fully is — but it stops
 * casual key-sharing past the allowed count. See php-license/README.md.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // tighten this to your actual domain in production
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$config = require __DIR__ . '/config.php';

function respond($ok, $data = []) {
    echo json_encode(array_merge(['ok' => $ok], $data));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, ['error' => 'POST only']);
}

$body = json_decode(file_get_contents('php://input'), true);
$key = isset($body['key']) ? strtoupper(trim($body['key'])) : '';
$deviceFingerprint = isset($body['device_fingerprint']) ? strtolower(trim($body['device_fingerprint'])) : '';

if (!preg_match('/^SUITE-[A-Z0-9]{5}-[A-Z0-9]{2}$/', $key)) {
    respond(false, ['error' => 'Malformed key']);
}
if (!preg_match('/^[a-f0-9]{64}$/', $deviceFingerprint)) {
    respond(false, ['error' => 'Missing or malformed device fingerprint']);
}

// --- naive per-IP rate limiting using a flat file (fine for low volume; move to
// --- a real store like Redis or a DB table if this ever gets meaningful traffic) ---
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/suite_rate_' . md5($ip) . '.json';
$now = time();
$hits = [];
if (file_exists($rateFile)) {
    $hits = json_decode(file_get_contents($rateFile), true) ?: [];
}
$hits = array_filter($hits, fn($t) => $t > $now - 3600);
if (count($hits) >= $config['rate_limit_per_hour']) {
    respond(false, ['error' => 'Too many attempts, try again later']);
}
$hits[] = $now;
file_put_contents($rateFile, json_encode($hits));

// --- look up the key ---
try {
    $pdo = new PDO(
        "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4",
        $config['db_user'],
        $config['db_pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    respond(false, ['error' => 'Server misconfigured']);
}

$stmt = $pdo->prepare('SELECT id, revoked, max_devices FROM suite_licenses WHERE license_key = ?');
$stmt->execute([$key]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row) {
    respond(false, ['error' => 'Key not found']);
}
if ((int)$row['revoked'] === 1) {
    respond(false, ['error' => 'This key has been revoked']);
}

// --- device binding: is this device already known for this key? ---
$deviceStmt = $pdo->prepare(
    'SELECT id FROM suite_license_devices WHERE license_key = ? AND device_fingerprint = ?'
);
$deviceStmt->execute([$key, $deviceFingerprint]);
$knownDevice = $deviceStmt->fetch(PDO::FETCH_ASSOC);

if ($knownDevice) {
    // Already-activated device re-verifying (e.g. reinstalled the app) — just refresh last_seen.
    $touch = $pdo->prepare('UPDATE suite_license_devices SET last_seen_at = NOW() WHERE id = ?');
    $touch->execute([$knownDevice['id']]);
} else {
    // New device for this key — check it against the allowed count first.
    $countStmt = $pdo->prepare('SELECT COUNT(*) AS c FROM suite_license_devices WHERE license_key = ?');
    $countStmt->execute([$key]);
    $currentCount = (int)$countStmt->fetch(PDO::FETCH_ASSOC)['c'];
    $maxDevices = (int)$row['max_devices'];

    if ($currentCount >= $maxDevices) {
        respond(false, [
            'error' => "This key is already active on {$maxDevices} device(s), which is the limit for this license. " .
                       "If you've retired an old device, contact support to have it freed up.",
        ]);
    }

    $insertDevice = $pdo->prepare(
        'INSERT INTO suite_license_devices (license_key, device_fingerprint) VALUES (?, ?)'
    );
    $insertDevice->execute([$key, $deviceFingerprint]);
}

// Mark activated (first time) and bump the activation counter for your own visibility.
$update = $pdo->prepare(
    'UPDATE suite_licenses
     SET activated_at = COALESCE(activated_at, NOW()), activation_count = activation_count + 1
     WHERE id = ?'
);
$update->execute([$row['id']]);

// --- build and sign the token the client will store locally ---
$payloadArr = [
    'key' => $key,
    'iat' => $now, // issued-at, informational only — there's no expiry by design (one-time purchase)
];
$payloadJson = json_encode($payloadArr);
$payloadB64 = base64_encode($payloadJson);

$privateKeyPem = file_get_contents($config['private_key_path']);
$privateKey = openssl_pkey_get_private($privateKeyPem);
if (!$privateKey) {
    respond(false, ['error' => 'Server signing key missing']);
}

$signature = '';
$signed = openssl_sign($payloadB64, $signature, $privateKey, OPENSSL_ALGO_SHA256);
if (!$signed) {
    respond(false, ['error' => 'Signing failed']);
}

respond(true, [
    'payload' => $payloadB64,
    'signature' => base64_encode($signature),
]);
