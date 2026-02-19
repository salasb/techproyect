# Go-Live Runbook v1.0 (Wave 5.7)

## 1. Environment Configuration

### Staging vs Production
Ensure these variables are set correctly in Vercel/Infra:

| Variable | Staging Value | Production Value | Notes |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | `https://staging.techproyect.com` | `https://app.techproyect.com` | Used for absolute links (invites, magic links). |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` | **CRITICAL**: Do not mix test/live keys. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | `whsec_...` | Distinct per environment. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` | Must match Secret Key environment. |
| `RESEND_API_KEY` | `re_...` | `re_...` | Domain verification required in Resend for Prod. |
| `CRON_SECRET` | `(random string)` | `(random string)` | Protects `/api/cron/*` endpoints. |

### Security Checklist
- [ ] **Strict CSP**: `middleware.ts` headers active?
- [ ] **HSTS**: Enabled in Production? (`Strict-Transport-Security`).
- [ ] **Database Backups**: Supabase Point-in-Time Recovery (PITR) enabled?
- [ ] **RLS Policies**: Run `supa-audit` or manual check on sensitive tables (`Subscription`, `Invoice`).

## 2. Webhook Validation Procedure (End-to-End)

1.  **Trigger Mock Event**:
    ```bash
    stripe trigger customer.subscription.updated
    ```
2.  **Verify Response**:
    - Stripe CLI/Dashboard should show `200 OK`.
3.  **Verify DB Update**:
    - Check `Subscription` table: `status` should match Stripe payload.
    - Check `StripeEvent` table: New row with `status: OK`, `processedAt` populated.
4.  **Idempotency Test**:
    - Re-send **same** event ID (via Stripe Dashboard "Resend").
    - App should respond `200 OK` (not 500 or 400).
    - `StripeEvent` should **NOT** duplicate (count should stay 1).
    - Queue metrics in `/superadmin/webhooks` should show `duplication: true` or similar log.

## 3. Incident Response Playbook ("Si pasa X, haz Y")

| Scenario | Diagnosis | Action |
| :--- | :--- | :--- |
| **Webhook 400/401** | Signature invalid or Secret mismatch. | Check `STRIPE_WEBHOOK_SECRET` env var. Roll keys if needed. |
| **Webhook 500 Loop** | Code error in handler. | Check Vercel Logs + `/superadmin/webhooks`. Fix code -> "Resend" in Stripe. |
| **Double Event Processing** | Race condition or Idempotency fail. | Check `StripeEvent` processing time. Ensure Lock/Upsert logic is atomic. |
| **Org Stuck in PAST_DUE** | Payment failed but no follow-up. | Contact Customer. Use Superadmin Sync Action to force-refresh status. |
| **Invoice "Paid" but Status=OPEN** | Webhook missed/failed. | 1. Check Webhook Dashboard. 2. Use Sync to reconcile. |
| **Share Link Abuse** | High traffic from single IP. | 1. Audit Log -> Filter `QUOTE_ACCEPT_ATTEMPT`. 2. Block IP in Vercel Firewall. |
| **Rate Limit False Positive** | Valid user blocked (429). | Check `RateLimitService` thresholds. Adjust `window` or `limit` and deploy hotfix. |
| **Seats Mismatch** | Local seat count != Stripe quantity. | Run `syncSubscription(orgId)`. Investigate `sub_schedule` logic. |

## 4. Release Checklist (Pre & Post)

### Pre-Release
- [ ] **Build**: `npm run build` passes locally.
- [ ] **Lint**: `npm run lint` is clean.
- [ ] **Types**: `tsc --noEmit` passes.
- [ ] **Migrations**: `npx prisma migrate deploy` (if new schema).
- [ ] **Env Vars**: Confirmed in Vercel Dashboard.

### Post-Release (Smoke Test)
- [ ] **Login**: Admin and Member can log in.
- [ ] **Billing**: "Manage Subscription" opens Stripe Portal.
- [ ] **Public Quote**: Accessible via Incognito window.
- [ ] **Public Invite**: Link valid, properly redirects.
- [ ] **Ops**: `/superadmin/ops` loads data.
