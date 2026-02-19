# QA Smoke Test: Go-Live v1.0 (Wave 5.7)

**Objective**: Verify critical paths in Production environment without causing data corruption or financial loss (use small test charges or immediate voids if testing payments).

## 1. Organization & Lifecycle
- [ ] **Trial Expiration**:
  - Set Org `trialEndsAt` to yesterday (DB).
  - Verify UI shows "Trial Expired" / "Upgrade Needed".
  - Attempt to create Project -> Should be blocked (Read-Only Mode).
- [ ] **Upgrade Flow**:
  - Complete Checkout (Test Mode if possible, or real low-value + refund).
  - Verify Webhook received -> Org Status `ACTIVE`.
  - Verify Write access restored.
- [ ] **Org Switching**:
  - Login as user with 2 Orgs.
  - Switch Org A -> B.
  - Verify URL changes, Data (Projects) changes strictly to Org B.
  - Check `AuditLog`: Action `ORG_SWITCH` recorded (if logged).

## 2. Public Portal (Quotes & Invoices)
- [ ] **Public Quote**:
  - Generate Link -> Open in Incognito.
  - Click "Accept".
  - Verify User is redirected to "Success" state.
  - Refresh Page -> Still "Accepted" (Idempotent).
  - Check `AuditLog` for "QUOTE_ACCEPT_PUBLIC".
- [ ] **Public Invoice**:
  - Open Link -> Verify Amount/Details.
  - Click Pay (if enabled) -> Redirects to Stripe/Checkout.
  - (After Pay) -> Verify Invoice Status `PAID`.
  - Refresh -> "Already Paid" message (Prevent double pay).

## 3. Team Management
- [ ] **Invite Flow**:
  - Send Invite to email.
  - Click Link -> Register/Login.
  - Verify added to Org Member list.
- [ ] **Seat Limits**:
  - If Plan has 1 seat and 1 active user -> Attempt Invite.
  - Should block or warn "Upgrade required".
- [ ] **Rate Limiting**:
  - Rapidly click "Resend Invite" (10x).
  - Verify `429 Too Many Requests` or UI disabled state after N attempts.

## 4. Operational Monitoring
- [ ] **Webhook Failure Sim**:
  - (Dev/Staging) Manually insert `StripeEvent` with `status: ERROR`.
  - Trigger Sentinel (Job or Manual).
  - Verify Alert `WEBHOOK_FAILURE` appears in Notification Center.
- [ ] **Ops Dashboard**:
  - Go to `/superadmin/ops`.
  - Verify stats are loading (not 0 if data exists).
  - Verify "Recent Queue" updates after new webhook.
