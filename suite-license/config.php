<?php
/**
 * Fill these in with your actual cPanel MySQL credentials
 * (cPanel -> MySQL Databases -> the database/user you create for this).
 * Keep this file OUTSIDE your public web root if your host allows it,
 * or at minimum make sure your host's PHP handler doesn't ever serve
 * .php files as plain text (standard on cPanel, just don't rename it .txt).
 */
return [
    'db_host' => 'localhost',                    // leave as-is, correct for cPanel
'db_name' => 'pqrzcimfem_offlines_suite',    // ← your real DB name from Step 1
'db_user' => 'pqrzcimfem_offline_user',     // ← your real DB user from Step 1
'db_pass' => 'CHANGE_ME',    // <-- put your real DB password here, keep this file out of version control/downloads

    // Path to the private key file generated alongside this config.
    // Keep private.pem OUTSIDE the publicly-servable directory if at all possible —
    // e.g. one level above public_html, referenced with a relative path like below.
    'private_key_path' => __DIR__ . '/private.pem',

    // Simple rate limiting: max verify attempts per IP per hour, naive but useful.
    'rate_limit_per_hour' => 20,
];
