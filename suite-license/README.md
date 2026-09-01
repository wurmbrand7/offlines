# Suite License Server — deployment guide

This is the real fix for the client-side-only bypass issue: license keys are now
verified by a PHP endpoint on your existing cPanel host, and the app stores a
cryptographically signed token it can then check offline, forever, without
calling home again for that device.

## What's in this folder

| File | Purpose |
|---|---|
| `schema.sql` | Run once to create the `suite_licenses` table |
| `config.php` | DB credentials + path to the private key — **edit before uploading** |
| `verify.php` | The public endpoint the app calls to activate a key |
| `issue-license.php` | CLI script you run after a sale, to create a new key |
| `private.pem` | RSA private key — **signs tokens. Never expose this publicly.** |
| `jwk.json` | The matching public key, already embedded in `suite.html` — safe to share, verifies but can't sign |

## Deployment steps on your cPanel host

1. **Create a MySQL database** via cPanel → MySQL Databases (e.g. `yourcpaneluser_suitelicenses`), and a DB user with full privileges on it.
2. **Run `schema.sql`** against that database (phpMyAdmin → Import, or paste into the SQL tab).
3. **Edit `config.php`**: fill in `db_name`, `db_user`, `db_pass` with what you just created.
4. **Upload this whole folder** to your host, ideally *outside* `public_html` if your host allows it (e.g. one directory up), with only `verify.php` reachable via a symlink or a small routing file inside `public_html`. If that's not practical on your host, uploading the folder directly into `public_html/suite-license/` also works — just be aware `private.pem` and `config.php` would then be technically reachable by URL. To prevent that even in that case, add this `.htaccess` file in the same folder:

   ```
   <FilesMatch "\.(pem|sql)$">
     Require all denied
   </FilesMatch>
   <Files "config.php">
     Require all denied
   </Files>
   ```

   (cPanel's Apache respects `.htaccess` by default — this blocks direct access to the sensitive files while still letting `verify.php` run normally.)

5. **Note the final URL** of `verify.php`, e.g. `https://codersagent.com/suite-license/verify.php`.
6. **Open `suite.html`** and set:
   ```js
   const LICENSE_VERIFY_URL = 'https://codersagent.com/suite-license/verify.php';
   ```
7. **Issue a test key** to confirm everything's wired correctly:
   ```bash
   php issue-license.php test@example.com "manual-test"
   ```
   This prints a key like `SUITE-WA75Q-0Z`. Paste it into any locked module in the running app — it should call your server, verify, and unlock.

## How the security actually improved

- **Before:** the app checked a checksum entirely in the browser — anyone could open dev tools and set `localStorage` to fake "licensed: true" with zero server involvement.
- **Now:** a valid unlock requires a real, unused (or at least not-revoked) key that exists in your database, verified server-side. The server then signs a token with a private key **only your server holds**. The app verifies that signature using the matching *public* key — which is safe to expose, since a public key can verify signatures but can't create new ones. Editing localStorage to insert a fake token now fails, because the app checks the signature, not just presence of a flag.

## Device binding — 3 devices per key by default (upgraded)

Each key now allows activation on up to `max_devices` distinct devices (3 by default — override per-key with a 4th CLI argument to `issue-license.php`, or by editing the `max_devices` column directly for a specific row).

**How a device is identified:** the app computes a fingerprint from a few weak, non-invasive signals (browser/OS info, screen size, timezone, plus a random component generated once and stored locally) — hashed before it's ever sent, so the server only sees an opaque identifier, never anything identity-revealing. This isn't foolproof (nothing client-side ever fully is), but it stops the common case of a key circulating between more people than intended.

**What happens at the limit:** the 4th distinct device trying to activate gets a clear message that the key has reached its device limit, with a note to contact you if a device was genuinely retired. To free up a slot, delete the relevant row from `suite_license_devices` (matching `license_key` + old `device_fingerprint`) — there's no self-service "deactivate a device" flow built yet; that would be a reasonable next addition if this comes up often.

**What this doesn't stop:** someone could still clear their browser storage to reset their own device's fingerprint and effectively "free" a slot on their own device — this raises the bar for casual sharing but isn't cryptographically airtight. That trade felt right for a $9 product; happy to revisit if it becomes a real problem in practice.

## What this still doesn't fully solve (being honest)

- **Key sharing between people is still possible.** If someone posts a valid key publicly, anyone can activate with it — nothing here stops that. Real protection against sharing would need device-fingerprint binding, which adds real friction for a $9 product and probably isn't worth it.
- **Revoking a shared/leaked key is possible** — set `revoked = 1` on that row in `suite_licenses`, and it'll fail verification for anyone trying to activate with it going forward (already-activated devices keep their existing signed token though, since verification after first activation is fully offline).
- **Rate limiting is naive** (a flat file per IP) — fine at low volume, worth swapping for something more robust if this gets real traffic.
