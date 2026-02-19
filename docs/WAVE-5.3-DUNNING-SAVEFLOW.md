# Wave 5.3: Revenue Recovery + Save Flow + Notification Hygiene

This wave focuses on recovering failed payments (Dunning), preventing voluntary churn (Save Flow), and cleaning up the notification system to improve user experience and retention.

## 1. Dunning Lifecycle (Revenue Recovery)

### States
- **TRIALING**: Standard 14-day trial.
- **ACTIVE**: Paid subscription.
- **PAST_DUE**: Payment failed. Grace period active (7 days by default in Stripe).
- **PAUSED**: Write-locked. Final state if recovery fails before cancellation.
- **CANCELED**: Account terminated.

### Implementation
- **PaymentIssue Model**: Tracks specific payment failures per organization.
- **Dunning Banner**: Persistent warning in Header and Billing page during `PAST_DUE`.
- **Dunning Emails**: Triggered via `LifecycleEmailService` on `invoice.payment_failed`.

## 2. Cancellation Save Flow

### Goal
Intercept cancellation attempts to offer alternatives and collect high-value feedback.

### Flow
1. User clicks "Cancel Subscription" in Billing.
2. A/B Testing Modal:
   - **Variant A (Continuity)**: Emphasis on data loss and audit history.
   - **Variant B (ROI)**: Emphasis on time saved and efficiency.
3. Reason Selection (Enum): Price, Missing Feature, Hard to Use, Switching to Competitor, etc.
4. Alternatives offered:
   - **Downgrade to SOLO**: If currently in TEAM.
   - **Pause for 30 days**: Keep data, stop billing.
   - **Talk to Support**: Direct link to priority support.

## 3. Notification Hygiene

### Policies
- **Consolidation**: Single stream for Alerts, Billing, and Nudges.
- **No Stacking**: New notifications replace old ones of the same type/severity if not acknowledged.
- **Targeting**: Only send to active users (Last login < 30 days).
- **Preferences**: Granular toggles for Email and In-app categories.

## 4. Database Changes (Summary)

- **PaymentIssue**: `id`, `organizationId`, `status`, `lastAttemptAt`, `attemptCount`, `invoiceId`.
- **CancelIntent**: `id`, `organizationId`, `reason`, `comment`, `variant`, `createdAt`.
- **ActivationEvent**: Expanded with `PAYMENT_RECOVERED`, `CANCEL_INTENT`, `CANCEL_SAVED`.

## 5. Experimentation Plan

- **Experiment Key**: `EX_SAVE_FLOW_COPY`.
- **Variants**: `CONTINUITY`, `VALUE_ROI`.
- **Metrics**: Recovery rate vs. Completion rate.
