# Image Maker

사진 프린트 레이아웃 편집 유틸리티 (PC 웹).

브라우저에서 사진을 업로드·편집하고 PNG로 내보내는 **순수 프론트엔드** 앱입니다.
서버 / API / DB가 필요 없으며 GitHub Pages로 정적 배포할 수 있습니다.

## 로컬 실행

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

테스트:

```bash
npm test
```

## GitHub Pages 배포

### 1. Repository 준비

1. GitHub에 새 repository를 만듭니다.
2. 이 프로젝트를 push 합니다. (기본 브랜치: `main`)

### 2. Pages 소스 설정

1. GitHub repository → **Settings** → **Pages**
2. **Build and deployment** → **Source** 에서 **GitHub Actions** 를 선택합니다.

### 3. 자동 배포

`main` 브랜치에 push 하면 `.github/workflows/deploy.yml` 이 실행됩니다.

1. `npm ci`
2. repository 이름 기준으로 Vite `base` 결정
3. `npm run build`
4. `dist` 를 GitHub Pages에 배포

수동 실행: Actions 탭에서 **Deploy GitHub Pages** → **Run workflow**

### 예상 URL

| 유형 | Repository 이름 예시 | URL |
|------|---------------------|-----|
| Project Pages | `trueSizePhotoMaker` | `https://<username>.github.io/trueSizePhotoMaker/` |
| User site | `<username>.github.io` | `https://<username>.github.io/` |

흰 화면 + 콘솔에 `/assets/... 404` 가 보이면, 빌드 `base`가 `/`로 나간 것입니다.
정상 배포 시 JS/CSS는 다음처럼 **repo 경로 아래**에 있어야 합니다.

```text
https://<username>.github.io/trueSizePhotoMaker/assets/...
```

### Vite `base` 설정

배포 경로와 asset 경로가 맞아야 합니다.

- **CI**: `actions/configure-pages` 의 `base_path` 를 `BASE_PATH`로 넣고,
  `vite build --base "$BASE_PATH"` 로 명시 빌드합니다.
  - Project Pages → `/<repository-name>/` (예: `/trueSizePhotoMaker/`)
  - `*.github.io` user site → `/`
- 빌드 후 `dist/index.html`에 위 경로가 없으면 CI가 실패하도록 검증합니다.
- **로컬에서 Project Pages 경로로 빌드 확인**:

```bash
# 예: repository 이름이 trueSizePhotoMaker 인 경우
BASE_PATH=/trueSizePhotoMaker/ npm run build
```

`BASE_PATH` 를 지정하지 않으면 기본값은 `/` (로컬 개발·미리보기용)입니다.

코드에 repository 이름을 하드코딩하지 않습니다. repository 이름을 바꿔도 CI가 자동으로 맞춥니다.

재배포: 수정 내용을 `main`에 push 한 뒤 Actions에서 workflow가 성공했는지 확인하고,
브라우저에서 **강력 새로고침**(Ctrl+F5) 하세요.

### 배포 후 확인

브라우저에서 다음이 동작하는지 확인하세요.

- 사진 업로드 (JPEG / PNG / WebP)
- 편집 (드래그, Zoom, Rotation)
- Grid / 용지 설정
- Undo / Redo
- PNG 다운로드
- 사진 구분선 옵션

모든 처리는 브라우저 안에서만 이루어지며, GitHub Pages는 정적 파일만 제공합니다.

## 지원 용지

| 용지 | mm | px |
|---|---|---|
| 엽서 세로 | 100 × 148 | 1181 × 1748 |
| 엽서 가로 | 148 × 100 | 1748 × 1181 |
| A6 세로 | 105 × 148 | 1240 × 1748 |
| A6 가로 | 148 × 105 | 1748 × 1240 |
| L판 세로 | 89 × 127 | 1051 × 1500 |
| L판 가로 | 127 × 89 | 1500 × 1051 |

픽셀은 기존 엽서 보정값(100mm → 1181px, 약 300 DPI)을 공통 기준으로 계산합니다.

## PNG 출력 안내

다운로드된 PNG는 선택한 용지 preset의 픽셀 해상도로 생성됩니다.
실제 인쇄 시에는 인쇄 프로그램에서 이미지 크기를 임의로 키우거나 줄이지 말고
**원본 크기 그대로** 출력해야, 앱에서 설정한 실제 mm 크기를 유지할 수 있습니다.
