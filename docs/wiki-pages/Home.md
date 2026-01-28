# DBStudioX Wiki

DBStudioX는 Tauri + Next.js 기반의 현대적인 데이터베이스 관리 데스크톱 애플리케이션입니다.

## 기술 스택

- **프론트엔드**: Next.js 16, React 19, TypeScript
- **백엔드**: Rust (Tauri 2.0)
- **데이터베이스**: SQLite (rusqlite)
- **빌드 도구**: npm, Cargo

## 주요 기능

- SQLite 데이터베이스 연결 및 관리
- SQL 쿼리 실행 및 결과 시각화
- 스키마 관리 및 비교
- 데이터 마이그레이션 (CSV, JSON, SQL)
- 파티셔닝 지원
- 트랜잭션 관리

## 문서 목록

- [빌드 및 배포](빌드-및-배포)
- [CI/CD](CI-CD)
- [.gitignore 규칙](gitignore-규칙)
- [Action 참고 (sqlite3)](Action-참고-sqlite3)

## 프로젝트 구조

```
DBStudioX/
├── src/              # Next.js 프론트엔드 소스
├── src-tauri/        # Tauri 백엔드 소스 (Rust)
├── public/           # 정적 파일
├── .github/          # GitHub Actions 워크플로우
└── docs/             # 문서
```

## 문의 및 지원

- 이슈: [GitHub Issues](https://github.com/ByteLogicCore/DBStudioX/issues)
- 문서 개선: Pull Request 환영
