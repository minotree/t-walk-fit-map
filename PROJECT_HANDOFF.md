# t-walk-fit-map 프로젝트 인계·착수 문서

작성일: 2026-10-19 (한국 시간)

이 문서는 기존 `walk-fit-map`을 분석하고 사용자와 합의한 신규 프로젝트 방향을 기록한다. 새 프로젝트 루트에 `PROJECT_HANDOFF.md`라는 이름으로 복사해 다음 작업의 기준으로 사용한다. 코드 이전이나 신규 프로젝트 생성이 완료됐다는 의미는 아니다.

## 1. 사용자가 확정한 방향

- 기존 프로젝트: `D:\dev\walk-fit-map`
- 신규 프로젝트: `D:\dev\t-walk-fit-map`
- 기존 프로젝트는 만약의 상황에 대비한 복구용으로 보존한다. 원본 소스·설정·Git 이력을 임의로 변경하지 않는다.
- 신규 프로젝트가 향후 기존 서비스를 대체한다. 단순한 토스 전용 복사본이 아니다.
- 신규 프로젝트는 **PWA, 하이브리드 앱, 토스 미니앱** 세 플랫폼을 지원한다.
- 하이브리드 앱은 **Ionic React + Capacitor**로 Android/iOS를 대상으로 한다.
- **기존 Supabase DB와 이미지 저장소를 공유한다.** 새 DB 프로젝트를 자동 생성하거나 기존 데이터를 복제·초기화하지 않는다.
- pnpm workspace 모노레포로 구성하고 각 플랫폼을 독립적으로 빌드·배포한다.
- 공통 타입·업무 규칙·재사용 가능한 데이터 접근을 공유한다. UI·라우팅·플랫폼 연동은 각 앱이 소유한다.
- 보고와 사용자 문서는 한국어로 작성한다.

## 2. 현재까지 실제로 한 일과 하지 않은 일

기존 프로젝트를 읽기 전용으로 분석했다. 소스·설정·의존성·화면·데이터 접근·저장·위치 기능을 확인하고 타입 검사와 lint를 실행했다. 분석 전후 Git 상태 출력에 변경 사항은 없었다.

아직 하지 않은 일:

- `D:\dev\t-walk-fit-map` 생성·초기화·의존성 설치
- 기존 소스 복사·이동·수정
- 신규 workspace·공통 패키지 구성
- 기존 DB의 실제 스키마·RLS·스토리지 정책 조회 또는 변경
- 신규 PWA·하이브리드·토스 앱의 빌드·기기 검증·배포

기존 `.env.local`의 값은 읽거나 복사하지 않았다. 현재 DB 공유 방침은 사용자 결정이며, 실제 연결 값·권한·접근 상태는 새 프로젝트에서 별도로 확인해야 한다.

## 3. 기존 앱 분석 결과

### 구조와 화면

- npm 기반 단일 앱이며 `package-lock.json`을 사용한다. pnpm workspace는 없다.
- 루트에 `src/`, `public/`, `cypress/`, `vite.config.ts`, `capacitor.config.ts`, `vercel.json` 등이 있다.
- 분석 시 저장소 내 `AGENTS.md`, README, SQL 마이그레이션 파일은 발견하지 못했다. 새 작업 시작 시 지침 파일 유무를 다시 확인한다.
- 주요 화면은 지도(`/home`), 시설 상세(`/sites/:siteId`), 설치 기구 상세(`/sites/:siteId/equipment/:installationId`)다.
- `BrowserRouter`와 Ionic 화면을 사용한다.
- Capacitor 설정은 있지만 루트 목록에서 Android/iOS 네이티브 프로젝트는 확인되지 않았다. 실제 네이티브 동작 검증은 하지 않았다.
- Capacitor 앱 ID는 `io.ionic.starter`다. 실제 배포 식별자는 구현 단계에서 결정해야 한다.

### 확인한 설치 버전

2026-10-19 로컬 `node_modules`의 package.json으로 확인했다. 신규 프로젝트의 고정 요구 버전이나 최신 버전 보장이 아니다.

| 패키지 | 설치 버전 |
| --- | --- |
| React | 19.0.0 |
| Ionic React / Ionic React Router | 9.0.6 |
| Capacitor Core | 8.5.2 |
| Supabase JS | 2.117.2 |
| OpenLayers (`ol`) | 10.10.0 |
| Vite | 8.3.2 |
| vite-plugin-pwa | 2.0.0 |

TypeScript는 strict 설정이다. 새 프로젝트 의존성은 실제 설치·peerDependencies·공식 문서를 확인해 정하고, 기존 PWA의 React 버전을 토스에 맞추려고 일괄 변경하지 않는다. 확인 당시 토스 공식 생성 도구는 TDS용 React 18 구성을 안내했다.

### 데이터 접근

- `src/lib/supabaseClient.ts`: 공개 클라이언트 연결. 세션 지속·토큰 자동 갱신·URL 세션 감지는 꺼져 있다.
- `src/services/siteService.ts`: `exercise_sites`, `site_equipment`, `equipment_catalog` 조회 및 결과 변환.
- 공개 시설과 설치 기구를 `is_published`로 필터링한다. 이 클라이언트 필터만으로 DB 접근 제어가 보장되는 것은 아니다. 실제 RLS는 미확인이다.
- 시설 사진의 상대 경로는 `survey-photos` 버킷의 공개 URL로 변환한다. 버킷 실제 권한·사진 이용 권한은 미확인이다.
- `src/services/statService.ts`: 프로필 설정 완료 사용자에 대해 `site_click_logs`에 클릭 통계 삽입.
- 현재 앱 코드에서 로그인 화면은 확인하지 못했다. 토스 로그인이나 별도 인증 서버가 반드시 필요하다고 미리 가정하지 않는다.

### 지도·위치·저장

- `src/components/VworldMap.tsx`: OpenLayers로 V-World WMTS 타일·시설 마커·사용자 위치를 표시한다.
- 현재 위치는 `Home.tsx`에서 브라우저 `navigator.geolocation`으로 얻는다.
- 프로필은 `src/services/userProfileService.ts`에서 Capacitor Preferences의 `USER_PROFILE` 키로 저장한다.
- 마지막 선택 지점 좌표는 `sessionStorage`의 `LAST_SELECTED_SITE_CENTER`로 유지한다.
- 토스에서는 위치 권한·위치 조회·저장을 토스 SDK 어댑터로 별도 구현하고 기기에서 검증해야 한다.
- 지도를 즉시 다른 라이브러리로 교체하기로 결정한 것은 아니다. OpenLayers/V-World 유지 가능성을 먼저 검토하되 키의 도메인 허용 조건·이용 조건·표시 의무·실제 토스 지도 동작을 확인한다.

## 4. 이전 시 우선 해결할 사항

### 개인정보 안내와 실제 전송의 불일치

`UserProfileModal.tsx`는 정보를 로컬에 보관한다고 안내하지만 `statService.ts`는 출생 연도·성별·지역을 Supabase에 전송한다. 기구 상세로 이동하는 클릭 처리에서 이 함수를 호출한다. `isConfigured`를 수집 허용 조건으로 쓰고 있으며 별도 통계 수집 동의 상태는 확인하지 못했다.

새 서비스 공개 전 실제 수집 필요성, 사용자 안내, 선택·거부 흐름과 저장 범위를 일치시켜야 한다. 분석 결과만으로 적법성이나 위반 여부를 단정하지 않는다. 원래 앱의 전송 동작을 새 앱에 설명 없이 복제하지 않는다. 변경이 필요하면 기능 재현과 의도적인 정책 변경을 구분해 기록한다.

### PWA 설정·자산

- VitePWA의 manifest 설정과 `public/manifest.json`이 함께 존재한다.
- `index.html`은 `/manifest.json`을 참조하고, 해당 파일에는 기본 Ionic 앱 이름·아이콘 경로가 남아 있다.
- Vite 설정의 192/512 아이콘과 includeAssets의 여러 파일이 실제 공개 파일 목록에서 발견되지 않았다.
- VitePWA는 `autoUpdate`로 설정되어 있다. 실제 설치·업데이트 동작은 미검증이다.
- Supabase 응답·외부 지도 타일·사진의 오프라인 사용을 보장하는 별도 정책은 확인하지 못했다. 플러그인 설정 존재만으로 오프라인 전체 지원을 약속하지 않는다.

### 공통 코드 경계

- `siteService.ts`가 UI 컴포넌트 `VworldMap.tsx`에 정의된 `SiteSummary`를 import한다. 공통 계약으로 옮길 대상이다.
- 프로필 저장 서비스가 Capacitor Preferences를 직접 import한다. 저장소 인터페이스와 플랫폼 구현을 분리할 대상이다.
- 위치·세션 저장·환경변수·Supabase 초기화가 앱 코드에 직접 연결되어 있다. 공통 코어에 브라우저/SDK 전역을 옮기지 않는다.
- 현재 복잡한 업무 규칙은 많지 않다. 작은 조회 앱에 불필요한 추상 계층을 대량 도입하지 않는다.

### 오류·타입·검사

- 시설 목록 조회 오류도 빈 배열로 반환해 화면에서 빈 목록과 통신 실패를 구분하기 어렵다.
- Supabase 설정이 없으면 mock 모드로 전환한다는 경고가 나오지만 실제 mock 구현은 확인되지 않았다. `.env.example`의 `VITE_DATA_SOURCE=mock`도 소스에서 사용처가 발견되지 않았다.
- Supabase 결과·지도 이벤트 등에 `any`가 남아 있다. 저장 프로필 JSON도 별도 스키마 검증 없이 합친다.
- 지도 좌표·통계 정보 등 개발 로그가 있다. 신규 앱에서는 불필요한 사용자 정보 로그를 정리한다.
- 단위 테스트는 기본 렌더링 검사이고 Cypress에는 Ionic 기본 화면 문구를 찾는 템플릿 검사가 남아 있다. 현재 서비스의 주요 흐름을 검증하는 기준으로 보강해야 한다.

## 5. 실제 실행한 검사

기존 프로젝트 루트에서 로컬 설치 도구로 실행했다.

| 명령 | 결과 |
| --- | --- |
| `node node_modules/typescript/bin/tsc --noEmit` | 통과(exit 0) |
| `node node_modules/eslint/bin/eslint.js src --max-warnings 0` | 실패: 오류 9개·경고 3개 |
| `git status --short` | 분석 전후 변경 출력 없음 |

Lint는 빈 인터페이스, 명시적 any, 미사용 변수와 React Hook 의존성 경고를 보고했다. 빌드·단위 테스트·Cypress·실제 브라우저/기기 검사는 실행하지 않았다. DB·스토리지·배포 계정에 접속하지 않았다. 의존성 재설치도 하지 않았다.

## 6. 신규 프로젝트 권장 구조

```text
D:\dev\t-walk-fit-map\
  AGENTS.md
  PROJECT_HANDOFF.md
  README.md
  progress.md
  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml
  apps/
    web/                  # PWA, 브라우저 라우팅·위치·저장·서비스 워커
    mobile/               # Ionic 화면·탐색, Capacitor 위치·저장·네이티브 프로젝트
    toss/                 # TDS 화면·탐색, 토스 SDK 권한·저장·연동
  packages/
    contracts/            # 시설·설치 기구·프로필 DTO, 저장소·위치 등의 인터페이스
    core/                 # 프레임워크 독립 검증·실제 필요한 업무 규칙
    data/                 # 재사용 가능한 Supabase 조회·변환·저장소 구현
    utils/                # 필요할 때 추가하는 순수 공통 함수
  docs/
    architecture/
    decisions/
  supabase/
    migrations/           # 승인된 향후 스키마 변경이 생기는 경우
```

처음부터 모든 디렉터리에 빈 추상화·자리 채우기 코드를 만들 필요는 없다. 세 플랫폼의 소유 경계를 먼저 정하고 실제 기능이 생길 때 패키지를 채운다.

### 필수 경계

- `apps/*`끼리 소스·화면·라우팅을 import하지 않는다.
- `packages/contracts`, `packages/core`, `packages/utils`는 React/Ionic/Capacitor/TDS/브라우저 전역에 의존하지 않는다.
- Supabase 클라이언트와 플랫폼 세션 초기화는 각 앱이 맡고, 재사용 조회/매핑은 `packages/data`에 둔다.
- 각 앱의 조립 지점에서 데이터 저장소·위치·로컬 저장 구현을 연결한다.
- 내부 패키지는 public exports와 `workspace:*`를 사용한다. 다른 패키지의 src 상대 경로를 직접 가져오지 않는다.
- `packages/ui`와 공유 라우팅은 만들지 않는다. 동일한 기능명·흐름은 유지하되 화면은 플랫폼별로 구현한다.
- 지도 컴포넌트 전체를 초기부터 공유 UI 패키지로 옮기지 않는다. 좌표 타입·데이터 변환·순수 계산부터 공유한다.
- 이 십자말 프로젝트의 힌트 지갑·광고 보상·그림책·게임 인증 서버를 신규 프로젝트에 복사하지 않는다. 필요한 것은 workspace와 플랫폼 경계의 원칙이다.

## 7. 첫 구현 순서와 완료 기준

### 1단계: 신규 폴더·지침·workspace

1. 사용자가 새 폴더를 IDE에서 열고 이 문서를 제공한다.
2. 대상 경로와 기존 파일 유무, 적용할 AGENTS.md, Node/pnpm 환경을 먼저 확인한다. 파일이 있으면 덮어쓰지 않는다.
3. 신규 프로젝트용 AGENTS.md·README·progress.md에 이 결정과 실제 상태를 반영한다.
4. pnpm workspace와 웹 앱·공통 패키지의 기본 설정을 만든다. 의존성은 기존 설치/lock과 호환성을 검토해 선택한다.

### 2단계: 기존 PWA 기준점 재현

1. 원본에서 필요한 소스·공개 자산·설정만 `apps/web`에 복사한다. 원본은 이동하거나 수정하지 않는다.
2. 원본 `.git`, `node_modules`, `dist`, 개인 `.env*`, 캐시·토큰·인증서·IDE 개인 설정은 복사하지 않는다. 공개 예제 설정은 플레이스홀더로 관리한다.
3. 기존 Supabase 연결은 사용자가 새 앱의 로컬 설정과 배포 환경에 안전하게 구성한다. 실제 값을 채팅·문서·Git에 넣지 않는다.
4. 새 구조에서 지도·시설 목록·상세·기구·사진·프로필·위치·돌아오기 흐름을 확인한다.
5. 개인정보 안내 불일치와 PWA 설정 문제는 의도적인 수정으로 별도 기록한다. 기존 앱의 모든 동작을 무조건 옳은 기준으로 취급하지 않는다.

완료 기준: 원본 프로젝트 변경 없음, 기존 DB 변경 없음, 신규 웹 타입/lint/빌드와 필요한 회귀 검사 통과, 실제 브라우저에서 주요 흐름 확인. 확인되지 않은 항목은 미검증으로 남긴다.

### 3단계: 공통 코드 추출

시설·설치 기구·프로필 타입, 입력/응답 검증, Supabase 조회·변환부터 분리한다. 저장소·위치 인터페이스를 정의하고 기존 웹 동작이 유지되는지 검증한다. 함수 이름만 감싸는 과도한 계층은 만들지 않는다.

### 4단계: 모바일·토스 구현

- 모바일은 자체 Ionic 화면/탐색과 Capacitor 어댑터로 구현한다. Android/iOS 빌드·권한·뒤로가기·Safe Area·실제 기기 검증을 별도로 수행한다.
- 토스는 현재 SDK/TDS 요구사항을 확인하고 자체 화면·탐색·위치 권한·저장 어댑터로 구현한다. 지도 타일의 실행 도메인 허용과 기기 터치/화면/네트워크를 검증한다.
- 플랫폼별 저장 기록이 자동으로 서로 동기화된다고 가정하지 않는다. 계정 기반 동기화는 아직 확정 요구사항이 아니다.
- 토스 콘솔 등록·별도 인증 연동 필요성·앱 식별자·배포 환경은 구현 단계에서 확인한다.

### 5단계: 검증 후 서비스 전환

신규 PWA를 먼저 별도 테스트 환경에서 검증한다. 사용자 승인 후 기존 서비스의 배포 대상을 신규 프로젝트로 전환한다. 기존 도메인·localStorage 키·PWA 캐시/업데이트의 호환성을 점검한다. 원본은 복구용으로 남긴다.

## 8. 기존 DB 공유와 복구 시 주의

- 첫 구현은 DB 변경 없이 진행한다. 기존 DB 테이블·데이터·버킷을 임의로 재생성하지 않는다.
- 기존 앱도 공유 DB를 사용하므로 신규 앱의 스키마 변경이 원본 앱에도 영향을 줄 수 있다. 원본 소스 보관만으로 DB 변경을 되돌릴 수는 없다.
- 향후 DB 변경은 마이그레이션으로 기록하고 기존 앱 호환성과 복구 절차를 검토한 뒤 사용자 승인을 받는다.
- 조회 필터·공개 클라이언트 키만으로 접근 권한을 보장하지 않는다. 실제 RLS와 스토리지 정책을 확인한다.
- 공개 번들에는 service-role 키·콘솔 배포 키·인증서·개인 키를 넣지 않는다.
- 원격 DB 변경·데이터 삭제·배포·커밋·푸시는 명시적 승인 후 실행한다. 단, 새 프로젝트의 자체 AGENTS.md에 승인된 마무리 명령 규칙을 채택했다면 그 명시적 범위를 따른다. 이 문서만으로 작업 승인을 새로 부여하지 않는다.

## 9. 참고 근거와 새 대화 시작 문장

확인 당시 공식 자료:

- [토스 공식 생성 도구](https://github.com/toss/create-ait-app): TDS용 React 18 구성 안내. 새 설치 시 현재 버전 요구사항 재확인.
- [토스 위치 API](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/device/device.getlocation): 위치 조회와 권한 처리. 실제 설치 SDK에서 지원하는 API를 확인해 적용.

새 프로젝트에서 다음처럼 요청하면 된다.

> PROJECT_HANDOFF.md를 먼저 읽고 진행해 줘. 기존 D:\dev\walk-fit-map은 복구용으로 보존하고, 이 신규 프로젝트에서 PWA·Ionic/Capacitor 하이브리드·토스 미니앱을 pnpm workspace로 구성할 거야. 기존 Supabase DB·이미지 저장소는 공유해. 먼저 DB 변경 없이 기존 PWA를 apps/web에서 재현하는 1~2단계부터 진행해 줘. 실제 환경 파일이나 키는 출력하지 말고, 원본 프로젝트는 수정하지 마.
