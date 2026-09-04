<?php
/**
 * Run this from the command line (SSH, or cPanel's "Terminal" if your host offers it)
 * after a sale comes through, to generate a new key and store it in the database.
 *
 * Usage:
 *   php issue-license.php
 *   php issue-license.php buyer@email.com "order_12345"
 *   php issue-license.php buyer@email.com "order_12345" 5    <- override device cap (default 3)
 */

$config = require __DIR__ . '/config.php';

function checksumFor($body) {
    $sum = 0;
    for ($i = 0; $i < strlen($body); $i++) {
        $sum = ($sum * 31 + ord($body[$i])) % 97;
    }
    return strtoupper(str_pad(base_convert($sum, 10, 36), 2, '0', STR_PAD_LEFT));
}

function randomBody($length = 5) {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1, avoids confusion
    $out = '';
    for ($i = 0; $i < $length; $i++) {
        $out .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $out;
}

function generateKey() {
    $body = randomBody();
    $cc = checksumFor($body);
    return "SUITE-{$body}-{$cc}";
}

$buyerEmail = $argv[1] ?? null;
$orderRef = $argv[2] ?? null;
$maxDevices = isset($argv[3]) ? (int)$argv[3] : 3;

$pdo = new PDO(
    "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4",
    $config['db_user'],
    $config['db_pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

// Retry on the rare collision with an existing key.
for ($i = 0; $i < 5; $i++) {
    $key = generateKey();
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO suite_licenses (license_key, buyer_email, order_ref, max_devices) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$key, $buyerEmail, $orderRef, $maxDevices]);
        echo "Issued: {$key} (max {$maxDevices} device(s))\n";
        exit(0);
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false) continue;
        throw $e;
    }
}
echo "Failed to generate a unique key after 5 attempts.\n";
exit(1);
