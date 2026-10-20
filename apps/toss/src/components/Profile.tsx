import { useEffect, useRef, useState } from 'react';
import { Button } from '@toss/tds-mobile';
import type { UserProfile } from '@walk-fit/contracts';
import { KOREA_REGIONS, parseRegion, formatRegion, STATISTICS_POLICY_VERSION } from '@walk-fit/data';
import { profiles, statisticsEnabled } from '../services/platform';

export function Profile({ initial, onClose, onSaved }: {
  initial: UserProfile; onClose(): void; onSaved(value: UserProfile): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [birthYear, setBirthYear] = useState(initial.birthYear?.toString() ?? '');
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1940 + 1 }, (_, index) => currentYear - index);
  const [gender, setGender] = useState(initial.gender);
  const [selection, setSelection] = useState(() => parseRegion(initial.region));
  const [regionChanged, setRegionChanged] = useState(false);
  const districts = KOREA_REGIONS.find(item => item.sido === selection.sido)?.sigungu ?? [];
  const region = regionChanged ? formatRegion(selection.sido, selection.sigungu) : initial.region;
  const [useLocation, setUseLocation] = useState(initial.useCurrentLocation);
  const [statisticsConsent, setStatisticsConsent] = useState(initial.statisticsConsent === true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} onCancel={onClose} className="profile-dialog" aria-labelledby="profile-title">
    <form onSubmit={event => {
      event.preventDefault();
      if (saving) return;
      setSaving(true); setError('');
      void profiles.saveUserProfile({ birthYear: birthYear ? Number(birthYear) : null, gender, region, useCurrentLocation: useLocation,
        statisticsConsent: statisticsEnabled && statisticsConsent,
        statisticsConsentVersion: statisticsEnabled && statisticsConsent ? STATISTICS_POLICY_VERSION : undefined })
        .then(onSaved).catch(() => setError('설정을 저장하지 못했습니다. 다시 시도해 주세요.')).finally(() => setSaving(false));
    }}>
      <h2 id="profile-title">프로필 설정</h2>
      <p>프로필 원본은 이 기기에 보관해요. 아래 통계 수집에 별도로 동의하면 운동기구 정보를 선택할 때 연령대와 시·도 등 최소 항목만 서버로 전송해요.</p>
      <label>출생 연도 (선택)<select value={birthYear} onChange={e => setBirthYear(e.target.value)}>
        <option value="">연도 선택 (선택 안 함)</option>
        {years.map(year => <option key={year} value={String(year)}>{year}년</option>)}
      </select></label>
      <label>성별 (선택)<select value={gender} onChange={e => {
        const value = e.target.value; setGender(value === 'M' || value === 'F' ? value : 'NONE');
      }}><option value="NONE">선택 안 함</option><option value="M">남성</option><option value="F">여성</option></select></label>
      <label>거주 지역 (시/도)<select value={selection.sido} onChange={e => {
        setSelection({ sido: e.target.value, sigungu: '' }); setRegionChanged(true);
      }}>
        <option value="">시/도 선택 (선택 안 함)</option>
        {KOREA_REGIONS.map(item => <option key={item.sido} value={item.sido}>{item.sido}</option>)}
      </select></label>
      <label>거주 지역 (시/군/구)<select value={selection.sigungu} disabled={!selection.sido} onChange={e => {
        setSelection(value => ({ ...value, sigungu: e.target.value })); setRegionChanged(true);
      }}>
        <option value="">{selection.sido ? '시/군/구 선택 (선택 안 함)' : '시/도를 먼저 선택해 주세요'}</option>
        {districts.map(item => <option key={item} value={item}>{item}</option>)}
      </select></label>
      {!regionChanged && initial.region && initial.region !== formatRegion(selection.sido, selection.sigungu) &&
        <p className="muted">기존 저장 지역: {initial.region}. 지역을 다시 선택하면 변경돼요.</p>}
      <label className="checkbox"><input type="checkbox" checked={useLocation} onChange={e => setUseLocation(e.target.checked)} />현재 위치 사용</label>
      <p>현재 위치 사용을 선택하면 토스 위치 권한을 요청해요.</p>
      <section className="statistics-consent" aria-label="기구 조회 통계 수집 안내">
        <label className="checkbox"><input type="checkbox" checked={statisticsConsent}
          disabled={!statisticsEnabled && !statisticsConsent} onChange={e => setStatisticsConsent(e.target.checked)} />
          기구 조회 통계 수집·이용 동의 (선택)</label>
        <p>목적: 연령대·거주 지역별 기구 정보 조회 통계 분석</p>
        <p>항목: 연령대, 거주 시·도, 선택 지점·설치 기구, 조회 날짜, 동의 안내 버전</p>
        <p>보관기간: 일별 집계는 조회 날짜로부터 90일 후 삭제해요. 개인을 식별할 수 없도록 처리하고 검토한 월별 통계는 별도로 보관할 수 있어요.</p>
        <p>정확한 출생 연도·성별·시군구·GPS·사용자 ID는 전송하지 않아요.</p>
        <p>거부하거나 나중에 해제해도 시설 안내를 이용할 수 있어요. 연도·지역을 입력하지 않으면 통계를 보내지 않아요. 해제하면 이후 수집을 중단하며, 개인별로 구분하지 않는 기존 합산 건수는 개별 철회로 분리할 수 없어요.</p>
        {!statisticsEnabled && <p role="status">통계 수집은 준비 중이며 현재 서버로 전송하지 않아요.</p>}
      </section>
      {error && <p role="alert">{error}</p>}
      <div className="actions"><Button type="submit" loading={saving} disabled={saving}>저장</Button>
        <Button type="button" variant="weak" onClick={onClose} disabled={saving}>나중에</Button></div>
    </form>
  </dialog>;
}
