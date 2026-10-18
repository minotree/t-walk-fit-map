# Vercel 웹 배포와 PWA 확인

## 프로젝트 가져오기

GitHub의 `minotree/t-walk-fit-map`을 Vercel에서 새 프로젝트로 가져온다. 기존 서비스와 별도 프로젝트·주소로 검증하며 기존 도메인 전환은 나중에 결정한다.

| 항목 | 설정 |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | `apps/web` |
| Include source files outside of the Root Directory in the Build Step | 활성화 — `packages/contracts`와 루트 workspace 설정 필요 |
| Build Command | `pnpm build` (`apps/web/vercel.json`에 지정) |
| Output Directory | `dist` (`apps/web` 기준, 설정 파일에 지정) |
| Install Command | 기본 자동 감지 유지, 수동 override 끄기 |
| Node.js Version | `24.x` — 로컬 검증과 같은 메이저 버전 |
| Production Branch | `main` |

Root Directory는 Vercel 프로젝트 설정에서 지정한다. 저장소 루트에 또 다른 vercel.json을 만들지 않는다. pnpm은 루트 `packageManager: pnpm@10.34.7`와 `pnpm-lock.yaml`을 사용한다. 설치 로그에서 버전과 workspace 패키지 인식을 확인한다.

## 환경변수

Vercel 프로젝트의 Environment Variables에 다음을 등록한다. 실제 값은 로컬 `apps/web/.env.local`에서 사용자가 직접 입력하며 문서·Git·채팅에 복사하지 않는다.

| 이름 | 값/용도 |
| --- | --- |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` — packageManager에 지정한 pnpm 버전 사용 |
| `VITE_SUPABASE_URL` | 기존 Supabase 프로젝트 URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 기존 공개 클라이언트 키 |
| `VITE_VWORLD_API_KEY` | 배포 도메인에서 허용된 V-World 키 |
| `VITE_MAP_DEFAULT_LAT` | 선택, 기본 `37.5665` |
| `VITE_MAP_DEFAULT_LNG` | 선택, 기본 `126.9780` |
| `VITE_MAP_DEFAULT_ZOOM` | 선택, 기본 `15` |

Production에 등록하고 Preview에서도 같은 데이터를 확인하려면 Preview에도 적용한다. Preview에서도 기존 DB를 조회하게 된다. `VITE_*` 값은 빌드된 브라우저 코드에 포함되므로 service-role/secret 키를 넣지 않는다. 로컬 환경 파일은 Git에서 제외되어 Vercel로 자동 전달되지 않는다. 환경변수를 변경한 뒤에는 새 배포가 필요하다.

## V-World와 배포 후 확인

1. Vercel에서 부여한 실제 배포 주소를 확인하고 V-World 키의 허용 도메인 설정에 맞춘다. Preview 주소도 별도로 확인한다. 로컬 성공만으로 배포 도메인 사용 가능성을 판단하지 않는다.
2. 배포 로그의 pnpm·타입 검사·Vite 빌드·PWA 생성 성공을 확인한다.
3. HTTPS 주소에서 지도·시설 3개·마커·시설 사진·기구 상세·지도 복귀와 현재 위치 허용/거부를 확인한다.
4. 시설/기구 상세 URL을 직접 열고 새로고침한다. SPA 재작성은 `apps/web/vercel.json`에서 처리한다. JS·CSS·아이콘·`manifest.webmanifest`·`sw.js`가 HTML 대신 올바른 파일로 응답하는지도 확인한다.
5. 실제 기기에서 홈 화면 설치·독립 창 실행·다음 배포 후 업데이트를 확인한다. 서비스 워커와 manifest에는 재검증용 Cache-Control을 지정했다. 외부 타일·사진·DB 전체의 오프라인 사용은 보장하지 않는다.

배포 주소는 로컬과 출처가 달라 프로필·선택 지점 저장 상태가 자동 이전되지 않는다. 테스트 fixture 기반 Chrome 검사는 Vercel HTTPS·실제 기기 검증을 대신하지 않는다. 실제 RLS·스토리지 정책 검토도 별도 항목이다.

## 현재 준비 범위

설정·문서·로컬 production 빌드를 준비하며 Vercel 프로젝트 생성·환경변수 등록·배포는 사용자가 진행한다. 배포 성공이나 기기 설치 완료를 사전에 가정하지 않는다. Git에 반영되지 않은 설정은 GitHub 가져오기에 전달되지 않으므로 배포 전에 변경을 커밋·푸시해야 한다.

공식 근거(2026-10-19 확인): [Vite 배포와 SPA 재작성](https://vercel.com/docs/frameworks/frontend/vite), [모노레포 루트 외부 파일](https://vercel.com/docs/monorepos/monorepo-faq), [패키지 매니저](https://vercel.com/docs/package-managers), [Corepack 설정](https://vercel.com/docs/builds/configure-a-build), [Node.js 24 지원](https://vercel.com/changelog/node-js-24-lts-is-now-generally-available-for-builds-and-functions), [Vite 환경변수](https://vite.dev/guide/env-and-mode).
