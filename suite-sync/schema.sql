-- Run once in phpMyAdmin (or CLI) on your existing cPanel MySQL database.
-- Stores one encrypted blob per "sync key" — there are no user accounts;
-- the sync key IS the identity, same philosophy as the rest of Suite.

CREATE TABLE IF NOT EXISTS suite_sync_blobs (
  sync_id CHAR(64) NOT NULL PRIMARY KEY,   -- SHA-256 hex of the user's sync passphrase, computed client-side
  blob LONGTEXT NOT NULL,                   -- the encrypted bundle (AES-GCM), server never sees plaintext
  client_updated_at BIGINT UNSIGNED NOT NULL, -- epoch ms, set by whichever device pushed last
  server_received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  size_bytes INT UNSIGNED NOT NULL DEFAULT 0,
  INDEX idx_received (server_received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
