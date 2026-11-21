import React from 'react';
import { Plus, BookOpen, Layers, CheckCircle2, RefreshCw } from 'lucide-react';
import type { StudyNode, TreeStats } from '../types';
import { TreeNodeItem } from './TreeNodeItem';
import { APP_VERSION } from '../constants/version';

interface TreeExplorerProps {
  nodes: StudyNode[];
  activeNodeId: string | null;
  expandedNodeIds: Set<string>;
  searchMatchingIds: Set<string>;
  stats: TreeStats;
  onSelectNode: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onAddSibling: (targetId: string) => void;
  onAddRootNode: () => void;
  onMoveNode: (id: string, direction: 'up' | 'down') => void;
  onDeleteNode: (id: string) => void;
  onCheckUpdate?: () => void;
}

export const TreeExplorer: React.FC<TreeExplorerProps> = ({
  nodes,
  activeNodeId,
  expandedNodeIds,
  searchMatchingIds,
  stats,
  onSelectNode,
  onToggleExpand,
  onAddChild,
  onAddSibling,
  onAddRootNode,
  onMoveNode,
  onDeleteNode,
  onCheckUpdate,
}) => {
  return (
    <aside className="h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-none">
      {/* 1. 트리 패널 상단 서브 헤더 */}
      <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
          <span>지식 구조 목차</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
            {nodes.length}개 대단원
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            {stats.progressPercent}%
          </span>
        </div>
      </div>

      {/* 2. 스크롤 가능한 트리 리스트 영역 */}
      <div className="flex-1 overflow-y-auto py-2 px-1 focus:outline-none">
        {nodes.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-3">
            <BookOpen className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
            <p className="text-xs">등록된 단원이 없습니다.</p>
            <button
              onClick={onAddRootNode}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-md font-medium transition"
            >
              <Plus className="w-3.5 h-3.5" />
              첫 대단원 만들기
            </button>
          </div>
        ) : (
          <div className="space-y-0.5">
            {nodes.map((node) => (
              <TreeNodeItem
                key={node.id}
                node={node}
                depth={0}
                activeNodeId={activeNodeId}
                expandedNodeIds={expandedNodeIds}
                searchMatchingIds={searchMatchingIds}
                onSelectNode={onSelectNode}
                onToggleExpand={onToggleExpand}
                onAddChild={onAddChild}
                onAddSibling={onAddSibling}
                onMoveNode={onMoveNode}
                onDeleteNode={onDeleteNode}
              />
            ))}
          </div>
        )}

        {/* 트리 최하단: 새 대단원 추가 버튼 */}
        <div className="p-3">
          <button
            onClick={onAddRootNode}
            className="w-full py-2 px-3 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-lg text-xs font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 flex items-center justify-center gap-1.5 transition hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 group"
          >
            <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-indigo-500" />
            <span>새 대단원 추가</span>
          </button>
        </div>
      </div>

      {/* 3. 하단 상태 바 (Footer) */}
      <div className="p-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium text-slate-600 dark:text-slate-300">
          총 {stats.total}개 항목
        </span>
        <button
          onClick={onCheckUpdate}
          className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 transition cursor-pointer"
          title="클릭하여 앱 최신 버전 확인"
        >
          <span>{APP_VERSION}</span>
          <RefreshCw className="w-2.5 h-2.5" />
        </button>
      </div>
    </aside>
  );
};
