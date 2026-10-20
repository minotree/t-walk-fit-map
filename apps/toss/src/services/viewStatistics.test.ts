import { expect, test } from 'vitest';
import { createProfileRepository, equipmentViewParameters, STATISTICS_POLICY_VERSION } from '@walk-fit/data';
import type { UserProfile } from '@walk-fit/contracts';

const profile: UserProfile = { birthYear: 1971, gender: 'M', region: '서울특별시 도봉구',
  useCurrentLocation: true, isConfigured: true, statisticsConsent: true,
  statisticsConsentVersion: STATISTICS_POLICY_VERSION };

test('동의한 프로필에서 연령대와 시도만 추출한다', () => {
  expect(equipmentViewParameters(profile, 'site', 'installation', 2026)).toEqual({
    p_site_id: 'site', p_installation_id: 'installation', p_age_band: '50s', p_sido: '서울특별시',
    p_consent_version: STATISTICS_POLICY_VERSION,
  });
});

test('동의 없음·철회·이전 동의 버전은 전송 대상이 아니다', () => {
  for (const override of [{ statisticsConsent: false }, { statisticsConsent: undefined }, { statisticsConsentVersion: 'old' }]) {
    expect(equipmentViewParameters({ ...profile, ...override }, 's', 'i', 2026)).toBeNull();
  }
});

test('연도·거주 시도가 없거나 잘못되면 전송하지 않는다', () => {
  for (const override of [{ birthYear: null }, { birthYear: 2030 }, { region: '' }, { region: '도봉구' }]) {
    expect(equipmentViewParameters({ ...profile, ...override }, 's', 'i', 2026)).toBeNull();
  }
});

test('저장소에서 동의를 복원하고 철회·이전 버전은 전송하지 않는다', async () => {
  let saved = JSON.stringify(profile);
  const repository = createProfileRepository({ get: async () => saved, set: async value => { saved = value; } });
  expect((await repository.getUserProfile()).statisticsConsent).toBe(true);
  await repository.saveUserProfile({ ...profile, statisticsConsent: false });
  expect(equipmentViewParameters(await repository.getUserProfile(), 's', 'i', 2026)).toBeNull();
  saved = JSON.stringify({ ...profile, statisticsConsentVersion: 'old' });
  expect((await repository.getUserProfile()).statisticsConsent).not.toBe(true);
});
