import React from 'react';
import {
  ChevronRight,
  Sparkles,
  BookOpen,
  FileText,
  Keyboard,
  Clock,
  Layers,
} from 'lucide-react';
import type { StudyNode, BreadcrumbItem } from '../types';

interface DetailEditorProps {
  node: StudyNode | null;
  breadcrumbs: BreadcrumbItem[];
  onSelectNode: (id: string) => void;
  onUpdateNode: (id: string, fields: Partial<StudyNode>) => void;
  onAddChild?: (parentId: string) => void;
  onAddSibling: (targetId: string) => void;
  onIndent: (id: string) => void;
  onOutdent: (id: string) => void;
}

export const DetailEditor: React.FC<DetailEditorProps> = ({
  node,
  breadcrumbs,
  onSelectNode,
  onUpdateNode,
  onAddSibling,
  onIndent,
  onOutdent,
}) => {
  if (!node) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/40 dark:bg-slate-900/30">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mb-4 text-indigo-500">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
          선택된 학습 항목이 없습니다
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mb-4">
          좌측 지식 트리에서 확인하고자 하는 단원이나 주제를 선택하거나, 새로운 대단원을 추가해 보세요.
        </p>
      </div>
    );
  }

  // 키보드 단축키 처리 (Enter, Tab, Shift+Tab)
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAddSibling(node.id);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        onOutdent(node.id);
      } else {
        onIndent(node.id);
      }
    }
  };

  return (
    <main className="h-full flex flex-col bg-slate-50/50 dark:bg-slate-950 overflow-y-auto">
      {/* 1. 상단 경로(Breadcrumb) & 빠른 상태 액션 툴바 */}
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* 계층 경로 (Breadcrumb) */}
        <nav className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500 dark:text-slate-400 min-w-0">
          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />}
                <button
                  onClick={() => onSelectNode(crumb.id)}
                  className={`truncate max-w-[140px] sm:max-w-[200px] hover:text-indigo-600 dark:hover:text-indigo-400 transition ${
                    isLast
                      ? 'font-semibold text-indigo-600 dark:text-indigo-400 cursor-default'
                      : 'hover:underline text-slate-600 dark:text-slate-400'
                  }`}
                  title={crumb.title}
                >
                  {crumb.title}
                </button>
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* 2. 메인 에디터 본문 영역 */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* 항목 제목 입력창 (큰 폰트 인라인) */}
        <div className="space-y-1">
          <input
            type="text"
            value={node.title}
            onChange={(e) => onUpdateNode(node.id, { title: e.target.value })}
            onKeyDown={handleTitleKeyDown}
            placeholder="단원 또는 학습 주제 제목을 입력하세요..."
            className="w-full text-xl md:text-2xl font-bold bg-transparent text-slate-900 dark:text-white border-b-2 border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-indigo-500 focus:outline-none py-1.5 transition placeholder:text-slate-300 dark:placeholder:text-slate-700"
          />

          {/* 단축키 가이드 힌트 */}
          <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <Keyboard className="w-3 h-3 text-indigo-400" />
              <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-[10px]">Enter</kbd> 형제 추가
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-[10px]">Tab</kbd> 들여쓰기
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-[10px]">Shift+Tab</kbd> 내어쓰기
            </span>
          </div>
        </div>

        {/* 핵심 요약 강조 박스 */}
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              핵심 요약
            </label>
          </div>
          <textarea
            value={node.summary}
            onChange={(e) => onUpdateNode(node.id, { summary: e.target.value })}
            placeholder="핵심 요약 내용을 입력하세요..."
            rows={2}
            className="w-full text-xs md:text-sm font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-lg border border-indigo-200/80 dark:border-indigo-800/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 shadow-2xs min-h-[58px] resize-y leading-relaxed"
          />
        </div>

        {/* 상세 학습 노트 */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          {/* 헤더 */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>상세 학습 노트</span>
            </div>
          </div>

          {/* 텍스트 입력 영역 */}
          <div className="p-4 md:p-5 min-h-[300px]">
            <textarea
              value={node.notes}
              onChange={(e) => onUpdateNode(node.id, { notes: e.target.value })}
              rows={14}
              placeholder="상세한 학습 내용이나 정리 사항을 자유롭게 입력하세요..."
              className="w-full h-full text-xs md:text-sm font-sans leading-relaxed bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none resize-y placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* 하단 자동 저장 알림 */}
        <div className="pt-1 flex items-center justify-end text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            실시간 자동 저장됨
          </span>
        </div>
      </div>
    </main>
  );
};
