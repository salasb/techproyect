# Security Hardening & Threat Model (Go-Live v1.0)

## 1. Overview
This document outlines the security measures implemented for the Go-Live release of the Public Portal and operational systems. It focuses on mitigating common web vulnerabilities and ensuring secure financial transactions.

## 2. Threat Model

### A. Public Portal (Quotes & Invoices)
| Threat | Mitigation Strategy | Status |
| :--- | :--- | :--- |
| **Brute Force / Enumeration** | Share Links use `uuid` + SHA-256 hash of a secure token. `id` is not sequential. Rate limiting on generation. | ✅ Implemented |
| **Data Leakage** | Public pages (`/p/*`) have `noindex` headers. Share links expire and can be revoked. Middleware enforces valid token presence. | ✅ Implemented |
| **Tampering** | Quote Acceptance uses secure server action with Idempotency. Params are signed or stored in DB state. | ✅ Implemented |
| **Payment Fraud** | Stripe Webhook validates signature (`stripe-signature`). Idempotency checks prevents double-processing. Funnels tracked. | ✅ Implemented |

### B. Infrastructure & NetSec
| Threat | Mitigation Strategy | Status |
| :--- | :--- | :--- |
| **XSS / Clickjacking** | Content Security Policy (CSP), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`. | ✅ Implemented (Middleware) |
| **Man-in-the-Middle** | HSTS enabled for production (1 year). HTTPS enforced. | ✅ Implemented |
| **DoS (Application)** | Rate Limiting on critical actions (e.g. Payments, Auth) via `RateLimitService` (AuditLog backed). | ✅ Implemented |

### C. Internal / Admin
| Threat | Mitigation Strategy | Status |
| :--- | :--- | :--- |
| **Privilege Escalation** | Middleware enforces Role-Based Access Control (RBAC) for `/admin` routes. Multi-tenancy strictly enforced via `organizationId` checks. | ✅ Implemented |
| **Insider Threat** | Audit Logging for all critical actions (Membership changes, Billing updates). Superadmin actions logged. | ✅ Implemented |

## 3. Implementation Details

### Security Headers (Middleware)
Applied globally to all routes (excluding static assets):
- `Content-Security-Policy`: Restricts script sources to self + Stripe/Supabase.
- `Strict-Transport-Security`: Max-age 1 year.
- `Referrer-Policy`: strict-origin-when-cross-origin.

### Rate Limiting
- **Service**: `RateLimitService`
- **Backend**: `AuditLog` table (Postgres)
- **Logic**: counts recent actions by IP or UserID.
- **Limits**:
  - Valid Login Attempts: N/A (Handled by Supabase Auth)
  - Public Payment Init: N/A (Handled by Stripe)
  - Quote Acceptance: 5 per hour per IP (Prevent spam).

### Stripe Integration
- **Signature Verification**: Validated using `stripe` SDK constructEvent.
- **Idempotency**: `StripeEvent` table tracks processed IDs.
- **Reconciliation**: Manual "Sync" action available for Superadmins.

## 4. Yet To Do / Future Improvements
- [ ] Move Rate Limiting to Redis for high-performance enforcing.
- [ ] Implement WAF (Cloudflare/AWS) for lower-level DDoS protection.
- [ ] Regular dependency vulnerability scanning (Dependabot/Snyk).
