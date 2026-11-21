import React, { useState } from 'react';
import {
  ChevronRight,
  Sparkles,
  BookOpen,
  FileText,
  CornerDownRight,
  PlusCircle,
  Eye,
  Edit2,
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
  onAddChild: (parentId: string) => void;
  onAddSibling: (targetId: string) => void;
  onIndent: (id: string) => void;
  onOutdent: (id: string) => void;
}

export const DetailEditor: React.FC<DetailEditorProps> = ({
  node,
  breadcrumbs,
  onSelectNode,
  onUpdateNode,
  onAddChild,
  onAddSibling,
  onIndent,
  onOutdent,
}) => {
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

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

  // 마크다운 간이 렌더러 (제목, 불릿, 굵게, 표 등)
  const renderMarkdown = (text: string) => {
    if (!text.trim()) {
      return (
        <p className="text-xs text-slate-400 italic">
          작성된 상세 노트가 없습니다. 학습 내용을 입력해 보세요.
        </p>
      );
    }

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = (keyPrefix: number) => {
      if (tableRows.length > 0) {
        const header = tableRows[0];
        const body = tableRows.slice(2); // row 1 is separator | :--- |

        elements.push(
          <div key={`table-${keyPrefix}`} className="overflow-x-auto my-3">
            <table className="w-full text-xs text-left border-collapse border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold">
                <tr>
                  {header.map((col, idx) => (
                    <th key={idx} className="p-2 border border-slate-200 dark:border-slate-700">
                      {formatInline(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {body.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-slate-50 dark:hover:bg-slate-850 transition"
                  >
                    {row.map((col, cIdx) => (
                      <td
                        key={cIdx}
                        className="p-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                      >
                        {formatInline(col)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // 표 파싱
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true;
        const cols = trimmed
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        tableRows.push(cols);
        return;
      } else if (inTable) {
        flushTable(index);
      }

      // 제목 헤딩
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h4
            key={index}
            className="text-sm font-bold text-slate-900 dark:text-white mt-4 mb-1.5 flex items-center gap-1.5"
          >
            <span className="w-1.5 h-3.5 bg-indigo-500 rounded-sm inline-block" />
            {formatInline(trimmed.substring(4))}
          </h4>
        );
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h3
            key={index}
            className="text-base font-bold text-slate-900 dark:text-white mt-5 mb-2 pb-1 border-b border-slate-200 dark:border-slate-800"
          >
            {formatInline(trimmed.substring(3))}
          </h3>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push(
          <li
            key={index}
            className="ml-4 list-disc text-xs leading-relaxed text-slate-700 dark:text-slate-300 py-0.5"
          >
            {formatInline(trimmed.substring(2))}
          </li>
        );
      } else if (trimmed.startsWith('  * ') || trimmed.startsWith('  - ')) {
        elements.push(
          <li
            key={index}
            className="ml-8 list-circle text-xs leading-relaxed text-slate-600 dark:text-slate-400 py-0.5"
          >
            {formatInline(trimmed.substring(4))}
          </li>
        );
      } else if (trimmed === '') {
        elements.push(<div key={index} className="h-2" />);
      } else {
        elements.push(
          <p
            key={index}
            className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 py-0.5"
          >
            {formatInline(line)}
          </p>
        );
      }
    });

    if (inTable) {
      flushTable(lines.length);
    }

    return <div className="space-y-1">{elements}</div>;
  };

  // 인라인 볼드, 코드 등 파싱
  const formatInline = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded text-[11px] font-mono"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
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

        {/* 핵심 요약 (한 줄 정리) 강조 박스 */}
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              핵심 한 줄 요약 (시험 직전 복습 포인트)
            </label>
            <span className="text-[10px] text-indigo-500/80 font-medium">Quick Review</span>
          </div>
          <input
            type="text"
            value={node.summary}
            onChange={(e) => onUpdateNode(node.id, { summary: e.target.value })}
            placeholder="핵심 정의, 주요 암기 키워드, 공식 또는 복약 주의사항 1줄 정리..."
            className="w-full text-xs md:text-sm font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-lg border border-indigo-200/80 dark:border-indigo-800/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 shadow-2xs"
          />
        </div>

        {/* 상세 학습 노트 (Study Notes) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          {/* 에디터 / 마크다운 뷰어 탭 툴바 */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>상세 학습 노트 (Study Notes & MOA)</span>
            </div>

            <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setViewMode('edit')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition font-medium ${
                  viewMode === 'edit'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Edit2 className="w-3 h-3" />
                <span>편집</span>
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition font-medium ${
                  viewMode === 'preview'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>미리보기</span>
              </button>
            </div>
          </div>

          {/* 에디터 또는 프리뷰 콘텐츠 */}
          <div className="p-4 md:p-5 min-h-[300px]">
            {viewMode === 'edit' ? (
              <textarea
                value={node.notes}
                onChange={(e) => onUpdateNode(node.id, { notes: e.target.value })}
                rows={14}
                placeholder="배경·전개·결과, 약물 기전(MOA), 상호작용(DDI), 복약지도 포인트 등을 상세히 작성해 보세요. Markdown 문법(## 제목, - 불릿, | 표 |)을 지원합니다."
                className="w-full h-full text-xs md:text-sm font-mono leading-relaxed bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none resize-y placeholder:text-slate-400 placeholder:font-sans"
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                {renderMarkdown(node.notes)}
              </div>
            )}
          </div>
        </div>

        {/* 하단 단원 액션 카드 (하위/형제 추가 빠른 버튼) */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddChild(node.id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg font-medium transition"
            >
              <CornerDownRight className="w-3.5 h-3.5" />
              + 하위 세부 항목 추가
            </button>
            <button
              onClick={() => onAddSibling(node.id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-medium transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              + 같은 레벨 항목 추가
            </button>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>실시간 자동 저장됨</span>
          </div>
        </div>
      </div>
    </main>
  );
};
