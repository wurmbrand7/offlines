# Suite Sync — deployment guide

This replaces the earlier simulated Hybrid mode with a real sync mechanism, built
on your existing PHP/MySQL cPanel stack — no new vendor, no recurring service fee.

## How it works, in plain terms

- There's still **no account system**. Instead, you set a **Sync Key** (a passphrase) once per device. Any device using the same Sync Key can see the same synced data.
- The Sync Key never leaves your device in plain text: the browser hashes it (SHA-256) to make an identifier, and separately uses it to encrypt your data (same AES-GCM scheme as Capsule) before uploading. **Your server only ever stores an encrypted blob it can't read.**
- Sync happens **on request** — when you click "Sync now," or via the optional 30-second auto-sync toggle. This is not real-time/instant sync between devices; it's "check in and reconcile," which is realistic on shared hosting without persistent connections.
- Conflict handling is **last-write-wins, with a confirmation prompt** — not a true merge. If two devices have different unsynced changes, whichever you tell it to keep, wins; the other is discarded. Real conflict-free merging (CRDT) is a separate, bigger project — see the note at the bottom.

## Files

| File | Purpose |
|---|---|
| `schema.sql` | Run once to create the `suite_sync_blobs` table |
| `config.php` | DB credentials — edit before uploading |
| `push.php` | Upload endpoint — stores an encrypted blob, rejects stale overwrites |
| `pull.php` | Download endpoint — fetches the current blob for a Sync Key |

## Deployment steps

1. Create a MySQL database (can reuse the same one as `suite-license/`, just needs its own table).
2. Run `schema.sql` against it.
3. Edit `config.php` with real DB credentials.
4. Upload `push.php` and `pull.php` somewhere reachable — e.g. `public_html/suite-sync/`. Unlike the license folder, there's no private key here to hide, but you may still want to keep `config.php` blocked via `.htaccess`:
   ```
   <Files "config.php">
     Require all denied
   </Files>
   ```
5. In `index.html`, set:
   ```js
   const SYNC_PUSH_URL = 'https://codersagent.com/suite-sync/push.php';
   const SYNC_PULL_URL = 'https://codersagent.com/suite-sync/pull.php';
   ```
6. Test: open Suite on two different browsers (or browser profiles), switch both to Hybrid mode, click "Sync now" on the first, set a Sync Key, make a change, sync again. On the second, enter the *same* Sync Key when prompted and sync — it should pull the first device's data.

## What's real vs. what's still a known gap

**Real:**
- Data genuinely leaves and returns from a server you control
- Server never sees unencrypted content
- Stale overwrites are rejected server-side (`push.php` checks timestamps before accepting)
- **Real per-item merge**, not just whole-bundle last-write-wins: if you add a task on your phone and a different task on your laptop, both survive — they're merged by item ID, not overwritten. This applies to Notes, Tasks, Agenda, Slides, and Lockbox (anything that's a list of items).

**Still a gap, honestly:**
- **Docs, Sheets, and Forms are whole-document last-write-wins**, not merged field-by-field. If you edit the same Doc on two devices before syncing, whichever device's save was more recent wins entirely — the other device's edits to that document are lost. The app tells you when this happens (which module got overwritten) so it's never silent. True per-paragraph or per-cell merging would need real CRDT machinery (e.g. character-level operational transforms) — a meaningfully bigger project, only worth it if live co-editing becomes an actual feature request.
- **Deletions can resurrect in rare cases.** If you delete a task on Device A, but Device B (which still has that task, not yet synced) pushes afterward, the merge logic unions items rather than tracking deletions explicitly (no "tombstones") — so the deleted item can come back. This is a known limitation of the current merge approach, not a bug you need to chase; a full fix needs tombstone records, which we haven't built.
- **No real-time push.** Sync only happens when you click "Sync now" or via the 30-second auto-sync timer — not instantly as you type.
- **Sync Key loss = data loss for that key.** Same philosophy as Capsule: no account means no "forgot my passphrase" recovery.
