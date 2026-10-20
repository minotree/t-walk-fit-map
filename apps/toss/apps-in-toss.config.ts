import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // 업로드 전에 콘솔에 등록한 appName과 일치하는지 확인한다.
  appName: 'walk-fit-map',
  brand: { primaryColor: '#3182F6' },
  permissions: [{ name: 'geolocation', access: 'access' }],
  webBundleDir: 'dist',
});
