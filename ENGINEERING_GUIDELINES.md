# Trading Journal Engineering Guidelines

These guidelines apply the installed `karpathy-guidelines` skill to this project. The goal is to keep implementation clear, verifiable, and appropriately scoped as the app grows from requirements into code.

## Working Style

- State assumptions before implementing when the requirement leaves room for interpretation.
- Prefer the minimum code that solves the current requirement.
- Avoid speculative abstractions, unused configuration, and future-proofing that has no immediate use.
- Keep changes surgical. Every changed line should connect to the current task.
- Match existing project patterns once code exists, even when another style is personally preferred.
- Mention unrelated issues when noticed, but do not fix them unless they block the task.
- Always update `IMPLEMENTATION_STATUS.md` after implementation changes so humans and future AI assistants can understand current project state.

## Definition of Done

Every implementation task should have explicit verification before coding starts:

- Data model work: migration applies, constraints match ownership and uniqueness rules, and Prisma types generate.
- API/server action work: authorization is tested, invalid input fails clearly, and happy path persists expected data.
- Sync work: cursor behavior, idempotent upserts, symbol filtering, and sync logs are covered by tests or fixtures.
- UI work: loading, empty, error, disabled, and success states are present where relevant.
- Mobile work: the main flow is checked at a phone-sized viewport.
- Security work: secrets are not returned, logged, or exposed in client bundles.
- Handoff work: `IMPLEMENTATION_STATUS.md` reflects the new behavior, verification status, and known gaps.

## Planning Template

For substantial tasks, use this shape:

1. Change: what will be added or modified.
   Verify: how success will be checked.
2. Change: what will be added or modified.
   Verify: how success will be checked.
3. Change: what will be added or modified.
   Verify: how success will be checked.

Keep the plan short. The plan is a steering tool, not a second roadmap.

## Simplicity Rules

- Do not add background sync until manual sync is correct.
- Do not add more exchanges until BingX sync is reliable.
- Do not add manual trade creation for MVP.
- Do not add a separate backend unless the monolithic app has a clear, current limitation.
- Do not add complex state management until prop flow or server/client boundaries prove it is needed.
- Do not add AI review features until the journal data model and analytics are stable.

## Surgical Change Rules

- Touch only the files required for the task.
- Do not reformat unrelated files.
- Remove only unused code introduced by the current change.
- Keep generated or local runtime files out of commits.
- Preserve user data and journal fields when rebuilding synced trades.
- Keep raw exchange payloads intact unless a migration explicitly changes their storage format.

## Prisma Migration Rules

- When an AI assistant changes `prisma/schema.prisma`, it must create or ask the user to create migrations with an explicit meaningful name.
- Prefer `npx prisma migrate dev --name <phase-or-change-name>` over bare `prisma migrate dev` for assistant-created schema changes.
- Use concise kebab-case names that describe intent, such as `raw-sync-foundation`, `trade-journal-fields`, or `exchange-connection-soft-delete`.
- Do not rely on Prisma's interactive migration-name prompt during automated or agent-led work.
- Before and after migration work, run `npm run prisma:generate` and the relevant verification commands.

## Verification Bias

Prefer small, durable checks over broad unverified changes:

- Unit tests for pure logic:
  - Initial sync range resolution
  - Symbol include/exclude filtering
  - Suggestion ranking
  - Settlement rules
  - P&L calculations
- Integration tests for user-scoped behavior:
  - User isolation
  - Exchange connection CRUD
  - Collection type validation
  - Sync logs
  - Force resync
- E2E tests for primary flows:
  - Register/login
  - Add BingX connection
  - Configure trading collection
  - Manual sync
  - Review and journal a trade
  - Filter dashboard metrics

## Assumption Log

Record meaningful product or technical assumptions in the relevant roadmap or implementation notes when they affect future decisions. Examples:

- Which BingX market type is supported first.
- Whether screenshots are stored on app-server disk or object storage.
- Which deployment target is expected for MVP.
- Which icon family and design tokens are chosen.
