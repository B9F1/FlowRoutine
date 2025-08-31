
# FlowRoutine

크롬 확장툴 및 React 기반 UI 프로젝트입니다.

## 주요 기능 및 진행 상황

- 크롬 확장툴: 타이머 관리, 플로팅 타이머, 탭별 동작, 알림음(bell_01.mp3)
- 통계 페이지: 일/주/월별 집중 시간, Chart.js 기반 막대 그래프 시각화
- 커스텀 폰트 Pretendard 적용, 정적 리소스(public/assets) 관리
- manifest.json, 아이콘, mp3 등 빌드 시 dist로 자동 복사
- 개인정보 수집/외부 전송 없음 (크롬 저장소만 사용)

## 최근 변경 사항

- 통계 페이지에 react-chartjs-2 기반 막대 그래프 적용
- 알림음 mp3 파일(public/assets/sounds/bell_01.mp3) 적용 및 manifest에 web_accessible_resources 등록
- 빌드 오류(경로, 중괄호 등) 및 타입 오류 수정
- 확장툴 배포/설치 방법 및 개인정보처리방침 안내 추가

## 폴더 구조

```
FlowRoutine/
├── public/
│   ├── manifest.json
│   └── assets/
│       ├── icons/
│       └── sounds/
├── src/
│   ├── index.css
│   ├── index.tsx
│   ├── components/
│   │   └── StatsBarChart.tsx
│   ├── StatsPage.tsx
│   ├── assets/
│   │   └── fonts/
│   │       ├── pretendard.css
│   │       └── woff2/
│   ├── types/
│   └── ...
├── dist/
│   └── (빌드 결과물)
└── README.md
```

## 실행 및 개발

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

## 크롬 확장툴 배포/설치

1. `dist` 폴더 전체를 zip으로 압축
2. 크롬 웹스토어 개발자 대시보드에서 새 아이템 등록
3. manifest.json, 아이콘, mp3 등 정적 리소스가 포함되어야 함
4. 테스트용 설치: chrome://extensions → 개발자 모드 → "압축해제된 확장 프로그램 로드" → dist 폴더 선택

## 개인정보처리방침 안내

이 확장 프로그램은 어떠한 개인정보도 수집하거나 외부로 전송하지 않습니다. (크롬 저장소만 사용)
외부 서버 연동/수집이 추가될 경우 별도 정책 페이지를 등록할 예정입니다.
