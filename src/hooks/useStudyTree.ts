import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Notebook, StudyNode, LearningStatus } from '../types';
import { defaultNotebooks } from '../data/sampleData';
import {
  findNodeById,
  updateNodeInTree,
  deleteNodeFromTree,
  insertChildNode,
  insertSiblingNode,
  moveNodeOrder,
  indentNode,
  outdentNode,
  calculateTreeStats,
  getAllNodeIds,
  searchTree,
  generateNodeId,
} from '../utils/treeUtils';
import confetti from 'canvas-confetti';
import { subscribeToAuth, logOut } from '../firebase/auth';
import { loadUserNotebooks, saveUserNotebook, saveAllUserNotebooks, deleteUserNotebook } from '../firebase/firestore';
import type { User } from 'firebase/auth';

const STORAGE_KEYS = {
  NOTEBOOKS: 'studytree_notebooks_v1',
  ACTIVE_NOTEBOOK_ID: 'studytree_active_notebook_id_v1',
  ACTIVE_NODE_ID: 'studytree_active_node_id_v1',
  THEME: 'studytree_theme_v1',
  EXPANDED_NODES: 'studytree_expanded_nodes_v1',
};

export function useStudyTree() {
  // 1. 테마 상태
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // 2. 인증 상태 & 클라우드 동기화 상태
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'local'>('local');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 3. 노트북 목록 상태
  const [notebooks, setNotebooks] = useState<Notebook[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTEBOOKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load notebooks from localStorage:', e);
    }
    return defaultNotebooks;
  });

  // 4. 활성 노트북 ID
  const [activeNotebookId, setActiveNotebookId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_NOTEBOOK_ID);
    if (saved && notebooks.some((n) => n.id === saved)) {
      return saved;
    }
    return notebooks[0]?.id || 'notebook-korean-history';
  });

  // 5. 활성 노트북 객체
  const activeNotebook = useMemo(() => {
    return notebooks.find((n) => n.id === activeNotebookId) || notebooks[0];
  }, [notebooks, activeNotebookId]);

  // 6. 활성 노드 ID
  const [activeNodeId, setActiveNodeId] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_NODE_ID);
    if (saved && activeNotebook) {
      const found = findNodeById(activeNotebook.nodes, saved);
      if (found) return saved;
    }
    return activeNotebook?.nodes[0]?.id || null;
  });

  // 7. 노드 펼침/접힘 상태
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXPANDED_NODES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return new Set(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load expanded nodes:', e);
    }
    if (activeNotebook) {
      const ids: string[] = [];
      activeNotebook.nodes.forEach((n) => {
        ids.push(n.id);
        n.children.forEach((c) => ids.push(c.id));
      });
      return new Set(ids);
    }
    return new Set<string>();
  });

  // 8. 실시간 검색어
  const [searchQuery, setSearchQuery] = useState<string>('');

  // LocalStorage 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTEBOOKS, JSON.stringify(notebooks));
  }, [notebooks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_NOTEBOOK_ID, activeNotebookId);
  }, [activeNotebookId]);

  useEffect(() => {
    if (activeNodeId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_NODE_ID, activeNodeId);
    }
  }, [activeNodeId]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.EXPANDED_NODES,
      JSON.stringify(Array.from(expandedNodeIds))
    );
  }, [expandedNodeIds]);

  // 9. Firebase Auth 구독 및 클라우드 데이터 동기화
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        setSyncStatus('syncing');
        try {
          const cloudNotebooks = await loadUserNotebooks(user.uid);
          if (cloudNotebooks.length > 0) {
            setNotebooks(cloudNotebooks);
            if (!cloudNotebooks.some((n) => n.id === activeNotebookId)) {
              setActiveNotebookId(cloudNotebooks[0].id);
              setActiveNodeId(cloudNotebooks[0].nodes[0]?.id || null);
            }
          } else {
            // 첫 로그인 사용자: 로컬의 샘플 데이터를 클라우드에 업로드
            await saveAllUserNotebooks(user.uid, notebooks);
          }
          setSyncStatus('synced');
        } catch (err) {
          console.warn('Cloud sync note: Firestore might need initial activation in console', err);
          setSyncStatus('local');
        }
      } else {
        setSyncStatus('local');
      }
    });

    return () => unsubscribe();
  }, []);

  // 클라우드 자동 저장 디바운스 타이머
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncActiveNotebookToCloud = useCallback(
    (targetNotebook: Notebook) => {
      if (!currentUser) return;
      setSyncStatus('syncing');

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(async () => {
        try {
          await saveUserNotebook(currentUser.uid, targetNotebook);
          setSyncStatus('synced');
        } catch (err) {
          console.error('Failed to sync notebook to cloud:', err);
          setSyncStatus('local');
        }
      }, 800);
    },
    [currentUser]
  );

  // 노트북 전환 시
  const selectNotebook = useCallback((notebookId: string) => {
    setActiveNotebookId(notebookId);
    const target = notebooks.find((n) => n.id === notebookId);
    if (target && target.nodes.length > 0) {
      setActiveNodeId(target.nodes[0].id);
      setExpandedNodeIds((prev) => {
        const next = new Set(prev);
        next.add(target.nodes[0].id);
        target.nodes[0].children.forEach((c) => next.add(c.id));
        return next;
      });
    } else {
      setActiveNodeId(null);
    }
  }, [notebooks]);

  // 검색 결과
  const searchResults = useMemo(() => {
    if (!activeNotebook) return { matchingIds: new Set<string>(), ancestorIds: new Set<string>() };
    return searchTree(activeNotebook.nodes, searchQuery);
  }, [activeNotebook, searchQuery]);

  useEffect(() => {
    if (searchQuery.trim().length > 0 && searchResults.ancestorIds.size > 0) {
      setExpandedNodeIds((prev) => {
        const next = new Set(prev);
        searchResults.ancestorIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [searchQuery, searchResults]);

  // 트리 통계
  const stats = useMemo(() => {
    if (!activeNotebook) {
      return { total: 0, mastered: 0, learning: 0, notStarted: 0, starred: 0, progressPercent: 0 };
    }
    return calculateTreeStats(activeNotebook.nodes);
  }, [activeNotebook]);

  // 활성 노드 객체
  const activeNode = useMemo(() => {
    if (!activeNotebook || !activeNodeId) return null;
    return findNodeById(activeNotebook.nodes, activeNodeId);
  }, [activeNotebook, activeNodeId]);

  // 노드 업데이트 헬퍼
  const updateActiveNotebookNodes = useCallback(
    (updater: (nodes: StudyNode[]) => StudyNode[]) => {
      setNotebooks((prev) =>
        prev.map((nb) => {
          if (nb.id === activeNotebookId) {
            const updated: Notebook = {
              ...nb,
              nodes: updater(nb.nodes),
              updatedAt: new Date().toISOString(),
            };
            syncActiveNotebookToCloud(updated);
            return updated;
          }
          return nb;
        })
      );
    },
    [activeNotebookId, syncActiveNotebookToCloud]
  );

  // 펼침 토글
  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // 전체 펼치기 / 접기
  const expandAll = useCallback(() => {
    if (!activeNotebook) return;
    const allIds = getAllNodeIds(activeNotebook.nodes);
    setExpandedNodeIds(new Set(allIds));
  }, [activeNotebook]);

  const collapseAll = useCallback(() => {
    setExpandedNodeIds(new Set());
  }, []);

  // 필드 업데이트
  const updateNode = useCallback(
    (nodeId: string, fields: Partial<StudyNode>) => {
      updateActiveNotebookNodes((nodes) =>
        updateNodeInTree(nodes, nodeId, (node) => ({
          ...node,
          ...fields,
        }))
      );
    },
    [updateActiveNotebookNodes]
  );

  // 학습 상태 변경
  const setNodeStatus = useCallback(
    (nodeId: string, status: LearningStatus) => {
      updateNode(nodeId, { status });
      if (status === 'mastered') {
        try {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.7 },
            colors: ['#10b981', '#6366f1', '#f59e0b', '#3b82f6'],
          });
        } catch {}
      }
    },
    [updateNode]
  );

  // 별표 토글
  const toggleNodeStar = useCallback(
    (nodeId: string) => {
      const current = activeNode?.id === nodeId ? activeNode : findNodeById(activeNotebook?.nodes || [], nodeId);
      if (current) {
        updateNode(nodeId, { starred: !current.starred });
      }
    },
    [activeNode, activeNotebook, updateNode]
  );

  // 자식 노드 추가
  const addChildNode = useCallback(
    (parentId: string) => {
      const newNode: StudyNode = {
        id: generateNodeId(),
        title: '새 세부 항목',
        summary: '',
        notes: '',
        status: 'not_started',
        starred: false,
        children: [],
        createdAt: new Date().toISOString(),
      };

      updateActiveNotebookNodes((nodes) => insertChildNode(nodes, parentId, newNode));
      setExpandedNodeIds((prev) => new Set(prev).add(parentId));
      setActiveNodeId(newNode.id);
      return newNode.id;
    },
    [updateActiveNotebookNodes]
  );

  // 형제 노드 추가
  const addSiblingNode = useCallback(
    (targetId: string) => {
      const newNode: StudyNode = {
        id: generateNodeId(),
        title: '새 학습 항목',
        summary: '',
        notes: '',
        status: 'not_started',
        starred: false,
        children: [],
        createdAt: new Date().toISOString(),
      };

      updateActiveNotebookNodes((nodes) => insertSiblingNode(nodes, targetId, newNode, true));
      setActiveNodeId(newNode.id);
      return newNode.id;
    },
    [updateActiveNotebookNodes]
  );

  // 루트 대단원 노드 추가
  const addRootNode = useCallback(() => {
    const newNode: StudyNode = {
      id: generateNodeId(),
      title: '새 대단원',
      summary: '',
      notes: '',
      status: 'not_started',
      starred: false,
      children: [],
      createdAt: new Date().toISOString(),
    };

    updateActiveNotebookNodes((nodes) => [...nodes, newNode]);
    setActiveNodeId(newNode.id);
  }, [updateActiveNotebookNodes]);

  // 이동, 들여쓰기, 내어쓰기
  const moveNode = useCallback(
    (nodeId: string, direction: 'up' | 'down') => {
      updateActiveNotebookNodes((nodes) => moveNodeOrder(nodes, nodeId, direction));
    },
    [updateActiveNotebookNodes]
  );

  const indent = useCallback(
    (nodeId: string) => {
      updateActiveNotebookNodes((nodes) => {
        const { newNodes, success } = indentNode(nodes, nodeId);
        return success ? newNodes : nodes;
      });
    },
    [updateActiveNotebookNodes]
  );

  const outdent = useCallback(
    (nodeId: string) => {
      updateActiveNotebookNodes((nodes) => {
        const { newNodes, success } = outdentNode(nodes, nodeId);
        return success ? newNodes : nodes;
      });
    },
    [updateActiveNotebookNodes]
  );

  // 노드 삭제
  const deleteNode = useCallback(
    (nodeId: string) => {
      if (!activeNotebook) return;
      updateActiveNotebookNodes((nodes) => deleteNodeFromTree(nodes, nodeId));
      if (activeNodeId === nodeId) {
        setTimeout(() => {
          setActiveNotebookId((currNbId) => {
            const nb = notebooks.find((n) => n.id === currNbId);
            if (nb && nb.nodes.length > 0) {
              const remaining = deleteNodeFromTree(nb.nodes, nodeId);
              setActiveNodeId(remaining.length > 0 ? remaining[0].id : null);
            }
            return currNbId;
          });
        }, 0);
      }
    },
    [activeNotebook, activeNodeId, notebooks, updateActiveNotebookNodes]
  );

  // 노트북 추가
  const addNotebook = useCallback((title: string) => {
    const cleanTitle = title.trim() || '새 스터디 노트북';
    const newNb: Notebook = {
      id: 'notebook-' + Date.now().toString(36),
      title: cleanTitle,
      category: 'general',
      description: '새로 생성된 지식 트리 학습장',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [
        {
          id: generateNodeId(),
          title: 'I. 시작하기 (대단원)',
          summary: '이 단원의 핵심 주제를 입력하세요',
          notes: '세부 학습 노트를 작성하세요. 마크다운 형식도 지원합니다.',
          status: 'not_started',
          starred: false,
          children: [
            {
              id: generateNodeId(),
              title: '1. 첫 번째 세부 주제',
              summary: '한 줄 요약',
              notes: '작용기전, 인과관계, 사건의 전개 과정 등',
              status: 'not_started',
              starred: false,
              children: [],
            },
          ],
        },
      ],
    };

    setNotebooks((prev) => [...prev, newNb]);
    setActiveNotebookId(newNb.id);
    setActiveNodeId(newNb.nodes[0].id);
    setExpandedNodeIds(new Set([newNb.nodes[0].id]));
    syncActiveNotebookToCloud(newNb);
  }, [syncActiveNotebookToCloud]);

  // PDF 변환 데이터로 새 노트북 생성 및 즉시 활성화
  const importNotebookFromPdf = useCallback(
    (data: { title: string; description?: string; nodes: StudyNode[] }) => {
      const newNb: Notebook = {
        id: 'notebook-' + Date.now().toString(36),
        title: data.title.trim() || '새 스터디 노트북',
        category: 'general',
        description: data.description || 'PDF에서 변환된 지식 트리',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: data.nodes,
      };

      setNotebooks((prev) => {
        // 기존에 아무런 단원도 없는 빈 노트북 1개만 남아있다면 교체, 아니면 추가
        if (prev.length === 1 && prev[0].nodes.length === 0 && prev[0].title === '새 노트북') {
          return [newNb];
        }
        return [...prev, newNb];
      });

      setActiveNotebookId(newNb.id);
      if (newNb.nodes.length > 0) {
        setActiveNodeId(newNb.nodes[0].id);
        setExpandedNodeIds(new Set(newNb.nodes.map((n) => n.id)));
      } else {
        setActiveNodeId(null);
      }
      syncActiveNotebookToCloud(newNb);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    },
    [syncActiveNotebookToCloud]
  );

  // 노트북 이름 변경
  const renameNotebook = useCallback(
    (notebookId: string, newTitle: string) => {
      const cleanTitle = newTitle.trim();
      if (!cleanTitle) return;
      setNotebooks((prev) =>
        prev.map((nb) => {
          if (nb.id === notebookId) {
            const updated = { ...nb, title: cleanTitle, updatedAt: new Date().toISOString() };
            syncActiveNotebookToCloud(updated);
            return updated;
          }
          return nb;
        })
      );
    },
    [syncActiveNotebookToCloud]
  );

  // 노트북 삭제
  const deleteNotebook = useCallback(
    async (notebookId: string) => {
      let createdFreshNb: Notebook | null = null;
      setNotebooks((prev) => {
        const remaining = prev.filter((nb) => nb.id !== notebookId);
        if (remaining.length === 0) {
          const freshNb: Notebook = {
            id: 'notebook-' + Date.now().toString(36),
            title: '새 노트북',
            category: 'general',
            description: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            nodes: [],
          };
          createdFreshNb = freshNb;
          setActiveNotebookId(freshNb.id);
          setActiveNodeId(null);
          setExpandedNodeIds(new Set());
          return [freshNb];
        }

        if (activeNotebookId === notebookId) {
          setActiveNotebookId(remaining[0].id);
          setActiveNodeId(remaining[0].nodes[0]?.id || null);
          setExpandedNodeIds(new Set(remaining[0].nodes.map((n) => n.id)));
        }
        return remaining;
      });

      if (currentUser) {
        try {
          await deleteUserNotebook(currentUser.uid, notebookId);
          if (createdFreshNb) {
            await saveUserNotebook(currentUser.uid, createdFreshNb);
          }
        } catch (e) {
          console.error(e);
        }
      }
    },
    [activeNotebookId, currentUser]
  );

  // 백업 내보내기/불러오기/샘플 초기화
  const exportJSON = useCallback(() => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(notebooks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `StudyTree_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [notebooks]);

  const importJSON = useCallback(
    async (jsonData: string) => {
      try {
        const parsed = JSON.parse(jsonData);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].nodes) {
          setNotebooks(parsed);
          setActiveNotebookId(parsed[0].id);
          setActiveNodeId(parsed[0].nodes[0]?.id || null);
          const ids: string[] = [];
          parsed[0].nodes.forEach((n: StudyNode) => {
            ids.push(n.id);
            n.children?.forEach((c: StudyNode) => ids.push(c.id));
          });
          setExpandedNodeIds(new Set(ids));
          if (currentUser) {
            await saveAllUserNotebooks(currentUser.uid, parsed);
          }
          alert('노트북 데이터를 성공적으로 불러왔습니다!');
        } else {
          alert('올바른 StudyTree 백업 JSON 파일 형식이 아닙니다.');
        }
      } catch (e) {
        alert('JSON 파싱 오류: ' + (e as Error).message);
      }
    },
    [currentUser]
  );

  const resetToSampleData = useCallback(async () => {
    if (confirm('모든 데이터를 초기 샘플로 되돌리시겠습니까? 현재 작성 중인 내용은 초기화됩니다.')) {
      setNotebooks(defaultNotebooks);
      setActiveNotebookId(defaultNotebooks[0].id);
      setActiveNodeId(defaultNotebooks[0].nodes[0].id);
      const ids: string[] = [];
      defaultNotebooks[0].nodes.forEach((n) => {
        ids.push(n.id);
        n.children.forEach((c) => ids.push(c.id));
      });
      setExpandedNodeIds(new Set(ids));
      if (currentUser) {
        await saveAllUserNotebooks(currentUser.uid, defaultNotebooks);
      }
    }
  }, [currentUser]);

  // 로그아웃
  const handleLogout = useCallback(async () => {
    await logOut();
  }, []);

  return {
    theme,
    toggleTheme,
    currentUser,
    authLoading,
    syncStatus,
    isAuthModalOpen,
    openAuthModal: () => setIsAuthModalOpen(true),
    closeAuthModal: () => setIsAuthModalOpen(false),
    handleLogout,
    notebooks,
    activeNotebook,
    activeNotebookId,
    activeNode,
    activeNodeId,
    expandedNodeIds,
    searchQuery,
    setSearchQuery,
    searchResults,
    stats,
    selectNotebook,
    addNotebook,
    importNotebookFromPdf,
    renameNotebook,
    deleteNotebook,
    setActiveNodeId,
    toggleExpand,
    expandAll,
    collapseAll,
    updateNode,
    setNodeStatus,
    toggleNodeStar,
    addChildNode,
    addSiblingNode,
    addRootNode,
    moveNode,
    indent,
    outdent,
    deleteNode,
    exportJSON,
    importJSON,
    resetToSampleData,
  };
}
