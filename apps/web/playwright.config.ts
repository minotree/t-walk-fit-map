import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4175', channel: 'chrome', viewport: { width: 390, height: 844 } },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4175 --strictPort --mode test',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: 'https://fixture.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key',
      VITE_VWORLD_API_KEY: 'fixture-map-key',
    },
  },
});
