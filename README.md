# Walk Fit Map

산책로 운동시설 안내 서비스를 PWA·Ionic/Capacitor 앱·토스 미니앱으로 확장하는 pnpm workspace다. 현재 기존 PWA의 `apps/web` 이전과 로컬 검증을 마쳤으며 실서비스 연결·기기 검증은 남아 있다. 원본과 기존 Supabase DB·사진 저장소는 보존한다.

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

`apps/web`은 지도(`/home`), 시설(`/sites/:siteId`), 기구 상세(`/sites/:siteId/equipment/:installationId`), 사진, 선택 프로필, 현재 위치와 지도 복귀를 소유한다. `packages/contracts`는 지도 시설 요약 타입을 제공한다. 공통 데이터 계층 추출, `apps/mobile`, `apps/toss`는 후속 단계다.

브라우저 회귀 검사는 설치된 Google Chrome을 사용하며 390×844 화면에서 실행한다. 전용 테스트 서버와 가짜 연결 값을 사용하고 Supabase·지도 요청을 가로채므로 운영 DB에 접근하지 않는다. 실제 지도 타일과 운영 사진·DB 권한 확인은 로컬 연결 설정 후 별도로 수행한다.

프로필의 `USER_PROFILE` 및 선택 지점의 `LAST_SELECTED_SITE_CENTER` 키를 유지한다. 다른 출처(도메인/포트)로 실행하면 브라우저 저장소는 자동 이전되지 않는다. 개인정보를 포함한 클릭 통계 전송은 비활성화했다. [의도적인 변경](docs/decisions/001-web-baseline.md)과 [검증 현황](progress.md)을 참고한다.

빌드 산출물은 `apps/web/dist`다. 실제 배포 시 SPA 경로를 `index.html`로 재작성해야 한다. Vercel 예시 설정은 `apps/web/vercel.json`에 있다. 현재 배포·DB 변경은 수행하지 않는다.
