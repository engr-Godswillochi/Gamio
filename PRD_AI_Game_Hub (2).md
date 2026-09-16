# Product Requirements Document
## Gamio — The Social Game Hub

*Draft v0.3 — living document, update as the product evolves*

---

## 1. Vision

A place where anyone can create a game — by describing it in plain language, or by building it themselves with a visual editor — publish it with one click, and immediately compete or get remixed by friends. Creation is flexible (AI or manual); the social loop — create, compete, get beaten, remix, repeat — is the product.

**One-line pitch:** *TikTok for games — build it your way, play it, compete on it, remix it.*

---

## 2. Problem

- Making even a simple game requires tooling knowledge (engines, code, art) most people don't have and don't want to learn — but not everyone wants to hand the whole thing to AI either. Some people want to tinker, and forcing everyone through a single creation path (pure AI, or pure manual) leaves one of those groups out.
- Existing AI game generators (Rosebud AI, SEELE, Max2D, Unity Muse) solve *creation* — you get a playable prototype and maybe an editor. None of them are built as a **social destination**. They're workbenches, not arcades. There's no reason to open them on a random evening unless you're actively building.
- Casual competitive/social game culture (think early Flash portals like Newgrounds/Kongregate, or Wordle-style daily competition) has no modern AI-native equivalent.
- Pure AI-generation platforms carry real, ongoing API cost per creation/edit — which forces payment walls before there's any user base or proof the product works. A product that depends entirely on AI to function can't bootstrap cheaply.

**Gap we're filling:** nobody owns "the arcade" — the place people open *to play what others made*, not just to build — and nobody lets you choose *how* you build: describe it, or build it by hand, in the same social ecosystem.

---

## 3. Target User (v1)

Primary: students and young creators (starting with your own network — Nigerian university/tech-student communities are a natural first wedge, low-friction distribution via existing WhatsApp/Twitter/Discord groups).

Two personas:
- **Creators** — want to build something quick, flex it, get it played.
- **Players** — want quick, low-commitment competitive fun; don't care how the game was made.

Most users will be both at different times. Design for that.

---

## 4. Differentiation (why this wins vs. Rosebud/SEELE/Max2D)

| | Rosebud/SEELE/Max2D | Gamio |
|---|---|---|
| Creation path | AI-only | AI **or** manual visual builder — creator's choice |
| Core loop | Build → maybe share a link once | Build → publish → compete → get remixed → repeat |
| Social layer | Minimal/none | Core to the product (leaderboards, remix graph, profiles) |
| Discovery | None — you have your link, that's it | A browsable hub/feed of what's trending, being played, being remixed |
| Audience | Solo builders | Communities (campus, friend groups, creator circles) |
| Cost structure | Every creation costs API money, forcing early paywalls | Manual creation is free to run — AI is an optional paid convenience layer |

We are not trying to out-generate them technically. We are trying to out-*distribute* them — and we're not making everyone pay the AI tax just to make a game.

---

## 5. MVP Scope (Phase 1)

**Design principle:** narrow the generation surface so it's *reliable*, put engineering effort into the social loop (the real differentiator) — and build creation so it doesn't depend on AI to exist at all.

### 5.0 Architecture: one shared game schema, two ways in

Both creation paths must produce the **same underlying game representation** — a structured format (e.g. JSON) describing entities, sprites, physics/movement params, rules, win/lose conditions, and theme/color data. Everything downstream — the renderer, the leaderboard system, the remix engine, the social feed — consumes this schema and doesn't care how it was produced.

- **Manual creation** fills the schema through a visual editor: drag-and-place entities, set up the play environment, define controls (e.g. arrow keys/tap = move, spacebar = jump), set rules (win condition, scoring, lives), pick colors/sprites from a library or simple upload.
- **AI creation** fills the same schema from a text description — genre, theme, rules, difficulty, color palette — via a hosted model call.
- **Editing** works identically either way afterward: UI controls to tweak the schema directly, *or* chat-based edits ("make the obstacles faster," "change the theme to space") where the AI patches the existing schema rather than regenerating from scratch.
- This means remixing is path-agnostic too: a manually-built game can be remixed via AI chat edits, and an AI-generated game can be remixed by hand in the visual editor. That cross-pollination is a good hook on its own ("started by hand, finished by AI").

### 5.1 Manual creation (no AI dependency — build and validate this first)
- Visual builder: place/configure entities, set up the environment (backgrounds, obstacles, collectibles), define controls, set win/lose rules and scoring.
- Support the same **4–5 starter templates/genres** as scaffolding so manual creation isn't a blank canvas either:
  1. Endless runner
  2. Top-down dodge/survive
  3. Simple platformer
  4. Quiz/trivia
  5. (stretch) Simple shooter
- This is the version of the product that costs nothing to run per-user and can launch without any payment wall.

### 5.2 AI creation (added once manual + social loop is validated)
- User describes: theme, character/sprite style, color palette, difficulty, win/lose condition, simple rule tweaks.
- Hosted frontier model fills the schema within the chosen template's guardrails — same output format as manual creation, so it plugs into the same editor, renderer, and remix system.
- Positioned as the **paid convenience layer**: "describe it and skip the building," for users who'd rather not use the visual builder.

### 5.3 Publishing & sharing
- One click → unique public URL.
- Opens straight into play. No signup required to *play*; signup required to *create/save/compete*.

### 5.4 Competition
- Per-game leaderboard (score, time, or template-appropriate metric).
- Basic player profile: games created, best scores, badges.

### 5.5 Discovery (the differentiator — don't cut this)
- A simple public feed/hub: trending games, newest games, most-played.
- Even a bare-bones version of this is what separates you from "just another game builder."

### 5.6 Remix
- "Remix this game" button on any published game → drops the remixer into the same edit flow with the original as a starting point, regardless of which path (manual or AI) either person uses.
- Track remix lineage (original → remix → remix-of-remix) — cheap to store, valuable later for both product (remix trees are inherently shareable/visual) and growth analytics.

### Explicitly OUT of MVP scope
- Open-ended arbitrary genre generation (AI path stays template-guided even once added)
- AI creation itself (deferred until manual + social loop is validated — see Roadmap)
- 3D games
- Payments/billing infrastructure
- Moderation tooling beyond basic report/flag + manual review
- Local/on-device model generation
- Native mobile apps (browser-first, mobile-responsive is enough)

---

## 6. Site Map

**Public / discovery**
- `/` — discovery feed once logged in (trending, newest, most-played); marketing landing page for logged-out visitors
- `/game/{slug}` — game player page: play, live leaderboard sidebar, "remix this," "record a clip"
- `/clip/{id}` — gameplay cam share page: video preview, OG video tags for link previews, "play this game" CTA
- `/u/{username}` — public profile: games created, best scores, badges, clips

**Creation**
- `/create` — choice screen: manual builder vs describe-to-AI (Phase 3+)
- `/create/manual/{draftId}` — visual builder: entity placement, controls, rules, theme
- `/create/ai/{draftId}` — prompt-to-schema flow (Phase 3)
- `/create/{gameId}/edit` — shared editor for UI tweaks and chat-based edits, used pre- and post-publish

**Social / competitive**
- `/leaderboard/{gameId}` — full leaderboard view
- `/remix/{gameId}` — remix entry point, opens the editor pre-loaded with the original

**Account**
- `/login`, `/signup`
- `/settings` — account, notifications
- `/dashboard` — "my games": drafts, published games, per-game stats and clip counts

**Core user loop:** create or browse → publish → play and compete → capture gameplay cam clip → share the clip → a friend clicks it and lands back on `/game/{slug}`, closing the loop.

---

## 7. Gameplay Cam

A gameplay cam clip is the primary viral mechanic: a player clears a game, gets an auto-generated, shareable video moment with an invite link baked in, and posts it. The friend who clicks it lands directly on the game they just watched.

### 7.1 Why replay-based capture, not raw video

Two approaches were considered:

- **Raw video capture** (`MediaRecorder` on the game canvas, upload the resulting file) is simple to build but has two real weaknesses for this audience: file size (megabytes) is a bad fit for users on inconsistent mobile data, and browser tab-backgrounding (checking a notification mid-game) throttles canvas rendering, which can produce a frozen or choppy chunk in the recording.
- **Replay-based capture** (log inputs + tick timestamps + a seeded RNG value locally, upload only that tiny log, and render to video only on demand) avoids both problems and is the chosen approach for Gamio.

### 7.2 How it works

1. **During play:** the client logs input events, game ticks, and the session's RNG seed locally. No rendering or upload overhead during gameplay.
2. **On game end:** upload just the replay log (kilobytes, not megabytes) — fast and reliable even on weak connections.
3. **On "share this run"** (an explicit user action, not automatic): re-play the log through the game engine in an isolated render pass (offscreen canvas), then run `MediaRecorder` only on that clean render. Because this happens in a moment the user is actively engaged in, tab-backgrounding during real gameplay is no longer a risk.
4. **Render lazily and cache:** most sessions are never shared, so don't render video for every run. The first request for `/clip/{id}` triggers the render; the result is cached and served to everyone after.
5. **Graceful fallback:** if a low-end device can't handle client-side re-rendering, fall back to a link-only share (no video preview) rather than blocking sharing entirely.

### 7.3 Requirement this places on the game engine

Every game template must route all randomness through a single seeded RNG call. If any part of a game uses randomness outside the logged seed, replays will drift from the original run and the rendered clip won't match what the player actually did. This needs to be a rule baked into the engine from the first template, not retrofitted later.

### 7.4 Sharing mechanics

- `/clip/{id}` should be server-rendered (not a client-only SPA route), so link-preview crawlers (WhatsApp, Twitter, Discord) can read Open Graph video tags and show an actual video preview instead of a bare text link. This is likely the one route in the app that needs server-side rendering even if the rest of the frontend is client-rendered.
- The CTA on every clip page routes to `/game/{slug}`, landing new visitors exactly where the core user loop (Section 6) intends.

---

## 8. Database Schema (initial draft)

Postgres-flavored, intentionally minimal for MVP — add columns/tables as real needs surface rather than speculatively.

```sql
-- Users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Games: the schema JSON is the single source of truth consumed by the
-- renderer, editor, remix system, and replay engine (see Section 5.0)
CREATE TABLE games (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID NOT NULL REFERENCES users(id),
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  template        TEXT NOT NULL,             -- 'runner' | 'dodge' | 'platformer' | 'quiz' | 'shooter'
  creation_path   TEXT NOT NULL,             -- 'manual' | 'ai'
  schema          JSONB NOT NULL,            -- entities, controls, rules, theme
  remix_of_id     UUID REFERENCES games(id), -- null if original
  is_published    BOOLEAN NOT NULL DEFAULT false,
  play_count      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_games_creator ON games(creator_id);
CREATE INDEX idx_games_remix_of ON games(remix_of_id);
CREATE INDEX idx_games_published ON games(is_published, created_at DESC);

-- Replays: the tiny, cheap-to-store record of a play session
-- (see Section 7 — this is what gameplay cam is built on)
CREATE TABLE replays (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES games(id),
  user_id     UUID REFERENCES users(id),   -- null for anonymous play
  rng_seed    TEXT NOT NULL,
  input_log   JSONB NOT NULL,              -- timestamped input/tick events
  duration_ms INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_replays_game ON replays(game_id);

-- Scores: leaderboard entries per game
CREATE TABLE scores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES games(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  value       INTEGER NOT NULL,   -- score, time, or template-appropriate metric
  metric_type TEXT NOT NULL,      -- 'score' | 'time_ms' | 'level_reached'
  replay_id   UUID REFERENCES replays(id), -- the run that produced this score, if any
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_scores_leaderboard ON scores(game_id, value DESC);

-- Clips: rendered video, generated lazily from a replay (see Section 7.2)
CREATE TABLE clips (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  replay_id    UUID NOT NULL REFERENCES replays(id),
  video_url    TEXT,             -- null until first render completes
  render_status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'rendering' | 'ready' | 'failed'
  view_count   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Remix lineage is already captured via games.remix_of_id above;
-- query recursively for a full remix tree when needed
```

Notes for whoever's implementing this:
- `games.schema` is intentionally a loose `JSONB` blob rather than fully normalized columns — the schema's internal shape will change as templates evolve, and normalizing it too early will slow iteration. Revisit only if querying into specific schema fields becomes a real bottleneck.
- `replays.input_log` being separate from `clips` is deliberate — most replays never become clips (see Section 7.2), so keep the cheap, always-created record separate from the expensive, lazily-created one.
- Add a `reports` table (reported content, reporter, reason, status) before any real public launch — see Section 12 on moderation.

---

## 9. Tech Stack (leveraging what you already know)

- **Backend:** FastAPI (you're already comfortable here from your assistant project)
- **Game schema:** define this first, before either creation path — a structured (JSON) format for entities, controls, rules, and theme that both the manual editor and (later) the AI generator write into
- **Game runtime:** HTML5 Canvas / Phaser.js — browser-portable, no install friction, reads directly from the schema regardless of how it was authored
- **Generation (Phase 2+):** hosted frontier model via API (Claude or GPT) once AI creation is added — reliability of generated schema output matters far more than cost savings; local models aren't there yet for structured output like this
- **Database:** Postgres (or Supabase to move fast — gives you auth, DB, and storage in one)
- **Frontend:** React — component reuse across editor, feed, profiles, leaderboards
- **Hosting:** Vercel/Render/Railway for fast iteration in early stages; revisit at scale

---

## 10. Roadmap

### Phase 0 — Foundation (now)
- Finalize wedge/positioning (this doc)
- Design the shared game schema — this is the single most important technical decision, since both creation paths and every downstream system depend on it
- Design the 4–5 game templates in detail: what's tweakable, what's fixed
- Set up FastAPI + frontend skeleton
- Build **one** template end-to-end through the manual builder (e.g., endless runner) as proof of concept — no AI dependency yet

### Phase 1 — MVP: manual creation + social loop (build in public starts here)
- All 4–5 templates buildable manually through the visual editor
- Publish → shareable link
- Basic per-game leaderboard
- Bare-bones discovery feed
- Launch to a small closed group (your own network) for first real usage and feedback
- **No AI creation yet** — this phase proves the social/competitive loop works and costs you nothing per user to run

### Phase 2 — Social loop hardening
- Remix flow + lineage tracking (manual-to-manual remixing first)
- Player profiles, cross-game reputation/badges
- Improve discovery feed (trending algorithm, categories)
- Start public build-in-public content (Twitter threads on architecture, demos, milestones)

### Phase 3 — AI creation layer (once manual + social loop is validated)
- Add AI generation writing into the same schema, gated behind the existing template structure
- Chat-based editing (AI patches the schema) available for both manually-built and AI-built games
- Position and price this as the premium/convenience layer — by this point you have real usage data to justify API spend and a user base to validate willingness to pay
- Polish for demo-ability: fast, impressive, reliable live demo path (the AI layer is often the most "wow" moment for hackathon/investor demos, so this is worth doing well once you get here)

### Phase 4 — Growth, funding & scale
- Apply to hackathons/funding opportunities as they arise, using Phase 1–3 traction as proof
- Begin thinking seriously about moderation infrastructure as user-generated content scales
- Broaden genre templates based on what users actually request (manual and AI both)
- Explore additional monetization beyond AI credits: premium templates, sponsored/branded templates
- Consider mobile app if browser usage patterns justify it
- Revisit on-device/local generation for AI-layer cost efficiency, *if* it makes sense by then

---

## 11. Success Metrics (early stage)

Don't over-index on vanity metrics early. Watch for:
- **Games created per active user** (creation engagement)
- **Plays per published game** (does discovery/sharing actually work?)
- **Remix rate** (% of published games that get remixed — this is your strongest differentiation signal)
- **Return rate** (do players come back without being invited again?)

---

## 12. Risks & Open Questions

- **Moderation:** public links + user-generated content = inevitable abuse vectors. Need at minimum a report/flag system and manual review process before any real public launch, even MVP.
- **Manual editor complexity:** a visual builder that's too fiddly kills the "quick and fun" promise just as badly as a slow AI. Keep the manual creation flow genuinely fast — this is worth user-testing on real people early, not just assuming it's usable.
- **Generation cost (once AI is added):** every AI creation/edit is an API call. Track cost per user from day one of Phase 3; decide on rate limits or credits before opening it to everyone.
- **Template ceiling:** if users constantly ask for genres outside your 4–5 templates, that's a signal to expand — but expanding too early sacrifices reliability, for both manual and AI paths. Track requested-but-unsupported genres as a backlog signal.
- **Naming:** confirm domain (gamio.xx), social handles, and trademark availability for "Gamio" before it's public everywhere — worth a quick check before you start posting under the name.

---

## 13. Build-in-Public Notes

Since this is going on Twitter as you build:
- Document *decisions*, not just progress — "why manual creation before AI" or "why templates over open-ended generation" makes a better thread than "shipped a button."
- Show the remix loop early and often once it exists — it's the most visually/demonstrably differentiated part of the product.
- The "we built this without needing AI to run" angle is genuinely a good build-in-public story on its own — it's a contrarian, credible point in a space where everyone assumes AI-generation is the whole product.
- Keep a running highlight reel of demo clips; hackathon and funding applications will always want a fast visual proof, and you'll have it ready instead of scrambling.
