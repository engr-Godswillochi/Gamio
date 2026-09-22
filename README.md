# Gamio

A social arcade for small, remixable games: create → publish → play → beat a score → share a replay/video → remix.

## Run locally

Requires Node.js 22+ and PostgreSQL. The current implementation uses React, Express, and PostgreSQL. The older planning documents proposed FastAPI; this release deliberately retains the existing TypeScript backend so the browser and server use the **same game simulation**.

1. Install dependencies: `npm ci --prefix frontend && npm ci --prefix backend`.
2. Create a PostgreSQL database and configure `backend/.env` using `backend/.env.example`.
3. Build: `npm --prefix frontend run build && npm --prefix backend run build`.
4. Seed the original games: `npm --prefix backend run seed` (idempotent; never overwrites existing games).
5. Start: `npm --prefix backend start`.
6. Open [localhost:3001](http://localhost:3001). Sign up and save your recovery code.

Database tables are created/migrated on startup. The server refuses to start if PostgreSQL is unavailable; there is no volatile fallback. The frontend build also works from removable-drive paths containing `?`, `#`, or `%`.

For frontend development, `npm --prefix frontend run dev` proxies API calls to port 3001. On a path containing reserved URL characters, use the build-and-serve workflow above.

## Screens

- `/`: home; `/discover`: searchable, filterable arcade.
- `/signup`, `/login`, `/recover`, `/settings`: accounts.
- `/dashboard`: private drafts, published games, unpublishing.
- `/create`, `/create/manual/:id`, `/create/:id/edit`: templates and visual editor.
- `/game/:slug`: play, touch controls, score challenge (`?beat=123`), replay/video sharing, reports.
- `/leaderboard/:id`, `/u/:username`: verified personal bests and real creator profiles.
- `/remix/:id`: attributed copy into the editor.
- `/clip/:id`: public replay or cached video with server-rendered Open Graph metadata.
- `/admin/reports`: moderation for configured operators.
- `/community`: community and privacy information.

All routes work on direct load and refresh. Published game URLs remain stable when titles change.

## Game and replay contract

Version 3 entity schemas are the common format for editing, runtime, remixing and verification (PRD §5.0). New production creation only accepts this format. Old flat-format demos are no longer a fallback for missing games.

The runtime advances at 60 fixed simulation ticks per second. Rendering never consumes simulation randomness. A server-created run fixes the seed, user, game revision and schema snapshot. The browser sends changed inputs and a tick count; a bounded worker re-simulates the same engine, checks that the run ended, and derives the score. Client-supplied score values are not trusted. Runs can be submitted only once.

This prevents simple score tampering; it does not claim to prevent bots or tool-assisted input generation. This is a casual arcade, not a cash-prize competition.

Runs are capped at 120 seconds, scenes at 80 authored objects, and dynamic objects at 160. Editing a published game starts a new leaderboard version. Old clips retain their original schema. Anonymous play saves replays but never impersonates a ranked account.

Gameplay video is generated **only when explicitly requested**, from an isolated replay canvas (PRD §7). The first 20 seconds are exported with the selected original synthesized soundtrack, downloaded, and cached on the server. Browsers without video export can share the lightweight replay link. Backgrounding during export cancels it safely. Video format support and rich-preview behavior depend on the receiving browser/social app.

## Checks

```sh
npm --prefix backend test
npm --prefix frontend run build
# With a local app and database running:
npm --prefix backend run test:integration
# Optional browser test tooling; not an application runtime dependency:
npm install --prefix /tmp/gamio-browser --no-save playwright
/tmp/gamio-browser/node_modules/.bin/playwright install chromium
PLAYWRIGHT_MODULE=/tmp/gamio-browser/node_modules/playwright/index.mjs node scripts/browser-test.mjs
```

The browser test creates uniquely named test accounts/games in its target database, tests the complete social loop and mobile layout, and saves screenshots in `/tmp/gamio-browser-results`. Run it against a development database. Set `TEST_ORIGIN`, `TEST_OUTPUT`, and optionally `BROWSER_EXECUTABLE` to override defaults. CI runs these checks with an isolated PostgreSQL service.

## Production

The repository includes a non-root Docker image and a Compose stack with PostgreSQL, persistent media, and Caddy HTTPS.

1. Point your domain at a server with Docker, and make ports 80/443 reachable.
2. Create a private root `.env` from `.env.example`, using a random **hex** database password, the real HTTPS origin/domain, and your moderator username.
3. `docker compose up -d --build`.
4. `docker compose exec app node dist/backend/src/seed.js`.
5. Create the reserved moderator account with `docker compose exec app node dist/backend/src/createAdmin.js your_username`, using the username in `ADMIN_USERNAMES`. The command prints a random password and recovery code once; save both privately. Sign in and review `/admin/reports`. Public signup cannot claim reserved moderator names.

Do not expose the database or app ports directly; the reverse proxy is the public entry point. Session cookies are HttpOnly, SameSite=Lax and Secure in production. Mutations enforce same-origin requests. The app limits auth attempts, writes, run verification, and video uploads. Unpublishing or moderating a game also blocks its clip/video URLs.

Back up the PostgreSQL and media volumes together and test restoring them before inviting users. The app is designed for one server instance: request limits are in-process and cached videos use the attached volume. Multiple replicas need shared rate limits and object storage. HTTPS, persistent storage, operator moderation and backups are deployment responsibilities; the repository does not create a public domain or deploy itself.

AI generation, user asset uploads, arbitrary executable game code, multiplayer, and large/complex games are intentionally outside this release. The three starter games are Neon Dash Runner, Pulse Heist, and Cloudstep.
