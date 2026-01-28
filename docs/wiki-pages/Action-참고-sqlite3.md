# Action 설정 시 참고한 sqlite3 폴더 구조

GitHub Actions 워크플로우 작성 시 `C:\Plan\CommonLibs\sqlite3` 폴더 구조를 **참고용으로만** 활용했습니다. sqlite3 폴더는 프로젝트에 포함하지 않습니다.

## 참고한 점

1. **워크플로우 구조**
   - 수동 실행(`workflow_dispatch`) 우선
   - 단계별 빌드 (환경 → 의존성 → 테스트 → 빌드 → 아티팩트)
   - 캐싱 전략 사용

2. **빌드 흐름**
   - 환경 설정 → 의존성 설치 → 테스트 → 빌드 → 아티팩트 업로드
   - 각 단계별 검증

3. **캐싱**
   - 의존성 파일 해시 기반
   - 플랫폼별 캐시 분리

## DBStudioX에 맞게 적용한 내용

| 항목 | sqlite3 참고 | DBStudioX 적용 |
|------|--------------|-----------------|
| 빌드 타겟 | 다중 플랫폼 | Windows 전용 (Tauri) |
| 프론트엔드 | 없음 | Next.js Release 모드 |
| 빌드 도구 | Cargo, CMake 등 | Tauri CLI |
| 아티팩트 | DLL/SO/dylib 등 | Windows 실행 파일, MSI |
