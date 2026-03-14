# Employer Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Stochi more impressive to employer reviewers by tightening the demo narrative, removing credibility leaks, adding visible CI enforcement, updating stale docs, and hardening a representative multi-write backend flow.

**Architecture:** Keep the existing product and architecture intact. Improve first-impression trust at the landing/demo layer, align employer-facing documentation with the actual engine-first-plus-TypeScript-fallback system, and use one concrete backend hardening pass in onboarding to demonstrate production-minded engineering discipline.

**Tech Stack:** Next.js 16, React 19, TypeScript, Bun, Drizzle ORM, Go, GitHub Actions, Node test runner

---

### Task 1: Landing and Demo Credibility Pass

**Files:**
- Modify: `apps/web/src/app/landing-page.test.tsx`
- Modify: `apps/web/src/app/demo/demo-dashboard-client.test.tsx`
- Modify: `apps/web/src/app/landing-page.tsx`
- Modify: `apps/web/src/components/landing/hero-interaction-alert.tsx`
- Modify: `apps/web/src/components/demo/demo-banner.tsx`

**Step 1: Write the failing tests**

Add assertions that require:
- landing copy to describe Stochi as a supplement protocol engine, not just a stack audit
- landing hero to prioritize `/demo` as the evaluator CTA
- landing proof to avoid hardcoded invented-looking metrics like `89,412`, `1,423`, `47ms`, and `Execute 15+ supplements in 300ms`
- demo banner to explicitly say demo data is simulated/resettable and that sign-up is required to save real data

**Step 2: Run tests to verify they fail**

Run:

```bash
bun test src/app/landing-page.test.tsx src/app/demo/demo-dashboard-client.test.tsx
```

Expected: FAIL because the current copy and credibility constraints are not implemented yet.

**Step 3: Write minimal implementation**

Update the landing page to:
- make `Try the Interactive Demo` the main hero CTA
- shift the one-line narrative toward protocol intelligence / reactive system behavior
- replace hardcoded proof-like stats with concrete descriptive trust signals
- add a small evaluator note around what is interactive vs saved

Update `HeroInteractionAlert` to remove invented-looking counts/performance numbers and use grounded trust language instead.

Update `DemoBanner` to clarify that demo mode uses resettable sample data and does not persist changes.

**Step 4: Run tests to verify they pass**

Run:

```bash
bun test src/app/landing-page.test.tsx src/app/demo/demo-dashboard-client.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/app/landing-page.test.tsx apps/web/src/app/demo/demo-dashboard-client.test.tsx apps/web/src/app/landing-page.tsx apps/web/src/components/landing/hero-interaction-alert.tsx apps/web/src/components/demo/demo-banner.tsx
git commit -m "feat(marketing): tighten employer demo narrative"
```

### Task 2: Visible CI Quality Gates

**Files:**
- Create: `.github/workflows/quality.yml`
- Modify: `README.md`

**Step 1: Write the failing test**

Create a source-contract test file that asserts:
- `.github/workflows/quality.yml` exists
- the workflow runs on push and pull_request
- the workflow includes `bun run check`, `bun test`, and `go test ./...`

Suggested file:
- Create: `apps/web/src/app/repo-quality-contract.test.ts`

**Step 2: Run test to verify it fails**

Run:

```bash
bun test src/app/repo-quality-contract.test.ts
```

Expected: FAIL because the workflow does not exist yet.

**Step 3: Write minimal implementation**

Add a GitHub Actions workflow that:
- checks out the repo
- installs Bun
- runs `bun install` in `apps/web`
- runs `bun run check` in `apps/web`
- runs `bun test` in `apps/web`
- sets up Go and runs `go test ./...` in `apps/engine`

Mention this quality gate in `README.md`.

**Step 4: Run test to verify it passes**

Run:

```bash
bun test src/app/repo-quality-contract.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add .github/workflows/quality.yml README.md apps/web/src/app/repo-quality-contract.test.ts
git commit -m "chore(ci): add visible quality gates"
```

### Task 3: Docs Alignment Pass

**Files:**
- Modify: `README.md`
- Modify: `docs/showcase-for-employers.md`
- Modify: `docs/technical_design_doc.md`
- Modify: `apps/engine/README.md`
- Modify: `apps/web/src/app/layout.tsx`

**Step 1: Write the failing tests**

Add/extend source-contract tests that require:
- root metadata and README to use the same narrative
- technical design doc to reference Next.js 16 and the correct schema path
- engine README to describe current internal auth headers instead of bearer session token

Suggested test file:
- Create: `apps/web/src/app/docs-alignment.test.ts`

**Step 2: Run test to verify it fails**

Run:

```bash
bun test src/app/docs-alignment.test.ts
```

Expected: FAIL because the docs are currently inconsistent.

**Step 3: Write minimal implementation**

Update docs and metadata so they consistently describe Stochi as:
- a supplement protocol intelligence app
- with an engine-first analysis path and TypeScript fallback
- with a recruiter/employer-friendly demo-first evaluation path

Correct stale implementation details in the technical design doc and engine README.

**Step 4: Run tests to verify they pass**

Run:

```bash
bun test src/app/docs-alignment.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add README.md docs/showcase-for-employers.md docs/technical_design_doc.md apps/engine/README.md apps/web/src/app/layout.tsx apps/web/src/app/docs-alignment.test.ts
git commit -m "docs(architecture): align employer and engine docs"
```

### Task 4: Onboarding Transaction Hardening

**Files:**
- Create: `apps/web/src/server/actions/onboarding-payloads.test.ts`
- Modify: `apps/web/src/server/actions/onboarding.ts`

**Step 1: Write the failing tests**

Write tests for pure helper behavior that prove we prepare transaction-safe write batches correctly. Extract deterministic helper(s) if needed.

Test cases:
- preparing onboarding writes preserves supplement order and timing slots
- preparing goal rows assigns priority from selection order
- template instantiation payload builds stack items and logs from the supplement map

If transaction orchestration needs pure helpers, extract them from `onboarding.ts` into the same file or a small helper module and test those helpers directly.

**Step 2: Run test to verify it fails**

Run:

```bash
bun test src/server/actions/onboarding-payloads.test.ts
```

Expected: FAIL because the helper or behavior does not exist yet.

**Step 3: Write minimal implementation**

Refactor onboarding writes to use `db.transaction(...)` for:
- `instantiateTemplate`
- `createStackFromOnboarding`
- `createStackFromTemplate`
- `clearTemplateData`

Keep behavior the same while making multi-write flows atomic. Extract small deterministic payload builders only where needed to support tests.

**Step 4: Run tests to verify they pass**

Run:

```bash
bun test src/server/actions/onboarding-payloads.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/server/actions/onboarding.ts apps/web/src/server/actions/onboarding-payloads.test.ts apps/web/src/server/actions/onboarding-payloads.ts
git commit -m "fix(onboarding): make onboarding writes atomic"

```

### Task 5: Final Verification

**Files:**
- No file changes required unless validation exposes issues

**Step 1: Run targeted web tests**

```bash
bun test src/app/landing-page.test.tsx src/app/demo/demo-dashboard-client.test.tsx src/app/repo-quality-contract.test.ts src/app/docs-alignment.test.ts src/server/actions/onboarding.transactions.test.ts
```

Expected: PASS.

**Step 2: Run full web quality gate**

```bash
bun run check
bun test
```

Expected: PASS.

**Step 3: Run engine verification**

```bash
go test ./...
```

Expected: PASS.

**Step 4: Review git status**

```bash
git status --short
```

Expected: only intended files changed.

**Step 5: Commit final fixes if needed**

Commit only if validation work required additional changes.
