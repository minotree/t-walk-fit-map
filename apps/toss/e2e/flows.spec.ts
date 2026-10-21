import { expect, test, type Page } from '@playwright/test';

const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="200" height="120" fill="#e8f3ff"/></svg>');
const site = { id: 'site-1', name: '검증 공원', latitude: 37.5665, longitude: 126.978, is_published: true,
  address_text: '테스트 산책로', site_image_path: image };
const equipment = { id: 'installation-1', site_id: site.id, equipment_id: 'equipment-1', quantity: 2, display_order: 1,
  is_published: true, exercise_sites: site, equipment_catalog: { id: 'equipment-1', name: '하늘걷기', model_name: 'A',
    default_image_path: image, instructions: '손잡이를 잡고 천천히 걷습니다.', effects: '균형 감각 운동', precautions: '무리하지 마세요.' } };

async function fixtures(page: Page, configured = true, mode: 'ok' | 'empty' | 'error' = 'ok') {
  const writes: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  if (configured) await page.addInitScript(() => {
    localStorage.setItem('test:USER_PROFILE', '{"isConfigured":true,"useCurrentLocation":false}');
  });
  await page.route('https://**.supabase.co/**', async route => {
    if (new URL(route.request().url()).pathname.endsWith('/rpc/get_published_site_photo') && route.request().method() === 'GET') {
      await route.fulfill({ json: 'https://images.example.test/current-survey.jpg' }); return;
    }
    if (route.request().method() !== 'GET') { writes.push(route.request().method()); await route.abort(); return; }
    if (mode === 'error') { await route.fulfill({ status: 403, json: { message: 'fixture unavailable' } }); return; }
    const single = route.request().headers().accept?.includes('object+json');
    const data = mode === 'empty' ? [] : new URL(route.request().url()).pathname.endsWith('exercise_sites') ? [site] : [equipment];
    await route.fulfill({ json: single ? data[0] ?? null : data });
  });
  await page.route('https://images.example.test/current-survey.jpg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="200" height="120" fill="blue"/></svg>' }));
  await page.route('https://api.vworld.kr/**', route => route.abort());
  return { writes, errors };
}

test('위치 확인 중·완료·목록 펼침에서 버튼의 지도 하단 간격을 유지한다', async ({ page }) => {
  await fixtures(page);
  await page.goto('/home?slowLocation');
  await expect(page.locator('summary')).toBeVisible();
  const geometry = () => page.evaluate(() => {
    const frame = document.querySelector('.map-frame')!.getBoundingClientRect();
    const button = document.querySelector('.map-location')!.getBoundingClientRect();
    return { top: frame.top, height: frame.height, gap: frame.bottom - button.bottom };
  });
  const before = await geometry();
  await page.getByRole('button', { name: '현재 위치로 이동' }).click();
  await expect(page.getByText('현재 위치를 확인하고 있어요.')).toBeVisible();
  expect(await geometry()).toEqual(before);
  await expect(page.getByText('현재 위치를 확인하고 있어요.')).toHaveCount(0);
  expect(await geometry()).toEqual(before);
  expect(before.gap).toBe(16);
  await page.locator('summary').click();
  expect((await geometry()).gap).toBe(16);
});

test('마커→전면 광고→지점→기구, 3개 화면 배너와 뒤로가기', async ({ page }, info) => {
  const { writes, errors } = await fixtures(page);
  await page.goto('/home');
  await expect(page.locator('.app-header')).toHaveCSS('padding-top', '12px');
  await expect(page.getByRole('region', { name: '운동시설 지도' })).toBeVisible();
  await expect(page.getByText('Ad · 테스트 배너')).toBeVisible();
  await expect(page.locator('summary').filter({ hasText: '목록으로 보기' })).toBeVisible();
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('지도 캔버스 없음');
  await canvas.click({ position: { x: bounds.width / 2, y: bounds.height / 2 } });
  await expect(page.getByRole('dialog', { name: '테스트 전면 광고' })).toBeVisible();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole('button', { name: '테스트 광고 닫기' }).click();
  await expect(page.getByRole('heading', { name: site.name })).toBeVisible();
  await expect(page.locator('img[src="https://images.example.test/current-survey.jpg"]')).toBeVisible();
  await expect(page.getByText('테스트 산책로')).toBeVisible();
  await expect(page.getByText('Ad · 테스트 배너')).toBeVisible();
  await page.screenshot({ path: info.outputPath('site.png') });
  await page.getByRole('link', { name: '하늘걷기' }).click();
  await expect(page.getByText(equipment.equipment_catalog.instructions)).toBeVisible();
  await expect(page.getByText('Ad · 테스트 배너')).toBeVisible();
  await page.screenshot({ path: info.outputPath('equipment.png') });
  await page.getByRole('button', { name: '뒤로' }).click();
  await expect(page.getByRole('heading', { name: site.name })).toBeVisible();
  await page.getByRole('button', { name: '뒤로' }).click();
  await page.locator('summary').filter({ hasText: '목록으로 보기' }).click();
  await page.getByRole('button', { name: site.name }).click();
  await expect(page.getByRole('heading', { name: site.name })).toBeVisible();
  await expect(page.getByRole('dialog', { name: '테스트 전면 광고' })).toHaveCount(0);
  expect(writes).toEqual([]); expect(errors).toEqual([]);
});

test('광고 로드/표시 실패는 지점 이동을 막지 않는다', async ({ page }) => {
  await fixtures(page);
  for (const reason of ['loadFail', 'showFail']) {
    await page.goto(`/home?${reason}`);
    await page.locator('summary').filter({ hasText: '목록으로 보기' }).click();
  await page.getByRole('button', { name: site.name }).click();
    await expect(page.getByRole('heading', { name: site.name })).toBeVisible();
    await expect(page.getByRole('dialog', { name: '테스트 전면 광고' })).toHaveCount(0);
  }
});

test('배너 미충전 시 빈 공간이 남지 않는다', async ({ page }) => {
  await fixtures(page); await page.goto('/home?noFill');
  await expect(page.getByRole('region', { name: '운동시설 지도' })).toBeVisible();
  await expect(page.locator('.banner')).toHaveAttribute('aria-hidden', 'true');
  const menu = await page.locator('.home-map').boundingBox();
  expect(menu).not.toBeNull();
  expect((menu?.y ?? 0) + (menu?.height ?? 0)).toBe(844);
  const locate = page.getByRole('button', { name: '현재 위치로 이동' });
  await expect(locate).toBeVisible();
  const button = await locate.boundingBox();
  expect((button?.y ?? 0) + (button?.height ?? 0)).toBeLessThan(844);
  await expect(page.locator('.bottom-menu')).toHaveCount(0);
});

test('프로필 저장·새로고침 및 위치 권한 거부 안내', async ({ page }) => {
  await fixtures(page, false); await page.goto('/home?denyLocation');
  await expect(page.getByRole('dialog', { name: '프로필 설정' })).toBeVisible();
  await page.getByLabel('출생 연도 (선택)').selectOption('1971');
  await expect(page.getByLabel('거주 지역 (시/군/구)')).toBeDisabled();
  await page.getByLabel('거주 지역 (시/도)').selectOption('서울특별시');
  await page.getByLabel('거주 지역 (시/군/구)').selectOption('도봉구');
  await page.getByLabel('현재 위치 사용').check();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '프로필 설정' })).toHaveCount(0);
  await expect(page.getByText('위치를 확인하지 못했어요.', { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: '운동시설 지도' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: '프로필 설정' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('test:USER_PROFILE'))).toContain('서울특별시 도봉구');
  await page.getByRole('button', { name: '프로필', exact: true }).click();
  await expect(page.getByLabel('거주 지역 (시/도)')).toHaveValue('서울특별시');
  await expect(page.getByLabel('출생 연도 (선택)')).toHaveValue('1971');
  await expect(page.getByLabel('거주 지역 (시/군/구)')).toHaveValue('도봉구');
  await page.getByLabel('거주 지역 (시/도)').selectOption('부산광역시');
  await expect(page.getByLabel('거주 지역 (시/군/구)')).toHaveValue('');
  await expect(page.getByLabel('거주 지역 (시/군/구)').getByRole('option', { name: '도봉구', exact: true })).toHaveCount(0);
});

test('320px 화면에서 가로 넘침 없이 기구 상세 직접 접근', async ({ page }, info) => {
  const { errors } = await fixtures(page); await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/sites/site-1/equipment/installation-1');
  await expect(page.getByRole('heading', { name: '하늘걷기' })).toBeVisible();
  await expect(page.getByText('Ad · 테스트 배너')).toBeVisible();
  const sizes = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.width);
  const main = await page.locator('main').boundingBox(); const banner = await page.locator('.banner-visible').boundingBox();
  expect((main?.y ?? 0) + (main?.height ?? 0)).toBeLessThanOrEqual(banner?.y ?? 0);
  expect(banner?.height).toBe(96);
  await page.screenshot({ path: info.outputPath('small-screen.png') }); expect(errors).toEqual([]);
});

for (const mode of ['empty', 'error'] as const) test(`빈 목록과 조회 실패 구분: ${mode}`, async ({ page }) => {
  await fixtures(page, true, mode); await page.goto('/home');
  await expect(page.locator('.app-header')).toHaveCSS('padding-top', '12px');
  await expect(page.getByText(mode === 'empty' ? '현재 지도 범위에 공개 운동시설이 없어요.' : '정보를 불러오지 못했어요. 다시 시도해 주세요.')).toBeVisible();
});

test('지도 범위 조회·가까운 순 20개·더 보기·지도 이동 후 목록 갱신', async ({ page }) => {
  await fixtures(page);
  const locations = Array.from({ length: 45 }, (_, index) => ({ ...site, id: `s-${index}`,
    name: `지점 ${String(index).padStart(2, '0')}`, latitude: site.latitude + index * 0.000001 }));
  const queries: URL[] = [];
  await page.route('https://fixture.supabase.co/rest/v1/exercise_sites*', async route => {
    const url = new URL(route.request().url()); queries.push(url);
    const bounds = (name: string, operator: string) => Number(url.searchParams.getAll(name).find(value => value.startsWith(`${operator}.`))?.slice(4));
    const visible = locations.filter(item => item.longitude >= bounds('longitude', 'gte') && item.longitude <= bounds('longitude', 'lte') &&
      item.latitude >= bounds('latitude', 'gte') && item.latitude <= bounds('latitude', 'lte'));
    await route.fulfill({ json: visible });
  });
  await page.goto('/home');
  await page.locator('summary').filter({ hasText: '목록으로 보기' }).click();
  await expect(page.locator('summary')).toHaveText('목록으로 보기 (45곳)');
  const list = page.getByRole('region', { name: '현재 지도 범위의 운동시설 목록' });
  await expect(list.getByRole('button', { name: /^지점 / })).toHaveCount(20);
  await expect(list.getByRole('button').first()).toHaveText('지점 00');
  await list.getByRole('button', { name: '더 보기' }).click();
  await expect(list.getByRole('button', { name: /^지점 / })).toHaveCount(40);
  await list.getByRole('button', { name: '더 보기' }).click();
  await expect(list.getByRole('button', { name: /^지점 / })).toHaveCount(45);
  await expect(list.getByRole('button', { name: '더 보기' })).toHaveCount(0);
  expect(queries.every(url => url.searchParams.get('limit') === '501' && url.searchParams.has('longitude') && url.searchParams.has('latitude'))).toBe(true);
  await page.locator('summary').filter({ hasText: '목록으로 보기' }).click();
  const map = page.getByRole('region', { name: '운동시설 지도' });
  await map.focus();
  for (let i = 0; i < 3; i++) {
    const previous = queries.length;
    await map.press('ArrowRight');
    await expect.poll(() => queries.length).toBeGreaterThan(previous);
  }
  await expect(page.getByText('현재 지도 범위에 공개 운동시설이 없어요.')).toBeVisible();
  await expect(page.locator('summary')).toHaveText('목록으로 보기 (0곳)');
  expect(queries.length).toBeGreaterThan(1);
});

test('묶음 마커를 누르면 상세 광고 대신 해당 구역을 확대한다', async ({ page }, info) => {
  await fixtures(page);
  const widths: number[] = [];
  await page.route('https://fixture.supabase.co/rest/v1/exercise_sites*', async route => {
    const url = new URL(route.request().url());
    const longitudes = url.searchParams.getAll('longitude');
    const west = Number(longitudes.find(value => value.startsWith('gte.'))?.slice(4));
    const east = Number(longitudes.find(value => value.startsWith('lte.'))?.slice(4));
    widths.push(east - west);
    await route.fulfill({ json: [
      { ...site, id: 'west', longitude: site.longitude - 0.0006 },
      { ...site, id: 'east', longitude: site.longitude + 0.0006 },
    ] });
  });
  await page.goto('/home');
  await expect(page.locator('summary')).toHaveText('목록으로 보기 (2곳)');
  const canvas = page.locator('canvas').first();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('지도 없음');
  await page.screenshot({ path: info.outputPath('cluster.png') });
  await canvas.click({ position: { x: bounds.width / 2, y: bounds.height / 2 } });
  await expect.poll(() => widths.length).toBeGreaterThan(1);
  expect(widths[widths.length - 1]).toBeLessThan(widths[0]);
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('dialog', { name: '테스트 전면 광고' })).toHaveCount(0);
});

test('토스의 상단 inset을 콘텐츠 위에 중복 적용하지 않는다', async ({ page }) => {
  await fixtures(page);
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (iPhone) TossApp/5.300.0', configurable: true,
  }));
  await page.goto('/home');
  await expect(page.getByText('목록으로 보기', { exact: false })).toBeVisible();
  await expect(page.locator('.app-shell')).toHaveCSS('padding-top', '0px');
  await expect(page.locator('.app-shell')).toHaveCSS('padding-bottom', '20px');
  expect((await page.locator('.app-header').boundingBox())?.y).toBe(0);
});

test('모바일 한 손가락 드래그로 지도를 이동하고 범위를 재조회한다', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4176',
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage(); await fixtures(page);
    const bounds: string[] = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.endsWith('/exercise_sites')) bounds.push(url.searchParams.getAll('longitude').join(','));
    });
    await page.goto('/home');
    await expect(page.locator('summary')).toBeVisible();
    await expect(page.locator('.ol-viewport')).toHaveCSS('touch-action', 'none');
    const map = await page.getByRole('region', { name: '운동시설 지도' }).boundingBox();
    if (!map) throw new Error('지도 없음');
    const initial = bounds[bounds.length - 1];
    const session = await context.newCDPSession(page);
    const y = Math.round(map.y + map.height / 2);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 80, y }] });
    for (let x = 100; x <= 280; x += 20) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => bounds[bounds.length - 1]).not.toBe(initial);
    await expect(page).toHaveURL(/\/home$/);
    await context.close();
  } finally { await context.close(); }
});
