# 001. 웹 기준점 이전 범위

2026-10-19 (한국 시간)

- 원본 소스·공개 자산·웹 설정만 선택 복사했다. 개인 환경 파일, Git 이력, 설치 산출물, 네이티브 설정은 복사하지 않는다.
- 원본의 실제 설치 버전을 직접 의존성에 고정한다. React 19를 유지하고 웹에서 사용하지 않는 네이티브 플러그인·Ionic Router·Cypress 템플릿 의존성을 제거한다. pnpm lockfile로 전체 설치를 고정한다.
- 기존 개인정보 안내와 서버 전송의 불일치를 해결하기 위해 기구 클릭의 `site_click_logs` 삽입과 프로필 조회를 제거한다. 안내에는 프로필이 선택 사항이고 기기 내 저장되며 클릭 통계로 전송되지 않음을 표시한다. 수집 정책 확정 전까지 통계를 재개하지 않는다. 이는 의도적인 정책 변경이다.
- PWA manifest는 VitePWA 설정을 단일 기준으로 삼는다. 중복된 기본 Ionic manifest와 수동 링크를 제거하고 실제 192/512 PNG·Apple touch 아이콘을 제공한다. 기존 favicon은 보존하며 새 설치 아이콘은 단순 지도 핀 도형이다. 앱 쉘만 precache하며 DB·지도 타일·사진의 완전한 오프라인 사용을 보장하지 않는다. autoUpdate는 기존 설정을 유지한다.
- Supabase 설정 누락은 명시적인 조회 실패다. 존재하지 않는 mock 모드 안내를 제거한다. 시설 목록 오류를 빈 목록과 구분한다.
- UI에서 소유하던 SiteSummary만 계약 패키지로 옮긴다. 본격적인 공통 코드 추출은 3단계다.
- 초기 화면을 검증하지 않던 템플릿 테스트를 실제 조회·프로필·이동 흐름 회귀 검사로 대체한다. 원격 DB에 쓰는 테스트는 금지한다.

공식 근거: [pnpm workspace](https://pnpm.io/workspaces), [VitePWA 자산 처리](https://vite-pwa-org.netlify.app/guide/static-assets), [manifest 요구 사항](https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements).
