# Development Progress — Prima Facie

## Phase 0 — Audit (done)
Full repository audit against `PrimaFacie_ScopeAnswers.pdf`, delivered as a
chat response covering: existing architecture, scope conflicts (contractor
self-service login, direct chat, Google Meet — all in active, unrelated,
concurrent development on this same repo), missing Phase 1 features by
module, DB changes needed, external integrations, and recommended build
order.

## Phase 1 — Foundation (in progress)

**Done, tested against the live DB:**
- `users.role` extended with `ops_head` / `field_staff` (additive — existing
  `contractor`/`business`/`admin` values untouched).
- `requireRole(...)` middleware restored in `middlewares/auth.ts` for
  staff-role gating.
- New `pf_contractors` entity (+ `pf_contractor_categories`,
  `pf_contractor_documents`, `pf_contractor_certificates`) — the
  internally-managed, non-authenticated contractor record per §6/§31.
  Migration: `1787500000000_pf_contractor_entity.cjs`.
- `POST/GET/PATCH /api/internal/contractors`, `.../verification` (Ops Head
  only), `.../availability` (Field Staff + Ops Head; `SUSPENDED` is Ops Head
  only) — all gated by `requireRole('ops_head', 'field_staff')`.
- `scripts/seedStaff.ts` — provisions Ops Head / Field Staff accounts
  (no public signup, matching the existing `seedAdmin.ts` convention).
- Verification and suspension actions write to the existing `audit_logs`
  table (reused, not duplicated) with admin id, action, target, reason.
- End-to-end smoke-tested: create → list → detail (categories join) →
  field edit → verification (Ops Head only, Field Staff correctly blocked
  403) → availability (Field Staff can set most states, `SUSPENDED` Ops-Head
  only) → cross-role check (an existing `business` account is fully blocked
  from `/internal`, 403) → unauthenticated blocked (401). All passed.

**Not yet done (next):**
- Bulk CSV/Excel import for contractor records.
- Field-agent mobile-optimized entry form (frontend).
- Two-tier verification workflow UI (Standard vs. Certified) + document
  upload (blocked on picking a file-storage provider — see
  `docs/integrations.md`).
- Ops Head admin UI for the `/internal` API (currently backend-only).
- Reconciling `pf_contractors` against the in-progress `contractor_profiles`
  self-service model (see `docs/open-decisions.md`).

## Known issues / carried-over risk
- A separate, concurrent effort is actively building contractor self-service
  login, a full admin panel, Google Meet scheduling, and Socket.IO chat in
  this same repo. None of that was reverted. Reconciliation is an open
  decision, not yet resolved.
