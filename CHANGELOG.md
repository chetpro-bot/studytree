# Changelog

All notable changes to the **StudyTree** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
