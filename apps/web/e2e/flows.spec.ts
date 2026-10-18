import { test, expect, type Page } from '@playwright/test';

const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="green"/></svg>');
const site = { id: 'site-1', name: '회귀검사 공원', latitude: 37.5665, longitude: 126.978, is_published: true, address_text: '테스트 산책로', site_image_path: 'https://fixture-images.test/site.svg' };
const catalog = { id: 'equipment-1', name: '하늘걷기', model_name: '테스트 모델', default_image_path: image, instructions: '손잡이를 잡고 천천히 걷습니다.', effects: '균형 감각 운동', precautions: '무리하지 마세요.', source_reference: '테스트 자료' };
const equipment = { id: 'installation-1', site_id: site.id, equipment_id: catalog.id, quantity: 2, display_order: 1, is_published: true, exercise_sites: site, equipment_catalog: catalog };

async function fixtures(page: Page, mode: 'ok' | 'empty' | 'error' = 'ok') {
  const writes: string[] = [];
  await page.route('https://fixture-images.test/**', route => route.fulfill({ contentType: 'image/svg+xml', body: decodeURIComponent(image.split(',').slice(1).join(',')) }));
  await page.route('https://**.supabase.co/**', async route => {
    if (route.request().method() !== 'GET') {
      writes.push(route.request().method());
      await route.abort();
      return;
    }
    if (mode === 'error') {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'fixture unavailable' }) });
      return;
    }
    const url = new URL(route.request().url());
    const single = route.request().headers().accept?.includes('object+json');
    const rows = mode === 'empty' ? [] : url.pathname.endsWith('exercise_sites') ? [site] : [equipment];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(single ? rows[0] ?? null : rows) });
  });
  await page.route('https://api.vworld.kr/**', route => route.abort());
  return writes;
}

test('지도 마커 → 시설·사진 → 기구 → 뒤로가기와 중심 복원, 서버 쓰기 없음', async ({ page }, testInfo) => {
  const writes = await fixtures(page);
  await page.addInitScript(() => localStorage.setItem('CapacitorStorage.USER_PROFILE', JSON.stringify({ birthYear: 1990, gender: 'NONE', region: '', useCurrentLocation: false, isConfigured: true })));
  await page.goto('/home');
  await expect(page.getByText('1개의 운동시설을 불러왔습니다.', { exact: false })).toBeVisible();
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('지도 캔버스 없음');
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 - 12 } });
  await expect(page).toHaveURL(/\/sites\/site-1$/);
  await expect(page.getByText('테스트 산책로')).toBeVisible();
  await expect(page.getByRole('img', { name: site.name })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('site-detail.png') });
  await page.getByText('하늘걷기', { exact: true }).click();
  await expect(page).toHaveURL(/\/equipment\/installation-1$/);
  await expect(page.getByText(catalog.instructions)).toBeVisible();
  await expect(page.getByText(catalog.effects)).toBeVisible();
  await page.goBack();
  await expect(page.getByText('테스트 산책로')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator('canvas').first()).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('LAST_SELECTED_SITE_CENTER')!))).toEqual({ lat: site.latitude, lng: site.longitude });
  expect(writes).toEqual([]);
});

test('프로필 저장·재조회와 현재 위치 허용', async ({ page, context }) => {
  const writes = await fixtures(page);
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 37.56, longitude: 126.97 });
  await page.goto('/home');
  await expect(page.getByText('간단 사용자 정보 입력')).toBeVisible();
  await expect(page.getByText('클릭 통계로 전송하지 않습니다.', { exact: false })).toBeVisible();
  await page.locator('ion-toggle').click();
  await page.getByText('저장하기', { exact: true }).click();
  await expect(page.locator('ion-modal')).not.toBeVisible();
  await expect(page.getByText('(🔵 현위치)')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('CapacitorStorage.USER_PROFILE')!))).toMatchObject({ isConfigured: true, useCurrentLocation: true });
  await page.reload();
  await expect(page.getByText('(🔵 현위치)')).toBeVisible();
  await expect(page.locator('ion-modal')).not.toBeVisible();
  expect(writes).toEqual([]);
});

test('나중에 선택 및 위치 거부 후에도 시설을 열 수 있음', async ({ page }) => {
  await fixtures(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: (_success: unknown, failure: (error: { message: string }) => void) => failure({ message: 'permission denied' }) } });
  });
  await page.goto('/home');
  await page.getByText('나중에', { exact: true }).click();
  await expect(page.locator('ion-modal')).not.toBeVisible();
  await expect(page.getByText('1개의 운동시설을 불러왔습니다.', { exact: false })).toBeVisible();
});

test('위치 요청이 거부되어도 시설 목록을 조회한다', async ({ page }) => {
  await fixtures(page);
  await page.addInitScript(() => {
    localStorage.setItem('CapacitorStorage.USER_PROFILE', JSON.stringify({ isConfigured: true, useCurrentLocation: true }));
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: (_success: unknown, failure: (error: { message: string }) => void) => failure({ message: 'permission denied' }) } });
  });
  await page.goto('/home');
  await expect(page.getByText('1개의 운동시설을 불러왔습니다.', { exact: false })).toBeVisible();
});

for (const mode of ['empty', 'error'] as const) test(`빈 목록과 통신 오류 구분: ${mode}`, async ({ page }) => {
  await fixtures(page, mode);
  await page.goto('/home');
  await page.getByText('나중에', { exact: true }).click();
  await expect(page.getByText(mode === 'empty' ? '등록된 공개 운동시설이 없습니다.' : '운동시설 정보를 불러오지 못했습니다.', { exact: false })).toBeVisible();
});
