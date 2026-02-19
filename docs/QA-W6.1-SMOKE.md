# QA Smoke Test - Release Candidate 1 (Auth & Core)

## Context
Refactored Auth Flow for Multi-Org users + Core Value (Quote->Invoice->Payment) Polish.

## 1. Authentication & Organization
- [ ] **New User**: SignUp -> Onboarding -> Dashboard (Auto-created Org).
- [ ] **Single Org User**: Login -> Dashboard (Redirect skips selection).
- [ ] **Multi Org User**: Login -> `/org/select` -> Select Org -> Dashboard.
- [ ] **Cookie Persistence**: Close tab -> Open -> Auto-redirects to last org.
- [ ] **Invalid Cookie**: Manually delete `app-org-id` cookie -> Reload -> `/org/select` (if multi) or Dashboard (if single).

## 2. Core Value: Quotes
- [ ] **Create Quote**: Add items -> Save.
- [ ] **Versions**: Send Quote -> Edit -> "Create Revision" -> Verify v2 created.
- [ ] **Version Selector**: Use dropdown in Quote Page to switch v1/v2. Verify totals change.
- [ ] **Public Quote**: Open public link. Verify "Accept" button works.
- [ ] **Public Quote (Accepted)**: Verify Accepted Badge.

## 3. Core Value: Invoices
- [ ] **Generate**: From Quote -> Verify Draft.
- [ ] **Partial Payment (Internal)**: Go to Project -> Invoices. Click "Pagar". Enter partial amount. Verify Status "Pendiente" and "Pagado: $X".
- [ ] **Full Payment (Internal)**: Pay remaining. Verify Status "Pagada".
- [ ] **Public Invoice**: Open public link. Verify "Pay Now" button (mocked logic or Stripe).
- [ ] **CSV Export**: In `/invoices`, click "Export CSV". Verify file download and content.

## 4. Edge Cases
- [ ] **No Org Access**: Login with user removed from all orgs -> `/start`.
- [ ] **404s**: `/projects/non-existent`, `/p/q/invalid-token`.
