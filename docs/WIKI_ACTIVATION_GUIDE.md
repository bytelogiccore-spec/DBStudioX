# DBStudioX Wiki 활성화 가이드

GitHub 저장소에서 Wiki를 켜고, 초기 문서를 넣는 단계입니다.

---

## 1단계: 저장소에서 Wiki 켜기

1. **GitHub에서 DBStudioX 저장소** 열기  
   `https://github.com/[본인계정]/DBStudioX`

2. 상단 탭에서 **Settings** 클릭  
   (저장소 메인 페이지 오른쪽 상단)

3. 왼쪽 사이드바 **Features** 섹션으로 이동  
   (General 아래)

4. **Wiki** 항목 찾기  
   - "Wikis" 체크박스가 있음  
   - **Allow editing by members only** 또는 **Allow editing by everyone** 중 선택  
   - **Allow editing by members only** 권장 (쓰기 권한을 멤버로 제한)

5. **Save** 버튼으로 저장  
   (Features 섹션 하단에 있을 수 있음)

6. 저장소 메인으로 돌아가서 상단 탭에 **Wiki**가 보이는지 확인  
   (Code, Issues, Pull requests 옆)

---

## 2단계: Wiki 첫 페이지(Home) 만들기

1. 상단 탭에서 **Wiki** 클릭  
   (처음이면 "Create the first page" 안내가 나옴)

2. **Create the first page** 또는 **New Page** 클릭  
   (이때 제목을 `Home`으로 두면 Wiki 메인 페이지가 됨)

3. 제목 입력  
   - **Title**: `Home` (그대로 입력)

4. 본문에 **프로젝트 개요** 붙여넣기  
   - 아래 `docs/wiki-pages/Home.md` 파일 내용을 **전부 복사**  
   - Wiki 편집기 본문에 **붙여넣기**

5. **Save Page** 클릭  
   - Wiki 메인(Home) 페이지가 생성됩니다.

---

## 3단계: 나머지 Wiki 페이지 추가

아래 표 순서대로 페이지를 만들고, 각각 해당 파일 내용을 붙여넣으면 됩니다.

| 순서 | Wiki 페이지 제목 | 복사할 파일 |
|------|------------------|-------------|
| 1 | Home | `docs/wiki-pages/Home.md` |
| 2 | 빌드-및-배포 | `docs/wiki-pages/빌드-및-배포.md` |
| 3 | CI-CD | `docs/wiki-pages/CI-CD.md` |
| 4 | gitignore-규칙 | `docs/wiki-pages/gitignore-규칙.md` |
| 5 | Action-참고-sqlite3 | `docs/wiki-pages/Action-참고-sqlite3.md` |

**방법**

1. Wiki 화면에서 **New Page** 클릭  
2. **Title**에 위 표의 "Wiki 페이지 제목" 그대로 입력  
3. **본문**에 해당 md 파일 내용 전체 복사 후 붙여넣기  
4. **Save Page** 클릭  
5. 2~4를 나머지 페이지에 반복  

---

## 4단계: 사이드바(선택)

Wiki 오른쪽 **Sidebar**를 수정하면 목차처럼 쓸 수 있습니다.

1. Wiki 페이지 목록 아래 **Edit** (또는 Sidebar 편집) 클릭  
2. 예시:

   ```markdown
   **[Home](Home)**
   - [빌드 및 배포](빌드-및-배포)
   - [CI/CD](CI-CD)
   - [.gitignore 규칙](gitignore-규칙)
   - [Action 참고 sqlite3](Action-참고-sqlite3)
   ```

3. 저장 후 Wiki에서 링크가 잘 열리는지 확인  

---

## 요약 체크리스트

- [ ] 1. Settings → Features에서 Wiki 활성화 후 Save  
- [ ] 2. Wiki 탭에서 Home 페이지 생성 및 `Home.md` 내용 붙여넣기  
- [ ] 3. 나머지 4개 페이지 생성 후 각 md 파일 내용 붙여넣기  
- [ ] 4. (선택) Sidebar에 위 목차 추가  

여기까지 완료하면 Wiki 활성화 단계는 끝입니다.
