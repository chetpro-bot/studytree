import React from 'react';
import {
  ChevronRight,
  CornerDownRight,
  PlusCircle,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import type { StudyNode } from '../types';
import { countDescendants } from '../utils/treeUtils';

interface TreeNodeItemProps {
  node: StudyNode;
  depth: number;
  activeNodeId: string | null;
  expandedNodeIds: Set<string>;
  searchMatchingIds: Set<string>;
  onSelectNode: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onAddSibling: (targetId: string) => void;
  onMoveNode: (id: string, direction: 'up' | 'down') => void;
  onDeleteNode: (id: string) => void;
}

export const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  depth,
  activeNodeId,
  expandedNodeIds,
  searchMatchingIds,
  onSelectNode,
  onToggleExpand,
  onAddChild,
  onAddSibling,
  onMoveNode,
  onDeleteNode,
}) => {
  const isExpanded = expandedNodeIds.has(node.id);
  const isSelected = activeNodeId === node.id;
  const isMatching = searchMatchingIds.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const totalSubCount = countDescendants(node);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      if (confirm(`'${node.title}' 항목과 하위 항목 ${totalSubCount}개를 모두 삭제하시겠습니까?`)) {
        onDeleteNode(node.id);
      }
    } else {
      if (confirm(`'${node.title}' 항목을 삭제하시겠습니까?`)) {
        onDeleteNode(node.id);
      }
    }
  };

  return (
    <div className="select-none text-xs">
      {/* 노드 행 (노션 스타일 깔끔한 라운드 행) */}
      <div
        onClick={() => onSelectNode(node.id)}
        className={`group flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors cursor-pointer my-0.5 ${
          isSelected
            ? 'bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-100 font-medium'
            : isMatching
            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-medium'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-850/80'
        }`}
      >
        {/* 좌측: 회전 화살표 & 제목 */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* 노션 스타일 회전 화살표 토글 버튼 (▾ / ▸) */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.id);
              }}
              className="w-4 h-4 rounded hover:bg-slate-200/80 dark:hover:bg-slate-700/80 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
              title={isExpanded ? '접기' : '펼치기'}
            >
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform duration-150 ${
                  isExpanded ? 'rotate-90 text-slate-600 dark:text-slate-300' : ''
                }`}
              />
            </button>
          ) : (
            <div className="w-4 h-4 shrink-0" />
          )}

          {/* 노드 제목 */}
          <span
            className={`truncate text-[13px] leading-snug tracking-tight ${
              depth === 0 ? 'font-semibold text-slate-900 dark:text-white' : ''
            } ${isMatching ? 'text-amber-800 dark:text-amber-300 font-semibold underline decoration-amber-400/60' : ''}`}
          >
            {node.title || '(제목 없음)'}
          </span>

          {/* 하위 항목 개수 배지 */}
          {hasChildren && (
            <span
              className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium shrink-0 ml-0.5"
              title={`하위 항목 총 ${totalSubCount}개`}
            >
              {totalSubCount}
            </span>
          )}
        </div>

        {/* 우측 호버/선택 액션 버튼 그룹 */}
        <div
          className={`items-center gap-0.5 shrink-0 pl-1 ${
            isSelected ? 'flex' : 'hidden group-hover:flex'
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(node.id);
            }}
            className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded transition cursor-pointer"
            title="하위 항목 추가 (+하위)"
          >
            <CornerDownRight className="w-3 h-3" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddSibling(node.id);
            }}
            className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded transition cursor-pointer"
            title="같은 레벨 항목 추가 (+형제)"
          >
            <PlusCircle className="w-3 h-3" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveNode(node.id, 'up');
            }}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded transition cursor-pointer"
            title="위로 이동"
          >
            <ArrowUp className="w-3 h-3" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveNode(node.id, 'down');
            }}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded transition cursor-pointer"
            title="아래로 이동"
          >
            <ArrowDown className="w-3 h-3" />
          </button>

          <button
            onClick={handleDelete}
            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800 rounded transition cursor-pointer"
            title="삭제"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 하위 자식 노드 재귀 렌더링 (노션/아웃라이너 스타일 수직 인덴트 기준선) */}
      {hasChildren && isExpanded && (
        <div className="relative ml-[14px] pl-2 border-l border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
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
    </div>
  );
};
