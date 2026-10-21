# 공개 지점 대표 사진 조회

2026-10-21 적용 확인. 사용자가 SQL Editor에서 사진 마이그레이션 전체 실행 성공(`Success. No rows returned`)을 보고했다. 이후 에이전트가 공개 키로 운영 API의 비로그인 조회·서명·다운로드를 검증했다. SQL 적용은 사용자가 수행했으며 에이전트는 DB 행·버킷 설정을 변경하지 않았다.

검증 결과: 공개 지점 5개의 대표 사진 RPC 조회·60초 서명 URL 발급·HEAD 다운로드 모두 성공. 없는 UUID는 null, 조사 테이블 익명 직접 조회는 차단됨을 확인했다. 키·경로·서명 토큰은 출력하지 않았다. 실제 앱의 서명 유효기간은 기존 구현대로 1시간이다. 미공개 지점 RPC·비대표 객체 서명 거부 및 실제 기기 화면은 아직 별도 검증이 필요하다. 두 버킷은 앞선 점검에서 공개 상태였고 이번 SQL은 공개 설정을 바꾸지 않으므로 미공개 사진의 기존 public URL 접근 문제는 남아 있다.

## 사용자 제공 운영 점검 결과

- 관련 테이블 5개 모두 RLS 활성화, FORCE RLS 비활성화.
- anon은 지점·설치 기구·도감 SELECT 권한이 있고 조사 테이블 SELECT 권한·정책은 확인되지 않았다. 지점 공개 정책은 `is_published`; 설치 기구 정책의 전체 조건은 화면에서 잘려 추가 확인 필요.
- `survey-photos`는 authenticated SELECT/INSERT와 관리자 DELETE 정책이 있으며 anon SELECT 정책은 없었다. `survey-photos`와 `equipment-images` 모두 public=true다. 대표 사진 전용 정책을 추가해도 기존 공개 URL 다운로드는 차단되지 않는다.
- 공개 지점의 유효 대표 경로는 full URL 0개·상대 경로 5개다. 현재 데이터에는 full URL 정규화가 적용 선행 조건이 아니며, 객체 존재·실제 서명 성공은 아직 검증하지 않았다.
- authenticated 전체 접근 정책이 여러 업무 테이블에 존재하고 `site_click_logs`에는 anon TRUNCATE 권한이 확인됐다. 이번 사진 마이그레이션은 이를 수정하지 않으며 별도 권한 정비가 필요하다.
- 다음 단계는 사용자 승인 범위의 사진 마이그레이션 전체 트랜잭션 적용 후 anon RPC·서명 URL 확인이다. 버킷 private 전환은 관리자·조사 앱 호환성 확인 후 수행한다. 사진 표시 복구와 공개 범위 제한 완료를 구분한다.

두 앱은 동일한 `createSiteRepository`를 사용한다. 상세 조회 후 읽기 전용 GET RPC `get_published_site_photo(p_site_id)`에서 공개 지점의 현재 대표 사진만 받는다. `survey_location_id`로 연결된 `stamped_photo_path`를 우선하고, 빈 경우에만 호환용 `site_image_path`를 사용한다. 가장 최근 조사 행을 임의로 선택하지 않는다. 미공개/없는 지점은 RPC에서 null이며 메모·GPS·조사자·조사 ID를 반환하지 않는다. RPC/서명 실패는 상세 오류로 전달하고 오래된 경로나 공개 URL로 우회하지 않는다.

상대 경로는 1시간 서명 URL로 변환한다. 같은 Supabase의 기존 public URL도 객체 경로로 변환 후 서명한다. 외부 HTTP(S) URL은 기존 호환을 위해 유지하며 외부 서버 공개 범위를 이 정책으로 제한할 수 없다. SQL Storage 정책은 **정규 상대 객체 경로**만 허용한다. 기존 full URL·퍼센트 인코딩 경로는 점검 후 별도 승인된 데이터 정규화 또는 엄격한 서버 정규화 구현이 필요하다. 현재 SQL은 이 데이터를 임의 변경하지 않으며 해당 사진의 서명이 거절될 수 있다.

## 적용 전 검토와 순서

1. SQL Editor에서 `supabase/audit-site-photo-access.sql`을 읽기 전용으로 실행하고 결과를 검토한다. 모든 관련 테이블의 RLS 활성화, anon·authenticated·PUBLIC 정책/권한, 뷰·RPC를 통한 우회 경로, 관리자·조사자 권한을 확인한다. SQL 실행 연결 도구와 자격 증명을 사용하지 않았으므로 이번 작업에서는 실제 권한을 확정하지 않았다.
2. `exercise_sites`는 공개 행만, `site_equipment`는 자신과 부모 지점이 공개된 행만 익명 조회되는지 확인한다. 기존 정책명이 확인되지 않아 기존 정책을 임의로 교체하지 않았다. 조사 테이블 전체 익명 공개 정책을 추가하지 않는다.
3. `survey-photos`가 public이면 RLS만 추가해도 원본 사진의 공개 다운로드를 차단할 수 없다. 비공개 전환 시 관리자·조사 PWA·복구 원본·기존 배포본의 getPublicUrl 사용과 이미지 서버 접근이 중단될 수 있다. 세 앱의 서명/인증 조회 대응을 검증한 뒤 **별도 승인**으로 전환한다. 이번 변경에는 버킷 전환 SQL을 자동 포함하지 않았다. private 전환 전에는 ‘공개 대표 사진만 접근 가능’ 보장이 완료되지 않는다.
4. 관리자 적용 SQL과의 스키마 호환성, UUID 지점 ID, 함수명 충돌, trusted postgres 소유자와 고정 search_path, RLS 활성화를 확인하고 백업 후 `202610210001_published_site_photos.sql` 적용을 승인받는다. SECURITY DEFINER는 조사 RLS를 우회하지만 고정 SELECT와 공개 지점 조건으로 결과를 제한한다. anon 조사 SELECT restrictive 차단과 Storage restrictive 상한을 추가하며 관리자 쓰기 정책은 변경하지 않는다. authenticated의 기존 광범위 정책은 별도로 검토해야 한다.
5. DB 함수를 먼저 적용하고 새 사용자 앱을 배포한다. 함수 미적용 상태에서 새 앱의 상세는 오류가 나므로 현재 변경을 바로 배포하지 않는다. 이전 앱은 기존 지점 경로만 읽어 이미 중복 값이 비워진 사진을 표시하지 못할 수 있다. 기존 통계 마이그레이션은 별도 미승인 작업이므로 함께 실행하지 않는다.

## 실제 환경 검증과 복구

- anon 역할/JWT로 공개 지점 RPC는 대표 경로, 미공개/없는 UUID는 null인지 확인한다. 조사 직접 조회는 0행 또는 권한 거부여야 하며 비공개 조사 사진·과거 사진·일반 원본 파일의 서명/다운로드는 거부되어야 한다. public URL 직접 요청도 검사한다.
- 사진 없는 조사→기존 지점 사진, 사진 없는 지점, 조사 경로 교체 후 새 상세 요청에서 최신 사진, 서명 오류, 설치 기구 조인을 확인한다. 기존 발급 서명은 만료까지 유효할 수 있으며 즉시 철회로 간주하지 않는다. 열려 있는 화면 자동 갱신·1시간 후 URL 갱신은 현재 지원하지 않고 상세 재진입으로 재조회한다.
- 관리자 사진 편집/교체/삭제·조사 업로드/조회·신규 조사→승인→공개→PWA/토스 표시와 실제 기기·배포 환경을 각각 확인한다. fixture 통과는 운영 권한 검증을 대체하지 않는다.
- 복구는 먼저 사용자 앱 버전을 되돌리고, 이번 SQL의 세 정책(`walkfit_anon_photo_cap`, `walkfit_public_site_photo`, `walkfit_no_anon_surveys`)과 두 함수만 의존성 순서(정책→함수)로 제거한다. 제거 시 이전 광범위 공개 정책이 다시 유효해질 수 있으므로 저장한 기존 정책과 보안 영향을 재검토한다. 버킷·데이터·관리자 RPC는 이 마이그레이션에서 변경하지 않는다.

근거: [Supabase 함수 보안](https://supabase.com/docs/guides/database/functions), [Storage 접근 제어](https://supabase.com/docs/guides/storage/security/access-control), [공개/비공개 파일 제공](https://supabase.com/docs/guides/storage/serving/downloads). 공개 버킷은 공개 다운로드를 허용하므로 DB 경로 제한과 파일 접근 제한을 구분한다.
