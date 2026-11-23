# Changelog

All notable changes to the **StudyTree** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.1] - 2026-11-23

### Fixed & Improved
- **핵심 요약 및 상세 노트 입력창 자동 높이 확장 (Auto-resize)**:
  - 텍스트가 늘어날 때 내부 스크롤바가 생기는 대신 박스 높이가 내용 길이에 맞춰 자동으로 확장되도록 개선
  - 내부 스크롤바와 우측 하단 크기 조절 핸들(`resize-y`)을 제거하여 깔끔한 카드 뷰 UI 제공
  - 모던 브라우저 네이티브 `field-sizing: content` 및 브라우저 크기 조절/입력 이벤트에 반응하는 동적 계산 적용

## [1.2.0] - 2026-11-21

### Added
- **지식 트리 A4 이미지 출력 및 인쇄 기능 추가**:
  - **A4 용지 비율 지원**: 고해상도 200 DPI 기준 **A4 세로(210×297mm)** / **A4 가로(297×210mm)** 방향 자유 선택
  - **2가지 시각화 레이아웃 지원**:
    - **목차 정리형**: 대단원별 컬러 카드 + 깔끔한 트리 가이드라인 + 자동 1단/2단 밸런스 배치
    - **마인드맵 트리형**: 좌측 루트에서 우측으로 곡선 베지어 가지가 뻗어나가는 한눈에 보는 지식 지도
  - **핵심 요약 포함 토글**: 제목 목차만 심플하게 출력하거나 각 항목의 핵심 요약까지 함께 출력 선택 가능
  - **실시간 A4 미리보기 & 출력**: 모달 내 실시간 A4 용지 미리보기, 고화질 PNG 다운로드, A4 맞춤 바로 인쇄(`@page`) 지원
  - 좌측 목차 패널 상단 **`[A4 출력]`** 버튼 및 상단 헤더 유틸리티 바에서 원클릭 접근 가능

## [1.1.3] - 2026-11-21

### Fixed & Improved
- **PDF 트리 자동화 엔진 전면 재설계 (초고속·고정밀 변환)**:
  - **AI 무한 재시도 버그 수정**: 구형 모델(`gemini-2.0-flash`)과 과부하 모델(`gemini-3.8-flash`) 간에 발생하던 재귀 핑퐁 무한 루프를 완전히 제거하고, 중복 시도 차단(`triedModels`) 큐 + 30초 타임아웃 + 즉시 취소(`AbortController`) 구조로 전면 개편
  - **로컬 폰트 크기·굵기 기반 스마트 구조화**: PDF.js에서 각 줄의 폰트 크기(H1/H2/H3)·굵기(Bold)·Y좌표 줄바꿈·목차 번호(`I.`, `1.`, `3-4.` 등)를 종합 분석하여 API 대기 없이 **0.1초 만에 정교한 계층 트리**를 즉시 생성
  - **로컬 PDF Web Worker 번들링**: 외부 CDN 의존성을 제거하고 앱 내 로컬 워커로 구동하여 추출 안정성과 속도 향상
  - **현역 초고속 AI 모델 반영**: `Gemini 3.5 Flash-Lite` 및 `Gemini 3.8 Flash` 중심으로 모델 목록 정리

## [1.1.2] - 2026-11-21

### Fixed
- **AI 지식 트리 변환 속도 10배 최적화 및 무기한 지연 방지**:
  - 장시간 지연(120초 이상 대기)을 유발하던 대량 텍스트/과도한 서술형 생성 프롬프트를 핵심 요약 중심으로 초경량화하여 10초 이내 빠른 응답 유도
  - 기본 모델을 가장 빠르고 안정적인 `Gemini 2.0 Flash`로 재설정
  - `maxOutputTokens: 3000` 및 45초 엄격한 타임아웃 제한 적용
  - AI 분석 대기 중 언제든지 클릭하여 0.1초 만에 즉시 트리를 완성할 수 있는 `[⚡ 대기 취소 및 로컬로 즉시 완료]` 실시간 버튼 추가

## [1.1.1] - 2026-11-21

### Fixed
- **Google AI 서버 과부하(High Demand) 대응 및 UX 대폭 개선**:
  - 구글 서버 503/429 일시적 과부하 발생 시 1.5초 후 자동 백오프 재시도 및 안정적인 `Gemini 2.0 Flash` 모델 자동 폴백 탑재
  - `gemini-3.8-flash`의 추론 수준(`thinkingLevel: 'low'`) 최적화로 처리 지연 시간 단축
  - AI 분석 진행 시 실시간 경과 시간(`X초 경과`) 표시로 멈춤 오인 방지
  - AI 서버 장애 시 에러창에서 원클릭으로 즉시 변환 가능한 `[⚡ 로컬 목차 변환으로 즉시 생성]` 버튼 추가

## [1.1.0] - 2026-11-21

### Fixed
- **Google Gemini 최신 모델(gemini-3.8-flash) 지원 및 자동 전환**:
  - Google Gemini API 정책 변경으로 신규 사용자에게 `gemini-2.5-flash`가 지원 중단되고 `gemini-3.8-flash` 사용이 필수가 됨에 따라 기본 모델을 `gemini-3.8-flash`로 전면 교체
  - 이전 모델 선택 시 구글 권고 모델로 자동 감지 및 무중단 재시도(Auto Fallback) 로직 적용

## [1.0.9] - 2026-11-21

### Fixed
- **PDF 로컬 목차 변환 엔진 고도화 및 트리 구조 생성 정상화**:
  - 기존 PDF 페이지 텍스트 추출 시 모든 줄이 한 줄로 병합되어 단원이 1개로 뭉치던 문제 해결
  - Y좌표 기반 수직 레이아웃 분석을 적용하여 PDF의 원본 줄바꿈 구조 완벽 복원
  - 인라인 섹션 번호(`1.`, `3-4.`, `(1)`, `제1장` 등) 정밀 감지 및 헤더 분리 알고리즘 추가
  - 대단원(I, 1 등) 아래에 중단원·소단원(3-4, 1.1 등)이 계층적으로 배치되는 다단계 지식 트리 구조 자동 생성

## [1.0.8] - 2026-11-21

### Added
- **PDF 학습 자료 지식 트리 자동 변환 기능 추가**:
  - 수험서, 교안, 요약집 등 `.pdf` 파일을 업로드하면 StudyTree의 핵심 의도에 맞게 대단원-중단원-소단원의 계층형 트리로 자동 변환
  - **✨ AI 스마트 구조화 (Google Gemini API)**:
    - PDF 본문을 심층 분석하여 시험 직전 3초 복습용 '핵심 요약' 및 인과관계·원리를 담은 '상세 학습 노트'를 고도화하여 작성
    - Gemini 2.5 Flash / 1.5 Flash 모델 지원 및 브라우저 로컬 안전 API 키 보관
  - **⚡ 빠른 로컬 목차 변환 (API 키 불필요)**:
    - 외부 호출 없이 브라우저 내에서 목차 패턴(I, II, 1, 2 등)을 1초 만에 분석하여 즉시 트리 구조화
  - 상단 툴바 및 단원 없음(빈 상태) 화면에 원클릭 변환 진입 버튼 제공
  - 변환 결과 미리보기 및 노트북 제목 수정 지원

## [1.0.7] - 2026-11-21

### Removed
- **샘플 데이터 복원 버튼 제거**:
  - 상단 툴바 우측의 샘플 복원/초기화 회전 화살표 버튼 제거

### Fixed
- **마지막 1개 남은 노트북/샘플 삭제 허용**:
  - 노트북이 1개만 남아있을 때 삭제(휴지통) 버튼이 사라지던 제한 제거
  - 마지막 남은 노트북 삭제 시 확인을 거쳐 새로운 빈 노트북(`새 노트북`)이 자동 생성되어 깨끗하게 비워진 상태로 즉시 학습 시작 가능

## [1.0.6] - 2026-11-21

### Removed
- **목차 상단 진행률(36%) 배지 제거**:
  - 학습 상태 구분을 없앤 방향성에 맞춰 남아있던 우측 상단 진행률 퍼센트(`%`) 표시 제거

### Changed
- **초기 트리 뷰 스타일 복원**:
  - 사용자 피드백에 따라 실험적인 가지선/아웃라이너를 걷어내고 가장 안정적이었던 초기 트리 형태로 원복
  - 폴더형 상위 항목: 직관적인 사각 `[+]` / `[-]` 토글 버튼
  - 리프(하위) 항목: 깔끔한 불릿 원형 점(도트) 표시
  - 깊이별 은은한 수직 계층 연결 가이드라인 유지

## [1.0.5] - 2026-11-21

### Changed
- **노션 / 아웃라이너 스타일 트리 탐색기 전면 개편**:
  - 복잡한 잔가지선(`├──`, `└──`)을 모두 걷어내고 모던한 아웃라이너 형태로 재구성
  - 하위 항목이 있는 노드에는 부드럽게 90° 회전하는 화살표 토글(`▸` / `▾`) 제공
  - 하위 항목 그룹 좌측에 은은하고 세련된 단일 수직 가이드선(인덴트선)을 적용하여 계층 깊이와 시각적 깔끔함 동시 확보
  - 리프(Leaf) 노드는 여백 스페이서와 미니멀한 텍스트로 정돈되어 가독성 극대화

## [1.0.4] - 2026-11-21

### Fixed
- **트리 가지선 매끄러운 단일 실선화**:
  - 하위 리프 항목의 분리된 대시로 인해 `ㅡ ㅡ`처럼 끊어져 보이던 간격 현상 제거
  - 상위 가지선에서 항목 텍스트 바로 앞까지 한 번에 부드럽게 이어지는 단일 연결선(`├───`, `└───`)으로 개선하여 완벽한 트리 뷰 구현

## [1.0.3] - 2026-11-21

### Added
- **트리 구조 연결선(Tree Branch Connectors) 전면 개편**:
  - 기존 원형 점(도트) 대신 계층이 명확히 연결되는 가로·세로 직각 가지선(`├──`, `└──`) 적용
  - 다단계 들여쓰기 시에도 상위 조상 연결선이 끊김 없이 수직 정렬되는 가이드라인 구현
  - 리프(Leaf) 노드도 일관성 있는 가지 끝 선 형태로 깔끔하게 정돈

### Changed
- **상세 에디터 레이아웃 단순화**:
  - '핵심 요약' 다중 라인(textarea) 전환 및 불필요한 괄호/설명 문구 제거
  - '상세 학습 노트' 마크다운 미리보기/편집 탭 제거 및 일반 텍스트 편집 영역으로 전환
  - 에디터 하단의 중복 액션 버튼(+하위/+같은 레벨 추가) 제거로 텍스트 집중도 향상

## [1.0.2] - 2026-11-21

### Added
- **앱 업데이트 확인 및 즉시 반영 기능**:
  - 상단 툴바 우측에 '최신 버전 확인 및 앱 업데이트' 버튼 추가
  - 상단 로고 옆 버전 배지 클릭 시 최신 버전 체크 및 업데이트 모달 연동
  - 좌측 트리 사이드바 하단 버전 배지 클릭 시 업데이트 체크 지원
  - 백그라운드 주기적(15분) 버전 체크 및 새 버전 감지 알림 배지 표시
  - 원클릭 캐시 비우기 및 즉각적인 최신 배포본 자동 새로고침(Hard Reload)

## [1.0.1] - 2026-11-21

### Changed
- **UI 단순화 및 클린 레이아웃 개편**:
  - 상세 에디터 상단 헤더의 중요 별표(★) 및 학습 상태(미학습/학습중/암기완료) 버튼 제거
  - 트리 탐색기 각 노드의 상태 표시 컬러 점 및 별표 버튼 제거
  - 사이드바 하단 암기 달성률 게이지를 전체 항목 수 집계로 간소화

## [1.0.0] - 2026-11-21

### Added
- **2-Pane Workspace & Responsive Outliner Layout**:
  - Left Tree Explorer (420px width) with infinite recursive topic hierarchy, indentation connector lines, and folding badges (`+` / `-`).
  - Right Detail Study Editor with dynamic Breadcrumbs, 1-line key takeaway summary card, and markdown-enabled study notes.
  - Keyboard shortcuts: `Enter` to create sibling node, `Tab` to indent (sub-topic), `Shift+Tab` to outdent (promote).
- **Learning Mastery & Progress Tracking**:
  - 3-tier study status: `미학습 (Not Started)`, `학습중 (Learning)`, `암기완료 (Mastered)` with confetti celebrations.
  - Priority star toggle (★).
  - Bottom progress footer tracking realtime completion percentage.
- **Multi-Notebook Architecture**:
  - Full notebook management (Create, Rename, Delete with min 1 guard).
  - Pre-loaded rich domain datasets:
    1. `[샘플] 고교 한국사 - 근현대사 핵심 정리` (흥선대원군 개혁부터 6월 민주항쟁까지)
    2. `[샘플] 약학 스터디 - 심혈관계 약물 정리` (RAAS, 베타차단제, CCB, 이뇨제 작용기전 MOA, 상호작용 DDI, 복약지도)
- **Cloud & Server Architecture (Firebase)**:
  - **Firebase Authentication**: Email/Password sign up & sign in, Google OAuth popup sign in.
  - **Cloud Firestore**: Realtime bidirectional debounced sync per user (`/users/{userId}/notebooks/{notebookId}`).
  - **Firestore Security Rules**: Strict owner-isolated read/write access validated with `firestore.rules`.
  - **Firebase Hosting**: Worldwide CDN hosting and deployment.
- **PWA (Progressive Web App) Desktop Capability**:
  - Web App Manifest (`manifest.webmanifest`) and vector SVG icon for standalone installation.
  - Installable directly to Windows Desktop & taskbar via Chrome / Edge.
- **Data Management & Utilities**:
  - Full JSON backup export and import.
  - Sample dataset restore button.
  - Realtime full-text search across titles, summaries, and notes with ancestor auto-expansion and highlighting.
  - Dark Mode and Light Mode support with persistent state.
