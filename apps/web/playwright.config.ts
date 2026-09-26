import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: process.env.DX_E2E_MANAGED_RUNNER ? undefined : [
    { command: 'node e2e/fake-services.mjs', url: 'http://localhost:3101', reuseExistingServer: false },
    { command: 'node node_modules/next/dist/bin/next dev --hostname localhost --port 3100', url: 'http://localhost:3100', reuseExistingServer: false, timeout: 120000,
      env: { DX_PUBLIC_ORIGIN:'http://localhost:3100', WEB_OIDC_ISSUER:'http://localhost:3101/realms/test', WEB_OIDC_BACKCHANNEL_ISSUER:'http://localhost:3101/realms/test', WEB_SESSION_SECRET:'isolated-e2e-signing-secret-at-least-32-characters', P_PROCESS_BASE_URL:'http://localhost:3101' } },
  ],
  use: { baseURL: 'http://localhost:3100', channel: 'chrome' },
});
