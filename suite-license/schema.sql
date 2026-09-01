-- Run this once in phpMyAdmin (or via CLI) on your existing cPanel MySQL database.
-- Creates the tables that hold issued license keys and their bound devices.

CREATE TABLE IF NOT EXISTS suite_licenses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  license_key VARCHAR(32) NOT NULL UNIQUE,
  buyer_email VARCHAR(255) DEFAULT NULL,
  order_ref VARCHAR(100) DEFAULT NULL,        -- e.g. Stripe/Gumroad order id, for your records
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activated_at DATETIME DEFAULT NULL,          -- set the first time the key is successfully verified
  activation_count INT UNSIGNED NOT NULL DEFAULT 0,
  max_devices INT UNSIGNED NOT NULL DEFAULT 3, -- devices allowed per key; change per-row for special cases
  revoked TINYINT(1) NOT NULL DEFAULT 0,       -- flip to 1 to kill a refunded/leaked key
  INDEX idx_revoked (revoked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per device that has successfully activated a given key.
-- device_fingerprint is a hash computed client-side from a few weak signals
-- (not identity-invasive — just enough to tell devices apart). It's not
-- foolproof (nothing client-side ever is), but stops casual key-sharing
-- past the allowed device count.
CREATE TABLE IF NOT EXISTS suite_license_devices (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  license_key VARCHAR(32) NOT NULL,
  device_fingerprint CHAR(64) NOT NULL,
  first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_key_device (license_key, device_fingerprint),
  INDEX idx_license_key (license_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
