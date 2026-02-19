# QA Checklist: Wave 5.3 Revenue Recovery

## 1. Dunning & Recovery
- [ ] Trigger `invoice.payment_failed`:
    - [ ] `PaymentIssue` created in DB with `OPEN` status.
    - [ ] `DunningBanner` appears in AppHeader.
    - [ ] Dunning Email sent to Admins.
    - [ ] Subscription status = `PAST_DUE`.
- [ ] Trigger `invoice.payment_succeeded`:
    - [ ] `PaymentIssue` status = `RESOLVED`.
    - [ ] `DunningBanner` disappears.
    - [ ] Recovery Email sent.
    - [ ] Subscription status = `ACTIVE`.

## 2. Cancellation Save Flow
- [ ] Click "Cancelar Suscripción":
    - [ ] `CancelModal` appears with A/B variant applied.
    - [ ] `CANCEL_INTENT` tracked in `ActivationEvent`.
- [ ] Test Alternatives:
    - [ ] Pause Subscription (Success toast).
    - [ ] Downgrade to Solo (Success toast).
- [ ] Confirm Cancellation:
    - [ ] Redirect to Stripe Portal.
    - [ ] `CancelIntent` outcome = `CANCEL_PENDING`.

## 3. Notification Hygiene
- [ ] `NotificationCenter` shows Billing Issues for Admins only.
- [ ] Nudges are dismissible and deduplicated by key.
- [ ] Sentinel alerts are fetch and order correctly.

## 4. Analytics
- [ ] Superadmin dashboard shows recover metrics.
- [ ] Funnel events: `PAYMENT_FAILED`, `PAYMENT_RECOVERED`, `CANCEL_INTENT`, `CANCEL_SAVED` are present in `ActivationEvent` table.
