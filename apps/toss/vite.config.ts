import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import aitDevtools from '@apps-in-toss/devtools/unplugin';

export default defineConfig(({ mode }) => ({
  plugins: mode === 'test' ? [react()] : [aitDevtools.vite({
    initialState: { deviceModes: { location: 'web' } },
  }), react()],
  // 회귀 테스트에서만 SDK를 대체한다. 일반 개발·production에는 포함하지 않는다.
  resolve: mode === 'test' ? { alias: [{ find: /^@apps-in-toss\/web-framework$/, replacement: new URL('./e2e/sdk.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') }] } : undefined,
}));
