import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', workers: 1, fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:4176', channel: 'chrome', viewport: { width: 390, height: 844 } },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4176 --strictPort --mode test',
    url: 'http://127.0.0.1:4176', reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://fixture.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key',
      VITE_VWORLD_API_KEY: 'fixture-map-key', VITE_AD_MODE: 'test', VITE_INTERSTITIAL_INTERVAL_SECONDS: '120' },
  },
});
