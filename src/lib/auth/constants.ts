/**
 * Auth & Session Constants
 * v1.0: Canonical source for cookie names and security attributes.
 */

// Prefix __Host- ensures: Secure, Path=/, No Domain.
// Perfect for Vercel Preview and B2B isolation.
export const ORG_CONTEXT_COOKIE = "__Host-app-org-id";

// Use standard name if __Host- is not possible in some environments, 
// but for this project we enforce it.
export const LEGACY_ORG_CONTEXT_COOKIE = "app-org-id";
