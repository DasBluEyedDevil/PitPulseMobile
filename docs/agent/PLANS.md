# Planning Workflow

SoundCheck already has a substantial `.planning/` workspace. Keep it compatible while making durable knowledge discoverable from `docs/agent/`.

## Active Planning

- `.planning/STATE.md`: current milestone state and resume notes.
- `.planning/ROADMAP.md`: active roadmap.
- `.planning/REQUIREMENTS.md`: active requirements.
- `.planning/phases/`: active and recent phase plans.
- `.planning/milestones/`: milestone requirements, roadmaps, audits, and archives.

## When To Update Plans

- Multi-file or architectural work should create or update a focused execution plan.
- When a plan produces lasting architectural knowledge, summarize that knowledge under `docs/agent/`.
- Keep transient task notes out of `AGENTS.md`.

## Plan Quality

Good plans include scope, files or subsystems, acceptance criteria, test commands, and rollback/deployment notes when relevant. Avoid large unfocused plans that mix unrelated cleanup with product changes.
