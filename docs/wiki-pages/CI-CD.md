# CI/CD 설명

프로젝트는 GitHub Actions로 Windows 빌드 및 배포를 자동화합니다.

## 워크플로우 파일

- **위치**: `.github/workflows/build.yml`

## 트리거 조건

- **수동 실행**: Actions 탭에서 "Build Windows Release" 워크플로우 실행
- **자동 실행**: `main` 또는 `develop` 브랜치에 push 시
  - 다음 경로 변경 시에만 실행: `src/**`, `src-tauri/**`, `package.json`, `next.config.ts`, `.github/workflows/build.yml`

## 빌드 프로세스

1. **환경 설정**
   - Node.js 20 설치
   - Rust stable 설치 (Windows 타겟)
   - Tauri CLI 설치

2. **의존성 설치**
   - `npm ci` 실행
   - Cargo 의존성 캐싱

3. **테스트**
   - `npm test` (프론트엔드 테스트)

4. **빌드**
   - Next.js Release 모드: `npm run build`
   - Rust 검증: `cargo check --release` (src-tauri)
   - Tauri Windows 빌드: `npm run tauri:build`

5. **아티팩트**
   - 빌드된 실행 파일 및 설치 패키지를 아티팩트로 업로드 (30일 보관)

## 빌드 환경

| 항목 | 값 |
|------|-----|
| OS | Windows Latest |
| 타임아웃 | 60분 |
| Node.js | 20.x |
| Rust | stable (x86_64-pc-windows-msvc) |

## 캐싱

- **Cargo**: `Cargo.lock` 해시 기반
- **Next.js**: `package-lock.json` 해시 기반

## 시크릿 (선택)

코드 서명 사용 시 저장소 Secrets에 설정:

- `TAURI_PRIVATE_KEY`: 개인 키
- `TAURI_KEY_PASSWORD`: 키 비밀번호
