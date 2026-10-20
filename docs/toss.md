# 토스 미니앱 실행과 검증

갱신: 2026-10-20 (한국 시간)

## 구현 범위

`apps/toss`는 공식 WebView SDK 3.8.1, TDS Mobile/AIT 2.5.1, React 18.3.1, Vite 6.4.4로 구성한다. Node 24 이상이 필요하다. 웹/PWA의 React 19와 화면을 공유하지 않고 contracts/data의 public exports를 재사용한다.

메인 지도(`/home`), 지점 상세(`/sites/:siteId`), 운동기구 상세(`/sites/:siteId/equipment/:installationId`), 사진, 프로필, 현재 위치 및 뒤로가기를 구현했다. 프로필 지역은 시/도 → 시/군/구의 두 단계로 선택하며 상위 지역 변경 시 하위 선택을 초기화한다. 웹과 지역 목록·기존 문자열 저장 형식을 공유하고 목록 밖의 기존 자유 입력값은 다시 선택하기 전까지 보존한다. 실제 데이터·지도·광고·네이티브 권한 검증은 아직 완료하지 않았다.

## 로컬 실행

프로젝트 루트의 PowerShell에서 실행한다. 이미 설치된 의존성을 불필요하게 다시 설치하지 않는다. 새 환경에서는 `pnpm.cmd install --frozen-lockfile`로 설치한다.

```powershell
if (-not (Test-Path apps/toss/.env.local)) {
  Copy-Item apps/toss/.env.example apps/toss/.env.local
}
pnpm.cmd dev:toss
```

접속 주소는 `http://127.0.0.1:5174/home`이다. 개발 서버는 기기 연결을 위해 `0.0.0.0`에 바인딩한다. 종료는 `Ctrl+C`다. Vite의 AIT 개발 도구는 일반 개발 모드에만 활성화되며 production 번들에 포함하지 않는다.

`apps/toss/.env.local`에 기존 Supabase 공개 URL·publishable key와 토스 실행 도메인에서 허용된 V-World 키를 사용자가 설정한다. 웹 환경 파일을 자동으로 읽거나 복사하지 않는다. 값은 채팅·문서·Git에 기록하지 않는다. `.env.example`은 플레이스홀더와 비밀이 아닌 기본 설정만 제공한다.

브라우저에서 화면은 확인할 수 있지만 SDK 개발 도구의 위치/저장 동작은 실제 토스와 구분한다. SDK 미지원·위치 거부 시 오류 안내를 제공하고 시설 탐색은 계속할 수 있다. 연결 설정이 없으면 조회 실패 안내를 표시하며 가짜 운영 데이터를 표시하지 않는다.

## 광고 설정과 흐름

| 설정 | 의미 |
| --- | --- |
| `VITE_AD_MODE=off` | 기본값. 광고 호출하지 않음 |
| `VITE_AD_MODE=test` | 공식 테스트 전면·배너 ID 사용 |
| `VITE_AD_MODE=production` | 아래 운영 그룹 ID 사용 |
| `VITE_BANNER_HOME_ID` | 메인 지도 배너 그룹 |
| `VITE_BANNER_SITE_ID` | 지점 상세 배너 그룹 |
| `VITE_BANNER_EQUIPMENT_ID` | 운동기구 상세 배너 그룹 |
| `VITE_INTERSTITIAL_ID` | 전면형 광고 그룹 |
| `VITE_INTERSTITIAL_INTERVAL_SECONDS=120` | 사용자 확정 최소 간격 2분. 120초 미만/잘못된 값은 120초로 복원 |

전면 테스트 ID는 `ait-ad-test-interstitial-id`, 배너는 `ait-ad-test-banner-id`다. 개발·기기 테스트는 테스트 ID를 사용한다. 운영 그룹의 생성·등록·실제 광고 노출·정산 준비는 별도 항목이다. 코드 연동과 테스트 대체 검사를 운영 광고 준비 완료로 간주하지 않는다.

메인 지도 마커 또는 접근성용 시설 목록을 선택하면 준비된 전면 광고를 표시하고 닫힌 후 상세로 이동한다. 첫 광고 표시 후 2분 동안에는 광고 없이 이동한다. `show` 이벤트의 시각을 토스 Storage의 `LAST_INTERSTITIAL_SHOWN_AT`에 기록해 앱 재시작 시에도 간격을 복원한다. 이 값은 기기 내 광고 빈도 제어용이며 서버 접근 제어·보상 검증 수단이 아니다.

미준비·광고 없음·로드/표시 실패는 상세 이동을 막지 않는다. 표시 요청 후 이벤트 자체가 없는 경우에만 10초 후 대기를 해제한다. `show`가 발생한 광고는 재생 길이를 타이머로 자르지 않는다. 중복 선택을 막고 종료 시 콜백과 타이머를 정리한다. 조회 또는 광고의 늦은 결과로 이미 이동한 화면을 덮어쓰지 않는다.

배너는 세 화면에서 현재 화면의 슬롯 1개만 장착한다. 폭 100%·높이 96px과 SDK 기본 광고 UI를 유지하고, 광고 없음·실패·미지원이면 영역을 접는다. 메뉴와 배너 사이에 16px 간격을 두며 본문은 별도의 스크롤 영역으로 광고와 겹치지 않게 한다. 하단·좌우 Safe Area는 SDK 값과 CSS env 중 큰 값으로 적용한다. 상단은 토스 네이티브 내비게이션 아래에서 콘텐츠가 시작하므로 앱 내부에서 top inset을 다시 적용하지 않는다. 네이티브 상단 영역·하단 영역의 실제 계산은 기기에서 검증해야 한다.

## 검사와 번들

```powershell
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test
pnpm.cmd test:toss:e2e
pnpm.cmd build:toss
```

`pnpm.cmd test:e2e`는 기존 웹 회귀 검사다. `pnpm.cmd test:toss:e2e`는 SDK·DB·사진을 테스트 대체하고 지도 타일을 차단하는 Chrome 회귀 검사다. 대체 SDK는 Vite의 `--mode test`에서만 연결하며 일반 개발/production 진입에는 연결하지 않는다. 광고와 위치의 실제 네이티브 동작·사진 이용 권한·DB 권한을 검증한 것은 아니다.

토스 빌드는 `apps/toss/dist`와 `apps/toss/walk-fit-map.ait`를 생성하며 Git에서 제외한다. 현재 기본 연결값·광고 모드로 생성한 번들을 그대로 운영 준비 완료로 취급하지 않는다. 환경변수를 바꾸면 다시 빌드해야 한다. 현재 JS는 약 1.83 MB(gzip 약 566 KB)로 크기 경고가 남아 있으며 후속 성능 점검이 필요하다.

## 실제 토스 테스트와 출시

1. 콘솔에 산책핏·appName `walk-fit-map`으로 등록했다. `apps-in-toss.config.ts`와 등록값을 유지하고 브랜드·앱 정보 및 위치 권한 선언을 확인한다.
2. 실제 `.env.local`과 V-World 허용 도메인을 설정한다. 미니앱 테스트/운영의 서로 다른 실제 출처를 확인하며 Supabase RLS·스토리지 정책과 사진 이용 조건도 검토한다.
3. 테스트 광고 모드로 빌드한 뒤 명시적 승인 범위 안에서 테스트 번들을 업로드한다. 사용자 승인으로 테스트 업로드를 완료했으며 최신 deploymentId는 `progress.md`에 기록한다. 업로드와 공개 검토 요청·출시는 별도 단계다.
4. 업로드 키가 필요하면 로컬 터미널에서 `pnpm.cmd --filter @walk-fit/toss exec ait token add walk-fit-map`으로 대화형 입력한다. SDK CLI 3.8.1은 프로필을 `~/.ait/credentials`에 저장한다. 키를 `--api-key` 명령 인자·소스·환경 예제·채팅·로그에 남기지 않는다.
5. 현재 저장된 프로필은 `default`다. 사용자 승인 후 `pnpm.cmd --filter @walk-fit/toss exec ait deploy --profile default --location ./walk-fit-map.ait -m "수정 내용"`으로 테스트 번들을 업로드한다. 프로필을 새로 등록한 경우 실제 이름으로 바꾼다. `.ait` 생성은 업로드와 별도다.
6. 생성된 테스트 앱스킴/QR을 실제 토스에서 열어 지도·사진·직접 상세 접근·뒤로가기·네이티브 닫기·위치 허용/거부·프로필 저장을 확인한다. 특히 광고는 일반 브라우저/샌드박스 앱의 성공 여부를 실제 토스 광고 검증으로 대신하지 않는다.
7. 작은 기기·큰 글꼴·키보드·스크롤·가로 회전·앱 복귀·Safe Area와 3개 화면 배너, 전면 광고 첫 노출·2분 간격·광고 실패 이동을 확인한다.
8. 운영 광고/사업자/정산 설정과 검수 요건 확인 후 별도 승인으로 공개 검토·출시를 진행한다.

토스 로그인·보상형 광고·보상 서버는 이번 범위에 포함하지 않았다. 프로필·광고 시각은 토스 저장소에 별도 보관하며 웹/모바일과 자동 동기화하지 않는다. 선택 동의 기반 연령대·시도별 기구 조회 통계와 90일 보관 설정을 준비했으며, Supabase 전송은 아직 비활성화 상태다. DB 승인과 활성화 조건은 [통계 준비 문서](view-statistics.md)를 따른다.

## 확인 근거

2026-10-20 공식 생성 도구와 npm 설치 메타데이터·실제 SDK 타입·CLI 도움말을 함께 확인했다. SDK는 Apache-2.0, OpenLayers는 BSD-2-Clause이며 기존 버전을 재사용한다. TDS는 앱인토스 제공 범위의 이용 조건을 따르며 다른 플랫폼으로 내보내지 않는다. V-World의 실제 토스 도메인 이용 조건·출처 표시 적합성은 출시 전 확인 항목이다.

- [공식 생성 도구와 React 18 TDS 구성](https://github.com/toss/create-ait-app)
- [TDS 사용 범위](https://developers-apps-in-toss.toss.im/design/components)
- [SDK 위치 API](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/device/device.getlocation)
- [배너 규격·상태·정리](https://developers-apps-in-toss.toss.im/documentation/common/monetization/iaa/web-banner)
- [전면형 API](https://developers-apps-in-toss.toss.im/documentation/common/monetization/iaa/interstitial-rewarded-ad)
- [공식 광고 예제의 테스트 ID와 실기기 테스트 안내](https://github.com/toss/apps-in-toss-examples/tree/main/in-app-ads)

## 지도 범위와 지점 목록

토스 메인은 전체 공개 지점을 먼저 받지 않는다. 현재 지도의 경위도 사각 범위를 공개 조건과 함께 DB에 전달하고 이동/확대가 멈춘 뒤 300ms 후 다시 조회한다. 초기 중심은 선택 지점·설정 기본값을 사용하며 현재 위치 조회가 성공하면 해당 위치로 이동한다. 범위가 달라진 뒤 도착한 이전 응답은 버린다.

마커와 목록은 조회 범위의 지점만 표시하며 목록은 지도 중심과의 구면 거리 기준 가까운 순으로 20개씩 표시한다. ‘더 보기’는 현재 범위에서 받아둔 지점을 20개씩 추가 표시하고 지도 범위가 바뀌면 처음 20개로 초기화한다. 목록은 지도 아래에서 높이의 최대 40%까지 열리고 0건에도 요약 행 공간을 유지한다. 재조회 중 이전 결과를 유지해 목록 높이가 반복 변화하지 않도록 한다. 현재 위치 버튼은 실제 지도 하단 16px에 두며 위치 확인 안내는 지도 위에 겹쳐 지도 높이를 바꾸지 않는다.

한 번의 응답은 501개를 상한으로 제한한다. 범위 내 지점이 500곳을 넘거나 서버 행 제한으로 결과가 잘린 경우에는 일부를 전체 목록처럼 보여주지 않고 지도 확대를 안내한다. 500곳 이하 범위는 마커 전체와 가까운 순 목록을 표시한다. 조회된 500곳 이하의 지점에는 화면상 56px 이내의 가까운 지점을 묶는 클러스터링을 적용한다. 개별 지점은 보라색 핀, 2곳 이상은 보라색 원과 개수로 표시한다. 숫자를 누르면 묶음 범위로 확대하고, 개별 핀을 누르면 기존 광고/상세 흐름을 사용한다. 내 위치는 별도 레이어로 유지한다. 동일 좌표의 지점은 확대해도 겹칠 수 있으며 목록에서 선택할 수 있다. 500곳을 넘는 광역 범위의 서버 집계는 후속 작업이다.

범위 내 빈 목록·조회 오류·과밀 안내를 구분하며 지도 자체는 유지해 다른 지역으로 이동할 수 있다. 기존 웹/PWA의 조회 방식은 변경하지 않았다. DB 스키마·인덱스·RLS 정책 변경은 수행하지 않았다. 실제 운영 데이터의 범위 조회·응답 시간과 대규모 데이터에서의 인덱스 필요성은 별도 검증 항목이다.

로컬의 현재 위치는 AIT devtools의 location 모드를 web으로 설정해 브라우저 위치 권한을 사용한다. 개발 도구의 기본 mock 모드는 서울시청 고정 좌표를 반환하므로 실제 위치 이동 확인에 사용하지 않는다. 위치 확인에는 브라우저 권한 허용과 localhost/HTTPS 환경이 필요하다. 이는 실제 토스 SDK 권한 검증을 대신하지 않는다.
