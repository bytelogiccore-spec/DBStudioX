# GitHub 저장소 설정 가이드

## 1단계: GitHub 저장소 생성

1. **GitHub에 로그인** 후 https://github.com/new 접속

2. **저장소 정보 입력**
   - **Repository name**: `DBStudioX`
   - **Description**: `A modern database management tool powered by Tauri + Next.js`
   - **Visibility**: **Public** 선택
   - **Initialize this repository with**: 체크 해제 (이미 로컬에 파일이 있음)

3. **Create repository** 클릭

4. 저장소가 생성되면 **빈 저장소 안내 페이지**가 표시됩니다.
   - 이 페이지의 명령어는 사용하지 않습니다.
   - 아래 2단계로 진행하세요.

---

## 2단계: 로컬 저장소를 GitHub에 연결

### 현재 브랜치 확인

```bash
cd d:\ByteLogicCore\dbstudiox
git branch
```

`master` 브랜치가 기본일 수 있습니다. GitHub의 기본 브랜치가 `main`이면 브랜치 이름을 변경하는 것이 좋습니다:

```bash
# 브랜치 이름을 main으로 변경
git branch -M main
```

### 원격 저장소 추가

**GitHub 저장소 URL**을 확인하세요. 예:
- `https://github.com/ByteLogicCore/DBStudioX.git`
- 또는 `git@github.com:ByteLogicCore/DBStudioX.git` (SSH)

```bash
# HTTPS 사용 시
git remote add origin https://github.com/bytelogiccore-spec/DBStudioX.git

# SSH 사용 시 (SSH 키 설정되어 있는 경우)
# git remote add origin git@github.com:bytelogiccore-spec/DBStudioX.git

# 원격 저장소 확인
git remote -v
```

### 코드 푸시

```bash
# 첫 푸시 (main 브랜치)
git push -u origin main

# 또는 master 브랜치인 경우
# git push -u origin master
```

---

## 3단계: GitHub 저장소 확인

1. 브라우저에서 저장소 페이지 열기
   - `https://github.com/bytelogiccore-spec/DBStudioX`

2. 확인 사항:
   - ✅ 파일들이 모두 업로드되었는지 확인
   - ✅ README.md가 제대로 표시되는지 확인
   - ✅ `.github/workflows/build.yml` 파일이 있는지 확인

---

## 4단계: Wiki 활성화

`docs/WIKI_ACTIVATION_GUIDE.md` 파일의 단계를 따라 Wiki를 활성화하세요.

**요약**:
1. 저장소 → **Settings** → **Features** → **Wikis** 체크 → Save
2. **Wiki** 탭에서 페이지 생성
3. `docs/wiki-pages/` 폴더의 파일들을 Wiki 페이지로 복사

---

## 5단계: GitHub Actions 확인

1. 저장소 상단 탭에서 **Actions** 클릭

2. 첫 워크플로우 실행:
   - "Build Windows Release" 워크플로우가 보이면
   - **Run workflow** 버튼 클릭
   - **Run workflow** 다시 클릭하여 실행

3. 빌드 진행 상황 확인:
   - 각 단계가 성공적으로 완료되는지 확인
   - 빌드 완료 후 **Artifacts**에서 다운로드 가능

---

## 완료 체크리스트

- [ ] GitHub 저장소 생성 완료 (Public)
- [ ] 로컬 저장소를 원격에 연결 완료
- [ ] 코드 푸시 완료
- [ ] Wiki 활성화 완료
- [ ] GitHub Actions 첫 빌드 실행 완료

---

## 문제 해결

### 푸시 실패 시

**인증 오류**:
- Personal Access Token (PAT) 필요
- Settings → Developer settings → Personal access tokens → Tokens (classic)
- `repo` 권한으로 토큰 생성 후 사용

**브랜치 이름 불일치**:
```bash
# 브랜치 이름 확인
git branch

# main으로 변경
git branch -M main

# 다시 푸시
git push -u origin main
```

### 원격 저장소 URL 변경

```bash
# 현재 원격 확인
git remote -v

# 원격 URL 변경
git remote set-url origin https://github.com/새로운계정/DBStudioX.git

# 확인
git remote -v
```
