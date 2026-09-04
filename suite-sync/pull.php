<?php
/**
 * Suite sync — pull endpoint.
 *
 * GET ?sync_id=<sha256 hex>
 * → 200 { "ok": true, "blob": "...", "client_updated_at": <epoch ms> }
 * → 404 { "ok": false, "error": "Nothing synced yet for this key" }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$config = require __DIR__ . '/config.php';

function respond($code, $data) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

$syncId = $_GET['sync_id'] ?? '';
if (!preg_match('/^[a-f0-9]{64}$/', $syncId)) respond(400, ['ok' => false, 'error' => 'Invalid sync_id']);

// naive per-IP rate limit
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/suite_sync_pull_rate_' . md5($ip) . '.json';
$now = time();
$hits = file_exists($rateFile) ? (json_decode(file_get_contents($rateFile), true) ?: []) : [];
$hits = array_filter($hits, fn($t) => $t > $now - 3600);
if (count($hits) >= $config['rate_limit_per_hour']) respond(429, ['ok' => false, 'error' => 'Too many requests, slow down']);
$hits[] = $now;
file_put_contents($rateFile, json_encode($hits));

try {
    $pdo = new PDO(
        "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4",
        $config['db_user'], $config['db_pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    respond(500, ['ok' => false, 'error' => 'Server misconfigured']);
}

$stmt = $pdo->prepare('SELECT blob, client_updated_at FROM suite_sync_blobs WHERE sync_id = ?');
$stmt->execute([$syncId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row) respond(404, ['ok' => false, 'error' => 'Nothing synced yet for this key']);

respond(200, [
    'ok' => true,
    'blob' => $row['blob'],
    'client_updated_at' => (int)$row['client_updated_at'],
]);
