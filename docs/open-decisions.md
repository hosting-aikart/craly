# Open Decisions — Prima Facie

Tracks ambiguity discovered during implementation that the scope PDF
(`PrimaFacie_ScopeAnswers.pdf`) didn't resolve, plus decisions I made to keep
moving without inventing client intent. Per the master prompt's §79 rule.

---

## Resolved by me (documented so they can be revisited)

### The `contractor_profiles` vs `pf_contractors` split
The repo already had a `contractor_profiles` table backing a self-service
contractor login/dashboard — built before the scope PDF ruled that out. Rather
than delete it (destructive, and another process appears to be actively
extending it — see below), I added `pf_contractors` as a new, independent
table: the real internally-managed contractor entity per §6/§31. It has no
relationship to `contractor_profiles` yet. **Someone needs to decide**: does
`contractor_profiles` get retired and migrated into `pf_contractors`, or do
both stay (e.g. if self-service contractor accounts turn out to still be
wanted for a different reason)? Until that's decided, treat `pf_contractors`
as the Prima-Facie-scope-compliant source of truth and `contractor_profiles`
as legacy.

### Role naming: kept `business`, didn't add `manufacturer`
The PDF calls the paying customer "Manufacturer." The existing `users.role`
enum uses `business`. I did not rename or add a `manufacturer` value yet,
since that touches the self-service auth flow another process is actively
editing. This is a product-copy decision more than a schema one — `business`
can just be relabeled "Manufacturer" in UI text without a DB change, unless
there's a reason the two need to diverge structurally (e.g. multi-industry
support beyond manufacturers).

### Audit logging reuses the existing `audit_logs` table
A different process already created `audit_logs` (admin_id, action,
target_type, target_id, reason, metadata, created_at) for its own admin
panel. Rather than create a second, competing audit trail, `pf_contractor`
verification/suspension actions write into that same table with
`target_type = 'pf_contractor'`. Confirm this table's shape stays stable —
if the other work changes its columns, my writes will break silently.

### Document storage — not implemented yet, on purpose
`pf_contractor_documents.storage_key` is a placeholder text column. No actual
file upload/encryption is wired up — that's an external-integration decision
(storage provider, encryption approach) that needs a stop-and-confirm per
the master prompt's §75 protocol before I build it.

---

## Still open — needs the client/you to decide

- **Commission rate/structure** (Q60, explicitly TBD in the PDF). A
  configurable field is planned but not yet built.
- **Contractor ↔ manufacturer role/table reconciliation** (see above) —
  affects how much of the currently-in-progress contractor-login work
  (dashboard, inbox, Google Meet, Socket.IO chat) gets kept, retired, or
  repurposed for something outside Phase 1.
- **WhatsApp Business API** account/credentials — nothing can be built
  against this until you provide them (Meta Business account, phone number
  ID, access token, webhook setup).
- **Razorpay** account/keys — same; architecture can be stubbed but not
  connected without real credentials.
- **File storage provider** for Aadhaar/PAN documents — need a decision
  before `pf_contractor_documents` becomes more than a placeholder.
