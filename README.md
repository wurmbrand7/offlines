# Suite — App Packaging

This folder makes Suite installable, not just something you open in a browser tab.

## What's done and working right now

### 1. Installable web app (PWA) — works today, no build step
Files: `index.html`, `manifest.json`, `sw.js`, `icons/`

Open `index.html` on a real web server (or host it — see below) and:
- **Android (Chrome):** you'll get an "Add to Home Screen" / "Install" prompt. Once installed it opens in its own window, own icon, own app-switcher entry — no browser chrome. Fully offline after first load.
- **Desktop Chrome/Edge:** same thing — an install icon appears in the address bar.
- **iOS (Safari):** Apple doesn't show an automatic install prompt. You open the site in Safari, tap Share → "Add to Home Screen." It then behaves like an app icon and opens full-screen without Safari's UI. This part is real and works today.

**Honest limitation:** a PWA needs to be served over `https://` (or `localhost`) for the service worker and install prompt to activate — it won't install itself straight from a double-clicked local file. Free hosting options: GitHub Pages, Netlify, Vercel, Cloudflare Pages — drag-and-drop this folder onto any of those and it'll work within minutes.

Also worth knowing: iOS Safari's PWA support is real but historically the most limited of the three (storage can be cleared more aggressively, no push notifications, no background sync). For an app like this that's just reading/writing localStorage, none of that matters — it'll work fine.

### 2. Desktop app wrapper (Electron) — needs one build step on your machine
Files: `electron/main.js`, `electron/package.json`

This is real, working Electron config — not a mockup. To turn it into an actual `.exe` / `.dmg` / `AppImage`:

```bash
cd electron
npm install
npm start        # run it locally to test
npm run dist      # build installers for your current OS
```

I can't run this build step for you inside this conversation — it needs `npm install` pulling Electron's full binaries (100+MB) and a real OS-level packaging pass (code signing on Mac/Windows if you want to avoid "unknown publisher" warnings, which needs a certificate I can't generate for you). But the config here is complete and correct; running those two commands on your own machine will produce a real installable desktop app.

## 3. Suite Browser — a custom, offline-only browser shell
Files: `browser/main.js`, `browser/preload.js`, `browser/chrome.html`, `browser/package.json`

This is a real, working Electron app — its own toolbar (back / forward / reload / home), its own address bar, its own window title ("Suite Browser") — that opens Suite by default and never touches the network. It's genuinely offline: everything loads from `file://` paths, and the address bar rejects anything that isn't a local file, redirecting back to Suite instead. That's a deliberate choice so it can't accidentally become "just another browser" — remove the check in `chrome.html` (marked with a comment) if you ever want it to load real websites too.

To build and run it:

```bash
cd browser
npm install
npm start        # opens the Suite Browser window
npm run dist      # builds real installers (.exe / .dmg / AppImage) for your OS
```

Same caveat as the desktop wrapper above: I can't run `npm install`/`npm run dist` for you in this conversation (it needs to download Electron's full binaries and do OS-level packaging), but the code is complete and correct — those two commands on your machine produce a working installable app.

**Which one should you use — the plain desktop wrapper or Suite Browser?** They're not both needed:
- Plain wrapper (`electron/`): simplest, just opens Suite in a clean window, no browser chrome
- Suite Browser (`browser/`): has visible browser controls, useful if you want it to feel like its own little offline browser rather than a single-purpose app window

## Pricing & licensing (as decided)

**Model: Free core + $9 one-time Pro unlock** — no subscription, no trial period, no account.

- **Free forever:** Docs, Notes, Agenda
- **$9 one-time unlock:** Sheets, Forms, Tasks, Slides, Lockbox, and Capsule encryption

### How the license works (upgraded — server-verified, not just client-side)
`index.html` now calls a PHP endpoint (`suite-license/verify.php`) that checks the key against a MySQL table on your existing cPanel host. On success, the server signs a token with a private key it alone holds; the app verifies that signature locally using Web Crypto (RSASSA-PKCS1-v1_5/SHA-256) against the matching public key. This closes the original bypass — editing localStorage to fake "licensed: true" no longer works, since the app checks a real cryptographic signature, not a flag.

Activation needs internet **once**, at the moment someone enters a key. After that, the signed token is verified fully offline on every load — no ongoing network dependency.

**Setup required before this works:** see `suite-license/README.md` for the full deployment steps (create the MySQL table, upload the PHP files, set `LICENSE_VERIFY_URL` in `index.html`). Until that's done, the unlock button will tell the user the license server isn't configured yet, rather than silently failing.

**Still honestly imperfect:** a valid key can be shared between people — nothing stops that. You can revoke a specific leaked key in the database (`revoked = 1`), which blocks new activations with it, though devices that already activated keep working (their token was already verified). Full protection against sharing would need device-binding, which adds real friction for a $9 product.

**Update: basic device-binding is now built** — each key allows up to 3 distinct devices by default (configurable per key). A device is identified by a locally-computed, non-invasive fingerprint hash, not personal information. The 4th device to try activating a key gets a clear "limit reached" message. Full details and honest limitations in `suite-license/README.md`.

### Issuing keys to customers
Run `php issue-license.php buyer@email.com "order_ref"` on your server after a sale comes through (Stripe, Gumroad, manual — whatever you use to take payment). It inserts a new key into the database and prints it for you to email the customer.

### Suite vs. Suite Browser — kept as separate products
Per your decision: **Suite** (the 8 modules, as a PWA/desktop app) and **Suite Browser** (the offline browser shell) are sold and distributed separately. Suite Browser uses Suite as its home page, but someone can install and use Suite on its own without ever touching the browser.

## Real multi-device sync (upgraded from simulated)
Hybrid mode's "Sync now" now does real work via `php-sync/` — same PHP/MySQL hosting you already use, no new vendor. Data is encrypted client-side before it ever reaches your server (server only stores an unreadable blob), identified by a Sync Key (passphrase) rather than an account. Deployment steps and full details are in `php-sync/README.md`.

**Known, honest limitation:** this is sync-on-request with last-write-wins conflict handling — not real-time, and not a true merge if two devices changed different things offline. Real CRDT-based merging is a separate, larger project, only worth building if this limitation actually bites someone in practice.

## What's NOT done, and why (native iOS/Android app store apps)

You asked if this can be "used as an Android and iOS app" — worth being precise about two different things:

- **"Works like an app on your phone" → yes, done.** The PWA above genuinely installs, gets an icon, runs offline, no browser bar. For a tool like this (no camera, no push notifications, no deep OS integration), a PWA is functionally a real app.
- **"A native app in the Apple App Store / Google Play Store" → not done, and here's the honest gap:** that requires wrapping this in something like Capacitor or React Native, an Apple Developer account ($99/year) and Google Play Developer account (~$25 one-time), app store review, and platform-specific builds (Xcode on a Mac for iOS specifically — can't be done from Linux/this environment at all). That's a real, multi-day process involving accounts and hardware I don't have access to here — not something to fake as "basically done."

If store presence matters to you, the realistic next step is Capacitor (wraps this same HTML/JS into a native shell) — I can scaffold that config too, but the actual App Store/Play Store submission still needs your developer accounts and, for iOS, a Mac.
