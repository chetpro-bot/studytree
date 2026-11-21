# Changelog

All notable changes to the **StudyTree** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
