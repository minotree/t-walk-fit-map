# 진행 현황

갱신: 2026-10-19 (한국 시간)

## 1단계 — 완료

- 새 폴더의 기존 파일은 `PROJECT_HANDOFF.md`뿐임을 확인했고 그대로 보존했다. 상위 폴더와 원본의 적용 AGENTS.md는 발견되지 않았다.
- Node 24.22.0, pnpm 10.34.7 환경을 확인했다. PowerShell 실행 정책 때문에 `pnpm.cmd`를 사용했다.
- 루트 workspace·스크립트·lockfile, 한국어 AGENTS.md·README·변경 결정 문서를 작성했다.
- 웹 앱과 실제 사용하는 공통 계약 패키지를 구성했다. 모바일·토스·core/data/utils는 후속 구현에 맞춰 추가하며 빈 패키지를 만들지 않았다.
- 기존 설치 버전과 Ionic React의 React 18/19 peerDependencies를 확인해 기존 React 19를 유지했다. 의존성 다운로드는 네트워크 승인 후 실행했다.

## 2단계 — 구현 및 로컬 회귀 검증 완료, 실서비스 연결 확인 남음

- 원본의 src·공개 자산·웹 설정만 `apps/web`으로 복사했다. 원본 파일·Git 설정을 수정하지 않았다. 전후 `git status --porcelain` 출력은 비어 있다. ownership 확인은 해당 명령의 `-c safe.directory`로만 처리했다.
- `.git`, `node_modules`, `dist`, 개인 환경 파일·개인 IDE 설정·인증 정보를 복사하지 않았다. 원본 `.env.local`을 읽지 않았다. 새 앱에는 값이 비어 있는 `.env.example`만 제공한다.
- 지도·시설 상세·기구·사진·프로필·위치·지도 복귀 흐름을 이전했다. 통계 전송 비활성화, PWA manifest 단일화와 아이콘 보완, 목록 오류 구분, 타입/lint 수정, 손상된 프로필의 안전한 기본값 처리를 적용했다.
- 기존 Supabase DB·스토리지의 데이터·스키마·정책에 접근하거나 변경하지 않았다. 배포·신규 DB 생성은 수행하지 않았다. Git 마무리는 아래 별도 항목에 기록한다.

## 검증 결과

| 검사 | 결과 |
| --- | --- |
| `pnpm.cmd typecheck` | 웹·contracts 통과 |
| `pnpm.cmd lint` | 오류·경고 0 |
| `pnpm.cmd test` | 프로필 저장 호환성·손상 데이터·저장소 읽기 실패 5개 통과 |
| `pnpm.cmd test:e2e` | 실제 Chrome, 390×844, 6개 통과·정상 종료 |
| `pnpm.cmd build` | 타입·production 번들·manifest·서비스 워커 생성 통과 |
| 원본 Git 상태 | 작업 전후 변경 없음 |

Chrome 검사에서는 시설 마커 선택→시설·사진→기구 상세→브라우저 뒤로가기와 중심 저장, 프로필 저장·새로고침, 현재 위치 허용·거부, 나중에 선택, 빈 목록·조회 실패를 검증했다. 화면 캡처도 확인했다. Supabase 응답과 사진은 테스트 fixture이며 지도 타일은 차단했다. 테스트의 서버 쓰기 요청이 없음을 확인했다. 운영 데이터·실제 지도 키를 사용한 검증은 아니다.

Windows 샌드박스에서 Playwright의 서버 프로세스 정리가 지연되어 동일 명령을 승인된 샌드박스 외부 실행으로 확인했다. 최종 결과는 6 passed, exit 0이다.

빌드에는 기존 Ionic CSS의 `:host-context` minifier 경고와 큰 초기 JS 번들(약 1.86 MB, gzip 약 443 KB) 경고가 남아 있다. 빌드 실패는 아니며 후속 성능·CSS 호환성 점검 대상으로 둔다. React Router 6의 차기 버전 동작 안내 경고도 있다.

## 협업 지침 반영

협업 지침 반영: `D:\dev\t-crossword-app\agents.md`를 읽고 이 프로젝트의 `AGENTS.md`에 공통 작업 방식·검증/보고 기준·Git 관리·`마무리하자` 승인 범위를 적용했다. 지도 앱의 기존 기술·DB/원본 보존 원칙을 유지하며 십자말·그림책 전용 규칙은 가져오지 않았다. 이번 요청은 지침 적용이므로 커밋·푸시를 실행하지 않았다. 문서만 변경해 빌드·테스트는 반복하지 않는다.

문서 공백 검사와 참조 문서 경로 확인은 통과했다. 지침 반영 당시에는 Git 저장소가 없어 파일의 줄 끝 공백을 직접 검사했다.

## Git 저장소 연결

사용자가 생성한 `https://github.com/minotree/t-walk-fit-map`에 대해 `git ls-remote --symref`로 원격 참조가 없는 빈 저장소임을 확인했다. 현재 폴더를 `main` 브랜치로 초기화하고 `origin`을 `https://github.com/minotree/t-walk-fit-map.git`으로 설정했다. 의존성·빌드 산출물·개인 환경 파일의 ignore 적용을 확인했다. Windows 소유권 확인에는 각 Git 명령의 `-c safe.directory=D:/DEV/t-walk-fit-map`을 사용하며 전역 Git 설정은 변경하지 않았다.

## 첫 커밋 마무리

사용자의 `마무리하자` 지시에 따라 workspace·웹 기준점·협업 지침·검증 기록을 첫 커밋으로 정리한다. 이번 마무리에서는 관련 문서와 파일 목록, 환경 파일·산출물 제외를 검토하고 원본에서 복사된 코드의 줄 끝 공백을 정리한다. 이미 통과한 타입·lint·단위 검사 5개·Chrome 검사 6개·빌드는 동작 변경이 없어 반복하지 않는다. 스테이징한 전체 변경에 `git diff --cached --check`를 적용하고 `main`을 `origin/main`에 일반 푸시해 upstream을 연결한다. 실제 커밋 해시·푸시 결과·최종 작업 트리 상태는 마무리 보고에 남긴다. 실서비스 연결·기기/PWA 설치 검증은 여전히 미검증이며 배포·운영 DB 변경은 포함하지 않는다.

## 남은 실서비스 검증

1. 공개 연결 설정 입력과 HTTP 연결 확인은 완료했다. 사용자가 루트에 만든 `.env.local`을 웹 앱이 읽는 `apps/web/.env.local`로 이동했다. 필수 값 3개와 Supabase HTTPS URL 형식을 확인했고 서버 전용 비밀키는 감지되지 않았다. 키 값은 출력하지 않았다. 읽기 전용 검사에서 Supabase 공개 시설 조회는 HTTP 200·1행, V-World 타일은 HTTP 200·PNG 응답을 확인했다. V-World 요청은 `http://localhost:5173`의 Origin/Referer를 사용한 서버 측 HTTP 검사이며 실제 브라우저의 도메인/CORS 동작을 보증하지 않는다. 환경 파일은 Git 제외 상태다.
2. 사용자가 로컬 브라우저에서 실제 지도 타일·시설 3개·마커 표시를 스크린샷으로 확인했고 상세·사진·기구·지도 복귀도 정상이라고 보고했다. 실제 RLS·스토리지 정책과 위치 권한의 실기기 동작은 아직 확인하지 않았다.
3. 실제 HTTPS 환경과 기기에서 PWA 설치·업데이트·캐시 동작을 확인한다. 외부 타일·DB·사진의 완전한 오프라인 사용은 구현 범위에 포함하지 않는다.

로컬 실서비스 연결과 사용자 주요 흐름 확인은 완료했다. HTTPS 배포·실제 기기의 PWA 설치/업데이트 확인은 남아 있다. 다음 구현 단계는 공통 데이터 계층 추출이며, 기존 서비스 배포 전환은 별도 승인 후 진행한다.

## Vercel 배포 준비

사용자가 Vercel에서 배포를 진행하도록 `apps/web/vercel.json`에 Vite·웹 빌드·dist 출력과 서비스 워커/manifest 재검증 헤더를 명시했다. 기존 SPA 재작성을 유지한다. `docs/vercel-pwa.md`에 Root Directory `apps/web`, 루트 외부 소스 포함, Node 24.x, 자동 pnpm 설치와 Corepack, Production/Preview 환경변수, V-World 도메인 허용, 직접 URL 접근과 PWA 기기 검증 절차를 정리했다. `.vercel/`은 Git에서 제외한다. 실제 Vercel 프로젝트 설정·환경변수 등록·배포는 사용자가 수행하며 아직 확인하지 않았다.

검증: `apps/web`에서 `pnpm.cmd build`로 타입 검사·production 빌드·PWA 생성을 통과했다. Vercel JSON과 SPA 재작성, 생성 자산, 문서 공백, 환경 파일·Vercel 로컬 설정의 ignore 적용, `git diff --check`를 확인했다. 기존 Ionic CSS·번들 크기 경고는 유지된다. 사용자의 `마무리하자` 지시에 따라 관련 6개 파일을 커밋하고 `origin/main`에 일반 푸시한다. 빌드 이후 실행 코드·설정 변경이 없어 검사를 반복하지 않는다. 커밋·푸시 결과와 최종 작업 트리 상태는 마무리 보고에 남기며 실제 Vercel 배포·기기 검증은 사용자가 진행한다.
