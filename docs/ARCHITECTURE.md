# Architecture / data model

**Browser** (static HTML/CSS/JS) ↔ **Supabase Auth** (OTP, session) / **Supabase PostgREST** (RLS on seven tables) / **Supabase PostgreSQL RPC** (trusted purchases + rewards). **Vercel Function** `/api/config` only returns the public Supabase URL, public publishable key and optional public Turnstile site key. SMTP (e.g. Resend) is configured within Supabase Authentication.

## Main entities

- `auth.users` — identity and email managed by Supabase.
- `profiles` — user display name, buddy, quit timestamp, source type, previous consumption, optional price, explicit onboarding consent version/time, JSON world-slot layout.
- `game_states` — server-controlled integer coins and lifetime earned.
- `shop_catalog` — read-only published 22-item catalog, with level gates.
- `purchases` — purchased items, unique per user/item.
- `moment_events` — mood/intensity, activity, selected trigger, result and coins (server-awarded).
- `jar_notes` — personally authored memories/reasons, self-only CRUD.
- `lapse_events` — historical resets; progress remains intact.

## Access boundaries

`auth.uid()` is required for every user-specific RLS policy. The browser can directly update safe profile fields and its own notes but cannot insert a purchase, alter the catalog or write to the game wallet. A purchase runs in a transaction under `buy_item`, locks the wallet row, checks price/unlocks/balance and inserts the purchase. `complete_moment` logs a session and throttles rewards to once per 90 seconds. These are non-monetary cosmetics; anti-farming is lightweight and should be reviewed as the game grows.

## Known limitations

- No external services connected in the deliverable; email, RLS and deployment must be verified on a new actual Supabase project.
- No push notifications, offline write queue, synchronization conflict resolution, in-app purchases, chat or analytics.
- The app uses a CDN-delivered Supabase JS client and a webfont; assess CSP, dependency pinning, availability and legal requirements before scaling.
- The 3D-looking scenes are rendered with lightweight HTML/CSS/canvas, not a native 3D engine.
- Some database rows returned by the client are limited to latest 150 moments / 100 notes; this is a UI cap, not deletion.
- Privacy template is intentionally incomplete; consult counsel for KVKK/GDPR needs, especially data about tobacco and habits.
