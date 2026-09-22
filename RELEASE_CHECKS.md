# Release checks — 2026-09-22

## Verified

- Frontend production build and backend TypeScript build pass.
- Seven engine regressions pass, including identical live/replay results at 30 Hz and 144 Hz, the 7,200-tick limit, and collision-start behavior.
- 48 local API checks pass against PostgreSQL, including private drafts, ownership, schema validation, CSRF, optimistic concurrency, rejected forged/duplicate scores, replay permissions, attribution, profile isolation, account recovery, and moderator hiding of games and clips.
- Chromium end-to-end flow passes: signup, recovery-code display, create, save/reload, deliberately failed save and retry, edit an off-screen object, publish, play, verified score, replay, video export/upload/playback, score challenge, remix with new soundtrack, lineage, dashboard, profile, leaderboard deep links, and anonymous play.
- Mobile home, player, and editor were checked at 390 px. No horizontal document overflow.
- Pulse Heist was played with actual keyboard input and its soundtrack enabled. The server independently verified the resulting 225-point run.
- Frontend dependency audit and backend production dependency audit report zero known vulnerabilities. Compatible Express/query-parser security updates are included in the lockfile.
- Docker Compose configuration validates. Git whitespace checks pass.

## Deployment boundary

No public deployment was performed. The included Docker image could not be built on this workstation because Docker daemon access requires an interactive sudo password. The same frontend/backend build commands used by the image were exercised locally.

Before exposing a production instance, supply the real domain, private database password, persistent volumes, and moderator identity described in README.md. TLS and backup/restore must be checked on that host. Browser video formats and social-network previews vary by receiving platform; a replay link remains available when video export is unsupported.

This is a bounded casual-game MVP: three starter templates, original synthesized soundtracks, a 120-second run limit, and one application instance. AI generation, asset uploads, multiplayer, and bot-proof competition are not claimed.
