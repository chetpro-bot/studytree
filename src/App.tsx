import { useState, useMemo } from 'react';
import { useStudyTree } from './hooks/useStudyTree';
import { useAppUpdate } from './hooks/useAppUpdate';
import { Header } from './components/Header';
import { TreeExplorer } from './components/TreeExplorer';
import { DetailEditor } from './components/DetailEditor';
import { AuthModal } from './components/AuthModal';
import { UpdateModal } from './components/UpdateModal';
import { getBreadcrumbs } from './utils/treeUtils';

export function App() {
  const {
    theme,
    toggleTheme,
    currentUser,
    syncStatus,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
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
    renameNotebook,
    deleteNotebook,
    setActiveNodeId,
    toggleExpand,
    expandAll,
    collapseAll,
    updateNode,
    addChildNode,
    addSiblingNode,
    addRootNode,
    moveNode,
    indent,
    outdent,
    deleteNode,
    exportJSON,
    importJSON,
  } = useStudyTree();

  const {
    isChecking: isCheckingUpdate,
    hasUpdate,
    latestVersion,
    releaseNotes,
    isModalOpen: isUpdateModalOpen,
    closeModal: closeUpdateModal,
    statusMessage: updateStatusMessage,
    checkForUpdate,
    performUpdate,
  } = useAppUpdate();

  const [isMobileTreeOpen, setIsMobileTreeOpen] = useState(false);

  const breadcrumbs = useMemo(() => {
    if (!activeNotebook || !activeNodeId) return [];
    return getBreadcrumbs(activeNotebook.nodes, activeNodeId);
  }, [activeNotebook, activeNodeId]);

  const handleSelectNode = (id: string) => {
    setActiveNodeId(id);
    if (window.innerWidth < 768) {
      setIsMobileTreeOpen(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans">
      {/* 1. 상단 툴바 헤더 */}
      <Header
        notebooks={notebooks}
        activeNotebookId={activeNotebookId}
        onSelectNotebook={selectNotebook}
        onAddNotebook={addNotebook}
        onRenameNotebook={renameNotebook}
        onDeleteNotebook={deleteNotebook}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        matchCount={searchResults.matchingIds.size}
        theme={theme}
        onToggleTheme={toggleTheme}
        onExportJSON={exportJSON}
        onImportJSON={importJSON}
        isMobileTreeOpen={isMobileTreeOpen}
        onToggleMobileTree={() => setIsMobileTreeOpen((prev) => !prev)}
        currentUser={currentUser}
        syncStatus={syncStatus}
        onOpenAuthModal={openAuthModal}
        onLogout={handleLogout}
        hasUpdate={hasUpdate}
        isCheckingUpdate={isCheckingUpdate}
        onCheckUpdate={() => checkForUpdate(true)}
      />

      {/* 2. 본문 좌우 2단 분할 워크스페이스 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 모바일 백드롭 */}
        {isMobileTreeOpen && (
          <div
            onClick={() => setIsMobileTreeOpen(false)}
            className="md:hidden fixed inset-0 bg-black/40 z-30 transition-opacity"
          />
        )}

        {/* 좌측 트리 탐색기 (420px) */}
        <div
          className={`
            fixed md:static inset-y-0 left-0 z-40 md:z-auto
            w-[85vw] sm:w-[380px] md:w-[400px] lg:w-[420px] shrink-0 h-full
            transform transition-transform duration-200 ease-in-out
            ${isMobileTreeOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          <TreeExplorer
            nodes={activeNotebook?.nodes || []}
            activeNodeId={activeNodeId}
            expandedNodeIds={expandedNodeIds}
            searchMatchingIds={searchResults.matchingIds}
            stats={stats}
            onSelectNode={handleSelectNode}
            onToggleExpand={toggleExpand}
            onAddChild={addChildNode}
            onAddSibling={addSiblingNode}
            onAddRootNode={addRootNode}
            onMoveNode={moveNode}
            onDeleteNode={deleteNode}
            onCheckUpdate={() => checkForUpdate(true)}
          />
        </div>

        {/* 우측 상세 학습 에디터 */}
        <div className="flex-1 h-full min-w-0 overflow-hidden">
          <DetailEditor
            node={activeNode}
            breadcrumbs={breadcrumbs}
            onSelectNode={setActiveNodeId}
            onUpdateNode={updateNode}
            onAddChild={addChildNode}
            onAddSibling={addSiblingNode}
            onIndent={indent}
            onOutdent={outdent}
          />
        </div>
      </div>

      {/* 3. 로그인 / 회원가입 모달 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
      />

      {/* 4. 앱 버전 및 업데이트 모달 */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={closeUpdateModal}
        hasUpdate={hasUpdate}
        latestVersion={latestVersion}
        releaseNotes={releaseNotes}
        statusMessage={updateStatusMessage}
        onPerformUpdate={performUpdate}
        isChecking={isCheckingUpdate}
        onCheckAgain={() => checkForUpdate(true)}
      />
    </div>
  );
}

export default App;
