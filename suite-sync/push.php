<?php
/**
 * Suite sync — push endpoint.
 *
 * POST { "sync_id": "<sha256 hex>", "blob": "<encrypted bundle json>", "client_updated_at": <epoch ms> }
 *
 * Server-side "last write wins, but ask first" logic:
 * - If no row exists yet for this sync_id, insert it.
 * - If a row exists and the incoming client_updated_at is NEWER than what's stored,
 *   overwrite (this device has the freshest data).
 * - If a row exists and the incoming client_updated_at is OLDER or equal, reject with
 *   409 and return what's currently stored — the client then asks the person which
 *   version to keep, rather than silently losing data. This is honest last-write-wins,
 *   not a real merge (see CRDT note in php-sync/README.md).
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$config = require __DIR__ . '/config.php';

function respond($code, $data) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['ok' => false, 'error' => 'POST only']);

$body = json_decode(file_get_contents('php://input'), true);
$syncId = $body['sync_id'] ?? '';
$blob = $body['blob'] ?? '';
$clientUpdatedAt = isset($body['client_updated_at']) ? (int)$body['client_updated_at'] : 0;

if (!preg_match('/^[a-f0-9]{64}$/', $syncId)) respond(400, ['ok' => false, 'error' => 'Invalid sync_id']);
if (!is_string($blob) || strlen($blob) === 0) respond(400, ['ok' => false, 'error' => 'Missing blob']);
if (strlen($blob) > $config['max_blob_bytes']) respond(413, ['ok' => false, 'error' => 'Blob too large']);
if ($clientUpdatedAt <= 0) respond(400, ['ok' => false, 'error' => 'Missing client_updated_at']);

// naive per-IP rate limit, same pattern as the license endpoint
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/suite_sync_rate_' . md5($ip) . '.json';
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
$existing = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existing && (int)$existing['client_updated_at'] >= $clientUpdatedAt) {
    // Someone else's push already sitting here is the same age or newer — don't silently overwrite.
    respond(409, [
        'ok' => false,
        'error' => 'conflict',
        'server_updated_at' => (int)$existing['client_updated_at'],
        'server_blob' => $existing['blob'],
    ]);
}

$upsert = $pdo->prepare(
    'INSERT INTO suite_sync_blobs (sync_id, blob, client_updated_at, size_bytes)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE blob = VALUES(blob), client_updated_at = VALUES(client_updated_at),
                             size_bytes = VALUES(size_bytes), server_received_at = NOW()'
);
$upsert->execute([$syncId, $blob, $clientUpdatedAt, strlen($blob)]);

respond(200, ['ok' => true, 'stored_at' => $clientUpdatedAt]);
