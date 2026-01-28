# .gitignore 규칙 및 제외된 항목

## AI 설정 및 설계 문서

| 경로 | 설명 |
|------|------|
| `.agent/` | AI 에이전트 설정 |
| `.cursor/` | Cursor IDE 설정 |
| `AGENTS.md` | 에이전트 가이드 |
| `IMPLEMENTATION_PLAN.md` | 구현 계획 |
| `dev_log.txt` | 개발 로그 |
| `docs/PHASE_*.md` | 단계별 상태 문서 |
| `docs/DEVELOPMENT.md` | 개발 문서 |

**이유**: 내부 개발 도구 설정 및 계획 문서는 공개 저장소에 포함하지 않습니다.

---

## 빌드 산출물

- `node_modules/`: npm 의존성
- `.next/`, `out/`: Next.js 빌드 결과
- `src-tauri/target/`: Rust 빌드 결과
- `*.exe`, `*.msi`, `*.dmg`, `*.AppImage`: 실행 파일

---

## 임시 파일 및 로그

- `*.log`
- `src-tauri/build_log.txt`
- `src-tauri/error_log.txt`
- `src-tauri/check_output.txt`

---

## 환경 변수

- `.env*`: 민감 정보 포함 가능

---

## IDE 설정

- `.vscode/`, `.idea/`
