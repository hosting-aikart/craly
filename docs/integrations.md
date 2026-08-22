# External Integrations — Prima Facie

Tracked per the master prompt's §62. Nothing below is connected with real
credentials yet — each needs the stop-and-ask exchange from §75 before I
wire it up.

| Service | Purpose | Free/Paid | Status | Notes |
|---|---|---|---|---|
| WhatsApp Business API | Primary notification channel (§32) | Usage-based via Meta; requires Business verification | **Pending** — no account info yet | Blocks: enquiry alerts, weekly contractor summaries, verification/renewal reminders |
| Email (Resend) | Secondary notifications | Already integrated (existing `RESEND_API_KEY`) | **Available**, reusable | Already used for the enquiry-system emails built earlier this session |
| SMS provider | Fallback notification channel | Usage-based, provider TBD | **Pending** — no provider chosen | Lowest priority per §18 ("primary/secondary/fallback") |
| Razorpay | Manufacturer subscription billing | Transaction-fee based | **Pending** — no account/keys | Manual invoicing for first 6 months per Q35; architect for Razorpay, don't activate yet |
| File storage (encrypted) | Aadhaar/PAN document storage | Depends on provider (e.g. S3-compatible with SSE) | **Pending** — no provider chosen | Blocks `pf_contractor_documents` becoming real |
| PDF generation | Watermarked report/profile exports | Likely a free library (no account needed) | **Not started** | Lower priority — no reports feature built yet |
| Google Calendar/Meet (`googleapis`) | Meeting scheduling | Free (Google Cloud OAuth) | **Already added by other in-progress work** | Not part of Prima Facie's Phase 1 scope — flagged as a scope conflict in the audit; not mine to remove unasked |
| Socket.IO | Real-time chat | Free (self-hosted) | **Already added by other in-progress work** | Same — explicitly out of scope for Phase 1 per the PDF (§10/§22 say brokered-by-staff, not direct real-time chat) |

## What I need from you, when we reach each one

I won't request credentials before the feature that needs them is actually
being built (per §76: "don't block unrelated development waiting for a key").
When we get there, expect a request shaped like:

```
I need this service.
Why: <feature>
Free: <yes/no>, <dev cost>, <production cost>
Account creation: <steps>
Credentials required: <list>
Environment variables: <list>
```
