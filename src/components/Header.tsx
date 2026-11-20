import React, { useState, useRef } from 'react';
import {
  FolderPlus,
  Edit3,
  Trash2,
  Maximize2,
  Minimize2,
  Search,
  X,
  Download,
  Upload,
  RotateCcw,
  Sun,
  Moon,
  ChevronDown,
  GitBranch,
  Cloud,
  CloudOff,
  Loader2,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import type { Notebook } from '../types';
import type { User } from 'firebase/auth';
import { APP_VERSION } from '../constants/version';

interface HeaderProps {
  notebooks: Notebook[];
  activeNotebookId: string;
  onSelectNotebook: (id: string) => void;
  onAddNotebook: (title: string) => void;
  onRenameNotebook: (id: string, newTitle: string) => void;
  onDeleteNotebook: (id: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  matchCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onExportJSON: () => void;
  onImportJSON: (json: string) => void;
  onResetSamples: () => void;
  isMobileTreeOpen?: boolean;
  onToggleMobileTree: () => void;
  currentUser: User | null;
  syncStatus: 'synced' | 'syncing' | 'local';
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  notebooks,
  activeNotebookId,
  onSelectNotebook,
  onAddNotebook,
  onRenameNotebook,
  onDeleteNotebook,
  onExpandAll,
  onCollapseAll,
  searchQuery,
  onSearchChange,
  matchCount,
  theme,
  onToggleTheme,
  onExportJSON,
  onImportJSON,
  onResetSamples,
  isMobileTreeOpen,
  onToggleMobileTree,
  currentUser,
  syncStatus,
  onOpenAuthModal,
  onLogout,
}) => {
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isNewNotebookOpen, setIsNewNotebookOpen] = useState(false);
  const [newNotebookTitle, setNewNotebookTitle] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeNotebook = notebooks.find((n) => n.id === activeNotebookId) || notebooks[0];

  const handleOpenRename = () => {
    if (activeNotebook) {
      setRenameValue(activeNotebook.title);
      setIsRenameOpen(true);
    }
  };

  const handleConfirmRename = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (renameValue.trim() && activeNotebook) {
      onRenameNotebook(activeNotebook.id, renameValue.trim());
      setIsRenameOpen(false);
    }
  };

  const handleConfirmNewNotebook = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (newNotebookTitle.trim()) {
      onAddNotebook(newNotebookTitle.trim());
      setNewNotebookTitle('');
      setIsNewNotebookOpen(false);
    }
  };

  const handleDeleteNotebook = () => {
    if (!activeNotebook) return;
    if (confirm(`'${activeNotebook.title}' 노트북을 삭제하시겠습니까?`)) {
      onDeleteNotebook(activeNotebook.id);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          onImportJSON(text);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  };

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 md:px-4 flex items-center justify-between gap-2 select-none z-30 shrink-0">
      {/* 1. 좌측 로고 & 노트북 셀렉터 */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {/* 모바일 트리 토글 버튼 */}
        <button
          onClick={onToggleMobileTree}
          className={`md:hidden p-1.5 rounded-lg transition ${
            isMobileTreeOpen
              ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="트리 탐색기 열기/닫기"
        >
          <GitBranch className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </button>

        {/* 로고 */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200 dark:shadow-none">
            <GitBranch className="w-4 h-4 transform rotate-90" />
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
              Study<span className="text-indigo-600 dark:text-indigo-400">Tree</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-semibold">
              {APP_VERSION}
            </span>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 hidden md:block" />

        {/* 노트북 선택 드롭다운 & 제어 버튼 */}
        <div className="flex items-center gap-1 min-w-0">
          <div className="relative">
            <select
              value={activeNotebookId}
              onChange={(e) => onSelectNotebook(e.target.value)}
              className="appearance-none bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-xs md:text-sm pl-2.5 pr-7 py-1.5 rounded-lg border border-transparent focus:border-indigo-500 focus:outline-none transition cursor-pointer max-w-[130px] sm:max-w-[180px] md:max-w-[220px] truncate"
            >
              {notebooks.map((nb) => (
                <option key={nb.id} value={nb.id}>
                  {nb.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => setIsNewNotebookOpen(true)}
            title="새 노트북 추가"
            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenRename}
            title="현재 노트북 이름 변경"
            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          {notebooks.length > 1 && (
            <button
              onClick={handleDeleteNotebook}
              title="현재 노트북 삭제"
              className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. 중앙 트리 일괄 제어 & 실시간 검색창 */}
      <div className="flex items-center gap-2 flex-1 max-w-md mx-2 justify-end md:justify-center">
        {/* 전체 펼치기 / 접기 버튼 */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
          <button
            onClick={onExpandAll}
            className="flex items-center gap-1 text-xs px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded transition shadow-none hover:shadow-xs"
            title="모든 계층 펼치기"
          >
            <Maximize2 className="w-3 h-3 text-indigo-500" />
            <span>펼치기</span>
          </button>
          <button
            onClick={onCollapseAll}
            className="flex items-center gap-1 text-xs px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded transition shadow-none hover:shadow-xs"
            title="모든 계층 접기"
          >
            <Minimize2 className="w-3 h-3 text-indigo-500" />
            <span>접기</span>
          </button>
        </div>

        {/* 검색창 */}
        <div className="relative w-full max-w-[140px] sm:max-w-[190px] md:max-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="제목, 요약, 노트 검색..."
            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {searchQuery && matchCount > 0 && (
            <span className="absolute right-7 top-1/2 -translate-y-1/2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              {matchCount}건
            </span>
          )}
        </div>
      </div>

      {/* 3. 우측 유틸리티 & 인증 버튼 */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* 클라우드 동기화 뱃지 (상태 표시) */}
        <div className="hidden sm:flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          {syncStatus === 'syncing' ? (
            <>
              <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />
              <span className="hidden md:inline">동기화 중</span>
            </>
          ) : syncStatus === 'synced' ? (
            <>
              <Cloud className="w-3 h-3 text-emerald-500" />
              <span className="hidden md:inline text-emerald-600 dark:text-emerald-400 font-medium">동기화됨</span>
            </>
          ) : (
            <>
              <CloudOff className="w-3 h-3 text-slate-400" />
              <span className="hidden md:inline">로컬 저장</span>
            </>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />

        <button
          onClick={onExportJSON}
          className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
          title="JSON 백업 파일 내보내기"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
          title="JSON 파일 불러오기"
        >
          <Upload className="w-4 h-4" />
        </button>

        <button
          onClick={onResetSamples}
          className="p-1.5 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
          title="샘플 데이터 복원/초기화"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* 라이트/다크 모드 토글 */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
          title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5" />

        {/* 4. 로그인 / 사용자 프로필 */}
        {currentUser ? (
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold">
                {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : (currentUser.email?.[0].toUpperCase() || 'U')}
              </div>
              <span className="text-xs font-medium max-w-[80px] sm:max-w-[110px] truncate hidden sm:inline text-slate-800 dark:text-slate-200">
                {currentUser.displayName || currentUser.email?.split('@')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isUserMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {currentUser.displayName || '회원'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {currentUser.email}
                  </p>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full px-3.5 py-2 text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>로그아웃</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-xs"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">로그인 / 회원가입</span>
            <span className="sm:hidden">로그인</span>
          </button>
        )}
      </div>

      {/* 새 노트북 모달 */}
      {isNewNotebookOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleConfirmNewNotebook}
            className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 w-full max-w-sm space-y-4"
          >
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              새 학습 노트북 만들기
            </h3>
            <input
              type="text"
              autoFocus
              value={newNotebookTitle}
              onChange={(e) => setNewNotebookTitle(e.target.value)}
              placeholder="예: 공무원 행정법 핵심 정리"
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewNotebookOpen(false)}
                className="text-xs px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                취소
              </button>
              <button
                type="submit"
                className="text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition shadow-sm"
              >
                생성하기
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 노트북 이름 변경 모달 */}
      {isRenameOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleConfirmRename}
            className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 w-full max-w-sm space-y-4"
          >
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              노트북 이름 변경
            </h3>
            <input
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRenameOpen(false)}
                className="text-xs px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                취소
              </button>
              <button
                type="submit"
                className="text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition shadow-sm"
              >
                저장
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
};
