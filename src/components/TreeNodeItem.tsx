import React from 'react';
import {
  Plus,
  Minus,
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
  isLast?: boolean;
  lineGuides?: boolean[];
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
  isLast = false,
  lineGuides = [],
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
      <div
        onClick={() => onSelectNode(node.id)}
        style={{ paddingLeft: `${depth * 20 + 10}px` }}
        className={`group relative flex items-center justify-between py-1.5 pr-2 transition cursor-pointer border-l-3 ${
          isSelected
            ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-600 dark:border-indigo-400 text-indigo-950 dark:text-indigo-100 font-medium'
            : isMatching
            ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-500 text-slate-800 dark:text-slate-200'
            : 'hover:bg-slate-100/80 dark:hover:bg-slate-850/80 border-transparent text-slate-700 dark:text-slate-300'
        }`}
      >
        {/* 상위 조상 연결선 (Ancestor Vertical Lines) */}
        {lineGuides &&
          lineGuides.map((hasMore, idx) =>
            hasMore ? (
              <span
                key={idx}
                className="absolute top-0 bottom-0 w-[1.5px] bg-slate-300 dark:bg-slate-700 pointer-events-none"
                style={{ left: `${idx * 20 + 17}px` }}
              />
            ) : null
          )}

        {/* 현재 레벨의 가지 연결선 (Branch Lines: ├── 또는 └──) */}
        {depth > 0 && (
          <>
            {isLast ? (
              /* 마지막 자식: └── 곡선 */
              <span
                className="absolute top-0 h-1/2 border-l-[1.5px] border-b-[1.5px] border-slate-300 dark:bg-transparent dark:border-slate-700 rounded-bl-sm pointer-events-none"
                style={{
                  left: `${(depth - 1) * 20 + 17}px`,
                  width: '13px',
                }}
              />
            ) : (
              /* 중간 자식: ├── 직각 가지선 */
              <>
                <span
                  className="absolute top-0 bottom-0 w-[1.5px] bg-slate-300 dark:bg-slate-700 pointer-events-none"
                  style={{ left: `${(depth - 1) * 20 + 17}px` }}
                />
                <span
                  className="absolute top-1/2 h-[1.5px] bg-slate-300 dark:bg-slate-700 pointer-events-none -translate-y-1/2"
                  style={{
                    left: `${(depth - 1) * 20 + 17}px`,
                    width: '13px',
                  }}
                />
              </>
            )}
          </>
        )}

        {/* 좌측 콘텐츠 영역 */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 relative z-10">
          {/* [+] / [-] 토글 버튼 또는 Leaf 가지 선 */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.id);
              }}
              className="w-4 h-4 rounded flex items-center justify-center bg-slate-200/90 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition shrink-0 shadow-2xs"
              title={isExpanded ? '접기' : '펼치기'}
            >
              {isExpanded ? <Minus className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
            </button>
          ) : (
            <div className="w-4 h-4 flex items-center justify-center shrink-0">
              <span className="w-2.5 h-[1.5px] bg-slate-400 dark:bg-slate-500 rounded-full" />
            </div>
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
            className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded transition"
            title="하위 항목 추가 (+하위)"
          >
            <CornerDownRight className="w-3 h-3" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddSibling(node.id);
            }}
            className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded transition"
            title="같은 레벨 항목 추가 (+형제)"
          >
            <PlusCircle className="w-3 h-3" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveNode(node.id, 'up');
            }}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded transition"
            title="위로 이동"
          >
            <ArrowUp className="w-3 h-3" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveNode(node.id, 'down');
            }}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded transition"
            title="아래로 이동"
          >
            <ArrowDown className="w-3 h-3" />
          </button>

          <button
            onClick={handleDelete}
            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800 rounded transition"
            title="삭제"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 하위 자식 노드 재귀 렌더링 */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {node.children.map((child, index) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              isLast={index === node.children.length - 1}
              lineGuides={[...lineGuides, !isLast]}
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
