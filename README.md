# Walk Fit Map

산책로 운동시설 안내 서비스를 PWA·Ionic/Capacitor 앱·토스 미니앱으로 확장하는 pnpm workspace다. 현재 기존 PWA의 `apps/web` 이전과 로컬 검증, 실제 데이터 연결·주요 흐름 확인을 마쳤으며 Vercel 배포는 사용자 보고로 확인했다. 공통 데이터 계층을 추출했으며 배포 환경·실기기 검증은 남아 있다. 원본과 기존 Supabase DB·사진 저장소는 보존한다.

## 시작

Node.js 22.12 이상과 pnpm 10.34.7을 사용한다. Windows PowerShell 실행 정책이 `pnpm.ps1`을 막으면 `pnpm.cmd`를 사용한다.

```powershell
pnpm.cmd install --frozen-lockfile
Copy-Item apps/web/.env.example apps/web/.env.local
pnpm.cmd dev
```

`apps/web/.env.local`에 기존 프로젝트의 공개 Supabase URL·publishable key와 V-World 키를 직접 설정한다. 실제 값은 Git·문서·채팅에 넣지 않는다. 서비스 역할 키는 사용하지 않는다. V-World 키의 로컬 실행 도메인 허용도 확인해야 한다. 연결 설정이 없으면 시설 조회 실패를 표시한다. 임의의 mock 모드로 바꾸지 않는다.

```powershell
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test
pnpm.cmd test:e2e
pnpm.cmd build
pnpm.cmd preview
```

`apps/web`은 지도(`/home`), 시설(`/sites/:siteId`), 기구 상세(`/sites/:siteId/equipment/:installationId`), 사진, 선택 프로필, 현재 위치와 지도 복귀를 소유한다. `packages/contracts`는 시설·기구·프로필 DTO와 저장소·위치 인터페이스를 제공한다. `packages/data`는 주입받은 Supabase 클라이언트의 읽기 전용 조회·응답 검증·매핑 및 프로필 저장소 로직을 제공한다. Supabase 생성·인증 설정, Capacitor Preferences, 브라우저 위치 권한은 웹 앱이 소유한다. `apps/toss`는 독립된 TDS/React 18 화면과 토스 SDK 위치·저장·광고를 구현했고 실제 토스 기기 검증은 남아 있다. `apps/mobile`은 후속 단계다. 공통 계층 경계는 [결정 문서](docs/decisions/002-shared-data.md)를 참고한다.

브라우저 회귀 검사는 설치된 Google Chrome을 사용하며 390×844 화면에서 실행한다. 전용 테스트 서버와 가짜 연결 값을 사용하고 Supabase·지도 요청을 가로채므로 운영 DB에 접근하지 않는다. 실제 지도 타일과 운영 사진·DB 권한 확인은 로컬 연결 설정 후 별도로 수행한다.

프로필의 `USER_PROFILE` 및 선택 지점의 `LAST_SELECTED_SITE_CENTER` 키를 유지한다. 다른 출처(도메인/포트)로 실행하면 브라우저 저장소는 자동 이전되지 않는다. 개인정보를 포함한 클릭 통계 전송은 비활성화했다. [의도적인 변경](docs/decisions/001-web-baseline.md)과 [검증 현황](progress.md)을 참고한다.

빌드 산출물은 `apps/web/dist`다. Vercel에서는 Root Directory를 `apps/web`으로 지정한다. 빌드·출력·SPA 재작성·PWA 캐시 헤더는 `apps/web/vercel.json`에서 관리한다. [Vercel 설정과 환경변수·기기 확인 절차](docs/vercel-pwa.md)를 따라 진행한다.

## 토스 미니앱

Node 24 이상이 필요하다. `apps/toss/.env.example`을 참고해 사용자가 `apps/toss/.env.local`에 실제 연결값을 설정한다. 웹의 환경 파일은 자동 공유하지 않는다.

```powershell
pnpm.cmd dev:toss
pnpm.cmd test:toss:e2e
pnpm.cmd build:toss
```

개발 주소는 `http://127.0.0.1:5174/home`이다. 메인 지도·지점·운동기구 화면에 배너, 지도 선택 시 최소 2분 간격 전면 광고를 구현했다. 광고 모드는 기본 off이며 테스트할 때 test로 명시한다. 일반 브라우저·SDK 대체 검사와 실제 토스 광고/권한 검증은 구분한다. 산책핏(`walk-fit-map`) 테스트 업로드를 완료했으며 최신 버전 ID는 `progress.md`에 기록한다. 공개 검토·정식 출시는 미진행이다.

통계 수집은 기본 비활성화이며 선택 동의·일별 집계 90일 보관을 준비했다. 운영 DB 변경안은 미적용이고 월별 장기 집계는 후속 구현이다. 활성화 조건은 [통계 준비 문서](docs/view-statistics.md)를 따른다.

대표 사진 조회는 공개 지점 전용 RPC와 Storage 서명 URL로 변경했다. 사용자가 사진 SQL 적용을 완료했으며 비로그인 운영 API에서 5개 지점의 사진 조회·서명·다운로드를 확인했다. 토스의 최신 사진 표시도 사용자 확인을 마쳤다. 버킷은 공개 상태이며 비공개 전환과 관리자·조사 앱 호환성 확인은 남아 있다. [사진 조회·권한 적용 절차](docs/site-photos.md)를 참고한다.

[토스 실행·환경 설정·광고·기기 검증](docs/toss.md)과 [구조 결정](docs/decisions/003-toss-webview.md)을 참고한다.
