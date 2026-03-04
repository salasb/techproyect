import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { globSync } from 'glob';
import path from 'path';

describe('Cockpit Versioning Integrity', () => {
  it('should not contain hardcoded legacy version strings like v4.6.0 or v4.7.2', () => {
    const adminFiles = globSync('src/app/admin/**/*.{ts,tsx}');
    const legacyVersions = ['Global Cockpit v4.6.0', 'Global Cockpit v4.7.2'];

    adminFiles.forEach(file => {
      const content = readFileSync(file, 'utf-8');
      legacyVersions.forEach(version => {
        expect(content).not.toContain(version);
      });
    });
  });

  it('should use COCKPIT_CONTRACT_VERSION for version display', () => {
    const pageContent = readFileSync('src/app/admin/page.tsx', 'utf-8');
    expect(pageContent).toContain('v{COCKPIT_CONTRACT_VERSION}');
  });
});
