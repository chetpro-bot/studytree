import type { BreadcrumbItem, StudyNode, TreeStats } from '../types';

/**
 * ID로 트리의 노드를 재귀 검색합니다.
 */
export function findNodeById(nodes: StudyNode[], id: string): StudyNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children && node.children.length > 0) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 대상 노드의 부모 노드, 형제 목록 및 형제 내 인덱스를 반환합니다.
 */
export function findParentAndIndex(
  nodes: StudyNode[],
  targetId: string,
  parent: StudyNode | null = null
): { parent: StudyNode | null; index: number; siblings: StudyNode[] } | null {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === targetId) {
      return { parent, index: i, siblings: nodes };
    }
    if (nodes[i].children && nodes[i].children.length > 0) {
      const result = findParentAndIndex(nodes[i].children, targetId, nodes[i]);
      if (result) return result;
    }
  }
  return null;
}

/**
 * 루트부터 대상 노드까지의 Breadcrumb 경로를 반환합니다.
 */
export function getBreadcrumbs(nodes: StudyNode[], targetId: string): BreadcrumbItem[] {
  const path: BreadcrumbItem[] = [];

  function helper(currentList: StudyNode[], target: string): boolean {
    for (const node of currentList) {
      path.push({ id: node.id, title: node.title });
      if (node.id === target) {
        return true;
      }
      if (node.children && node.children.length > 0) {
        if (helper(node.children, target)) {
          return true;
        }
      }
      path.pop();
    }
    return false;
  }

  helper(nodes, targetId);
  return path;
}

/**
 * 불변(Immutable) 방식으로 특정 노드의 속성을 업데이트합니다.
 */
export function updateNodeInTree(
  nodes: StudyNode[],
  id: string,
  updater: (node: StudyNode) => Partial<StudyNode>
): StudyNode[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return {
        ...node,
        ...updater(node),
        updatedAt: new Date().toISOString(),
      };
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: updateNodeInTree(node.children, id, updater),
      };
    }
    return node;
  });
}

/**
 * 특정 노드를 트리에서 삭제합니다.
 */
export function deleteNodeFromTree(nodes: StudyNode[], id: string): StudyNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({
      ...node,
      children: node.children ? deleteNodeFromTree(node.children, id) : [],
    }));
}

/**
 * 특정 부모 노드 아래에 새 자식 노드를 추가합니다.
 */
export function insertChildNode(
  nodes: StudyNode[],
  parentId: string,
  newNode: StudyNode
): StudyNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...(node.children || []), newNode],
      };
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: insertChildNode(node.children, parentId, newNode),
      };
    }
    return node;
  });
}

/**
 * 특정 대상 노드의 바로 앞 또는 뒤에 형제 노드를 추가합니다.
 */
export function insertSiblingNode(
  nodes: StudyNode[],
  targetId: string,
  newNode: StudyNode,
  after: boolean = true
): StudyNode[] {
  const result: StudyNode[] = [];

  for (const node of nodes) {
    if (node.id === targetId) {
      if (after) {
        result.push(node);
        result.push(newNode);
      } else {
        result.push(newNode);
        result.push(node);
      }
    } else {
      if (node.children && node.children.length > 0) {
        result.push({
          ...node,
          children: insertSiblingNode(node.children, targetId, newNode, after),
        });
      } else {
        result.push(node);
      }
    }
  }

  return result;
}

/**
 * 같은 부모 내에서 위/아래 순서를 변경합니다.
 */
export function moveNodeOrder(
  nodes: StudyNode[],
  id: string,
  direction: 'up' | 'down'
): StudyNode[] {
  const clone: StudyNode[] = JSON.parse(JSON.stringify(nodes));
  const loc = findParentAndIndex(clone, id);
  if (!loc) return nodes;

  const { index, siblings } = loc;
  const targetIndex = direction === 'up' ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= siblings.length) {
    return nodes;
  }

  const temp = siblings[index];
  siblings[index] = siblings[targetIndex];
  siblings[targetIndex] = temp;

  return clone;
}

/**
 * 들여쓰기 (Indent): 현재 노드를 바로 앞 형제의 마지막 자식으로 이동
 */
export function indentNode(nodes: StudyNode[], id: string): { newNodes: StudyNode[]; success: boolean } {
  const clone: StudyNode[] = JSON.parse(JSON.stringify(nodes));
  const loc = findParentAndIndex(clone, id);
  if (!loc || loc.index === 0) {
    return { newNodes: nodes, success: false };
  }

  const { index, siblings } = loc;
  const previousSibling = siblings[index - 1];
  const [targetNode] = siblings.splice(index, 1);

  if (!previousSibling.children) {
    previousSibling.children = [];
  }
  previousSibling.children.push(targetNode);

  return { newNodes: clone, success: true };
}

/**
 * 내어쓰기 (Outdent): 현재 노드를 부모의 다음 형제로 승격
 */
export function outdentNode(nodes: StudyNode[], id: string): { newNodes: StudyNode[]; success: boolean } {
  const clone: StudyNode[] = JSON.parse(JSON.stringify(nodes));
  const loc = findParentAndIndex(clone, id);
  if (!loc || !loc.parent) {
    return { newNodes: nodes, success: false };
  }

  const { parent, index, siblings } = loc;
  const [targetNode] = siblings.splice(index, 1);

  const parentLoc = findParentAndIndex(clone, parent.id);
  if (!parentLoc) {
    const parentIndex = clone.findIndex((n) => n.id === parent.id);
    clone.splice(parentIndex + 1, 0, targetNode);
  } else {
    parentLoc.siblings.splice(parentLoc.index + 1, 0, targetNode);
  }

  return { newNodes: clone, success: true };
}

/**
 * 트리의 모든 노드 수, 암기완료, 학습중, 별표 수 및 진행률 계산
 */
export function calculateTreeStats(nodes: StudyNode[]): TreeStats {
  let total = 0;
  let mastered = 0;
  let learning = 0;
  let notStarted = 0;
  let starred = 0;

  function traverse(list: StudyNode[]) {
    for (const node of list) {
      total++;
      if (node.status === 'mastered') mastered++;
      else if (node.status === 'learning') learning++;
      else notStarted++;

      if (node.starred) starred++;

      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(nodes);

  const progressPercent = total === 0 ? 0 : Math.round((mastered / total) * 100);

  return {
    total,
    mastered,
    learning,
    notStarted,
    starred,
    progressPercent,
  };
}

/**
 * 트리에 존재하는 모든 노드의 ID 목록 추출
 */
export function getAllNodeIds(nodes: StudyNode[]): string[] {
  const ids: string[] = [];

  function traverse(list: StudyNode[]) {
    for (const node of list) {
      ids.push(node.id);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(nodes);
  return ids;
}

/**
 * 특정 노드의 직계 및 모든 하위 자손 개수 계산
 */
export function countDescendants(node: StudyNode): number {
  if (!node.children || node.children.length === 0) return 0;
  let count = node.children.length;
  for (const child of node.children) {
    count += countDescendants(child);
  }
  return count;
}

/**
 * 제목, 요약, 상세 노트에서 키워드 검색
 */
export function searchTree(
  nodes: StudyNode[],
  query: string
): { matchingIds: Set<string>; ancestorIds: Set<string> } {
  const matchingIds = new Set<string>();
  const ancestorIds = new Set<string>();

  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return { matchingIds, ancestorIds };
  }

  function traverse(list: StudyNode[], currentAncestors: string[]): boolean {
    let subtreeHasMatch = false;

    for (const node of list) {
      const matchInTitle = node.title.toLowerCase().includes(trimmed);
      const matchInSummary = (node.summary || '').toLowerCase().includes(trimmed);
      const matchInNotes = (node.notes || '').toLowerCase().includes(trimmed);

      const isCurrentMatched = matchInTitle || matchInSummary || matchInNotes;
      if (isCurrentMatched) {
        matchingIds.add(node.id);
        currentAncestors.forEach((ancId) => ancestorIds.add(ancId));
        subtreeHasMatch = true;
      }

      const childMatched = node.children && node.children.length > 0
        ? traverse(node.children, [...currentAncestors, node.id])
        : false;

      if (childMatched) {
        subtreeHasMatch = true;
        ancestorIds.add(node.id);
      }
    }

    return subtreeHasMatch;
  }

  traverse(nodes, []);
  return { matchingIds, ancestorIds };
}

/**
 * 유니크 ID 생성
 */
export function generateNodeId(): string {
  return 'node-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
}
