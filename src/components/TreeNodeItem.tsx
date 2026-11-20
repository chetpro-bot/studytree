import React from 'react';
import {
  Star,
  Plus,
  Minus,
  CornerDownRight,
  PlusCircle,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import type { StudyNode, LearningStatus } from '../types';
import { countDescendants } from '../utils/treeUtils';

interface TreeNodeItemProps {
  node: StudyNode;
  depth: number;
  activeNodeId: string | null;
  expandedNodeIds: Set<string>;
  searchMatchingIds: Set<string>;
  onSelectNode: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onToggleStar: (id: string) => void;
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
  onToggleStar,
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

  const getStatusColor = (status: LearningStatus) => {
    switch (status) {
      case 'mastered':
        return 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900/50';
      case 'learning':
        return 'bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-900/50';
      case 'not_started':
      default:
        return 'bg-slate-300 dark:bg-slate-600';
    }
  };

  const getStatusLabel = (status: LearningStatus) => {
    switch (status) {
      case 'mastered':
        return '암기완료';
      case 'learning':
        return '학습중';
      case 'not_started':
      default:
        return '미학습';
    }
  };

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
        style={{ paddingLeft: `${Math.max(6, depth * 18 + 8)}px` }}
        className={`group relative flex items-center justify-between py-1.5 pr-2 transition cursor-pointer border-l-3 ${
          isSelected
            ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-600 dark:border-indigo-400 text-indigo-950 dark:text-indigo-100 font-medium'
            : isMatching
            ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-500 text-slate-800 dark:text-slate-200'
            : 'hover:bg-slate-100/80 dark:hover:bg-slate-850/80 border-transparent text-slate-700 dark:text-slate-300'
        }`}
      >
        {/* 좌측 콘텐츠 영역 */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* [+] / [-] 토글 버튼 또는 Leaf 도트 */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.id);
              }}
              className="w-4 h-4 rounded flex items-center justify-center bg-slate-200/90 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition shrink-0"
              title={isExpanded ? '접기' : '펼치기'}
            >
              {isExpanded ? <Minus className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
            </button>
          ) : (
            <div className="w-4 h-4 flex items-center justify-center shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />
            </div>
          )}

          {/* 학습 상태 점 */}
          <div
            className={`w-2 h-2 rounded-full shrink-0 transition-transform ${getStatusColor(
              node.status
            )}`}
            title={`상태: ${getStatusLabel(node.status)}`}
          />

          {/* 중요 별표 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(node.id);
            }}
            className={`p-0.5 rounded transition shrink-0 ${
              node.starred
                ? 'text-amber-400 fill-amber-400 hover:text-amber-500'
                : 'text-slate-300 dark:text-slate-700 hover:text-amber-400 opacity-0 group-hover:opacity-100'
            }`}
            title={node.starred ? '중요 표시 해제' : '중요 표시'}
          >
            <Star
              className={`w-3.5 h-3.5 ${node.starred ? 'fill-amber-400 text-amber-400' : ''}`}
            />
          </button>

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
          {/* 은은한 세로 트리 커넥터 가이드 라인 */}
          <div
            className="absolute bottom-0 top-0 border-l border-slate-200 dark:border-slate-800/80 pointer-events-none"
            style={{ left: `${Math.max(6, depth * 18 + 15)}px` }}
          />

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
              onToggleStar={onToggleStar}
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
