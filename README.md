# FlowRoutine

크롬 확장툴 및 React 기반 UI 프로젝트입니다.

Figma 디자인, 커스텀 폰트, 정적 파일 관리 등 최신 프론트엔드 구조를 적용합니다.

---

## 최근 변경 사항

- Pretendard 폰트 전역 적용 (`pretendard.css`, `index.css`)
- `@import` 문법 오류 해결: CSS 파일 최상단에 import 위치 조정
- manifest.json, 아이콘 등 정적 파일이 빌드 결과물(`dist`)에 포함되도록 빌드 스크립트 개선
- `package.json`의 build 명령어에 아래 내용 추가:
  ```bash
  vite build && copy manifest.json dist\ && xcopy src\assets\icons dist\assets\icons /E /I /Y
  ```
  - 빌드 시 manifest.json과 assets/icons 폴더가 dist로 복사됨
- 이미지, 폰트 등 코드에서 import하지 않는 파일은 public 폴더 또는 빌드 스크립트로 dist에 복사
- README.md에 프로젝트 구조, 실행 방법, 확장툴 등록 주의사항 등 문서화

---

## 프로젝트 구조

```
FlowRoutine/
├── hello_extensions.png
├── hello.html
├── LICENSE
├── manifest.json
├── popup.js
├── README.md
├── task.patch
├── src/
│   ├── index.css
│   ├── index.tsx
│   ├── assets/
│   │   └── fonts/
│   │       ├── pretendard.css
│   │       ├── woff2/
│   │       │   └── Pretendard-*.woff2
│   │   └── images/
│   │       └── hello_extensions.png
│   ├── components/
│   ├── styles/
│   ├── contexts/
│   ├── types/
├── dist/
│   └── (빌드 결과물)
└── .vscode/
    └── FlowRoutine Timer Extension/
        └── ...
```

## 실행 방법

1. 의존성 설치
   ```bash
   npm install
   ```
2. 개발 서버 실행
   ```bash
   npm run dev
   ```
   - 기본 주소: http://localhost:5173/
3. 빌드
   ```bash
   npm run build
   ```
   - 빌드 결과물은 `dist/` 폴더에 생성됩니다.
   - 크롬 확장툴 등록 시, `dist` 폴더를 지정하면 됩니다.
