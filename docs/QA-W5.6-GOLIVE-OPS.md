# QA Checklist: Wave 5.6 Go-Live Ops Pack

## 1. Webhooks & Billing Reliability
- [ ] **Webhook Health Dashboard**
    - [ ] Navigate to `/superadmin/webhooks`.
    - [ ] Verify recent events are listed.
    - [ ] Filter by 'ERROR' status.
    - [ ] Click "Eye" icon to view payload details.
- [ ] **Stripe Webhook Handler**
    - [ ] Trigger a `customer.subscription.updated` event (via Stripe CLI or Test Clock).
    - [ ] Verify DB updates `Subscription` status correctly.
    - [ ] Verify `StripeEvent` table records the event with `status: OK` and `durationMs`.
    - [ ] Simulate an error (e.g. invalid payload) -> Verify `StripeEvent` records `status: ERROR`.
- [ ] **Subscription Sync**
    - [ ] (If UI implemented) Click "Sync Subscription" on an Organization detail page.
    - [ ] Verify toaster success message.

## 2. Security Hardening
- [ ] **Security Headers**
    - [ ] Open DevTools -> Network.
    - [ ] Inspect response headers for any page (e.g. `/dashboard`).
    - [ ] Verify `Content-Security-Policy`, `X-Frame-Options: DENY`, `Strict-Transport-Security` are present.
- [ ] **Rate Limiting**
    - [ ] Attempt to accept a public quote 6 times in rapid succession (simulating script).
    - [ ] Verify 6th attempt returns `429 Too Many Requests`.
- [ ] **Public Portal**
    - [ ] Verify Public Quote / Invoice pages load correctly (assets not blocked by CSP).
    - [ ] Verify `noindex` tag is present.

## 3. Observability & Alerts
- [ ] **Past Due Alert**
    - [ ] Manually set a Subscription status to `PAST_DUE` in DB.
    - [ ] Run Sentinel (or wait for job).
    - [ ] Verify "Suscripción Vencida" alert appears in Notification Center.
- [ ] **Webhook Failure Alert**
    - [ ] Manually insert a `StripeEvent` with `status: ERROR` and recent `createdAt`.
    - [ ] Run Sentinel.
    - [ ] Verify "Error de Sincronización" alert appears.

## 4. Regression Testing
- [ ] Verify normal Login flow works (Middleware check).
- [ ] Verify Checkout flow works (Middleware check).
