# Gamio — Engineering Guiderail Prompt

*Paste this at the start of a build session with your AI coding assistant, alongside the PRD (PRD_AI_Game_Hub.md). This document tells the assistant how to use the PRD; it does not replace it.*

---

## Context

I'm building Gamio, a social game platform: users create games (manual visual builder, or later AI-generated from a text description), publish them with a shareable link, compete on leaderboards, and remix each other's games. The attached PRD is the source of truth for product decisions, sequencing, and the database schema — read it fully before writing any code, and re-check it whenever a decision feels ambiguous.

I'm building this as a real startup, not a hackathon throwaway. I have no fixed deadline. Correctness and a clean foundation matter more than speed. Do not skip steps to "move fast" unless I explicitly ask for a quick prototype.

## How to use the PRD while building

- Treat **Section 5.0 (shared game schema)** as non-negotiable architecture. Every feature you build — manual editor, renderer, leaderboard, remix system, replay/gameplay-cam — must read and write the same schema. If you find yourself building a feature that needs its own separate data shape, stop and flag it to me before proceeding; that's usually a sign the schema needs to grow, not that the feature needs its own path.
- Treat **Section 7 (Gameplay Cam)** as the spec for replay-based capture, not raw video capture. Specifically: log inputs/ticks/RNG seed during play, upload only the log, render to video lazily and only on explicit share action. Do not implement `MediaRecorder`-based live capture as the primary path — it was deliberately rejected for cost and reliability reasons explained in that section.
- Treat **Section 8 (Database Schema)** as the starting schema. You may propose additions as real needs surface, but don't restructure existing tables without flagging why to me first — some of the choices (e.g. `games.schema` as loose JSONB, `replays` separate from `clips`) are deliberate, not oversights.
- Follow the **Roadmap phase sequencing (Section 10)** — specifically: manual creation and the social loop (create → publish → play → leaderboard) come before AI creation, and before gameplay cam. Don't build AI generation or gameplay cam scaffolding ahead of the core loop being functional, even if it seems more interesting to build first.
- Anything marked **"Explicitly OUT of MVP scope" (Section 5)** should not be built unless I explicitly ask for it in a given session, even if it seems like a natural extension of what you're already working on.

## Engineering standards

- **Tech stack:** FastAPI backend, React frontend, Postgres (or Supabase), Phaser.js/HTML5 Canvas for the game runtime. Stick to this stack unless I explicitly ask to evaluate an alternative.
- **All randomness inside a game template must route through a single seeded RNG utility.** This is a hard requirement, not a style preference — gameplay cam's replay system depends on determinism, and retrofitting this after templates are built is expensive. Flag any code that introduces `Math.random()` or an unseeded random call directly.
- **Write for the schema, not around it.** If a template needs a new capability (a new entity type, a new rule type), extend the schema definition first, then build the feature on top of the extended schema — don't hardcode template-specific logic outside the schema's structure.
- **Keep manual creation fully functional without any AI dependency.** Nothing in the manual builder, publish flow, leaderboard, or discovery feed should require an API key or external model call to work end-to-end.
- **Comment non-obvious architectural decisions in code**, especially anywhere the code diverges from what a simpler implementation would look like — future-me (and future contributors) need to know *why*, not just *what*.
- **Ask before introducing new dependencies**, especially anything that adds ongoing cost (hosted services, paid APIs) or significant complexity (new build tooling, new infra).

## What to do when something in the PRD is unclear or seems wrong

Don't guess silently and don't block on it either. Flag the ambiguity or disagreement directly, propose your best interpretation, and proceed with that interpretation unless I say otherwise — the same way I'd want a competent engineer on a real team to operate.

## Session working style

- Confirm which roadmap phase we're working in at the start of a session if it's not obvious from my request.
- When a task touches the schema, the replay system, or the DB schema, explicitly note which PRD section governs it before proposing an implementation.
- If a request from me conflicts with something explicit in the PRD (e.g. I ask for a feature marked out-of-scope), point that out rather than silently building it — I may be intentionally changing course, but I want to know I'm doing that.
