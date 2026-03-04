/**
 * TechWise Global Versions (v1.0)
 * Single Source of Truth for Dashboard and Cockpit versioning.
 */

// The canonical version of the Global Cockpit contract/interface.
export const COCKPIT_CONTRACT_VERSION = "4.7.2";

// The overall application version from package.json
export const APP_VERSION = "1.0.301";

// The Build identifier (usually the Short Git SHA)
export const BUILD_SHA = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local";

/**
 * Formats the full version string for diagnostics or footers.
 * Example: v4.7.2 • App 1.0.301 (7a2b3c4)
 */
export const getFullVersionString = () => {
    return `v${COCKPIT_CONTRACT_VERSION} • App ${APP_VERSION} (${BUILD_SHA})`;
};
