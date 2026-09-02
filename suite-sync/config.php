<?php
/**
 * Fill in your actual cPanel MySQL credentials.
 * Can reuse the same database as suite-license/ if you like — this just
 * needs its own table (suite_sync_blobs), created via schema.sql.
 */
return [
    'db_host' => 'localhost',                    // leave as-is, correct for cPanel
'db_name' => 'pqrzcimfem_offlines_suite',    // ← your real DB name from Step 1
'db_user' => 'pqrzcimfem_offline_user',     // ← your real DB user from Step 1
'db_pass' => 'CHANGE_ME',    // <-- put your real DB password here, keep this file out of version control/downloads

    // Blobs are already client-encrypted, but cap size server-side to stop abuse.
    'max_blob_bytes' => 2 * 1024 * 1024, // 2MB — plenty for 8 modules of text/JSON

    'rate_limit_per_hour' => 120, // per IP, generous since Suite users may sync often
];
