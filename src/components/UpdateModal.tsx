import React from 'react';
import { X, Sparkles, CheckCircle2, ArrowRight, RotateCw, RefreshCw } from 'lucide-react';
import { APP_VERSION } from '../constants/version';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasUpdate: boolean;
  latestVersion: string | null;
  releaseNotes: string | null;
  statusMessage: string | null;
  onPerformUpdate: () => void;
  isChecking: boolean;
  onCheckAgain: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  hasUpdate,
  latestVersion,
  releaseNotes,
  statusMessage,
  onPerformUpdate,
  isChecking,
  onCheckAgain,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* 모달 헤더 바 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            {hasUpdate ? (
              <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
              {hasUpdate ? '새로운 업데이트 발견' : '앱 버전 확인'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 본문 콘텐츠 */}
        <div className="p-5 space-y-4">
          {hasUpdate ? (
            <>
              {/* 버전 비교 배지 */}
              <div className="flex items-center justify-center gap-3 p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                <div className="text-center">
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">현재 버전</span>
                  <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">{APP_VERSION}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
                <div className="text-center">
                  <span className="block text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">최신 버전</span>
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{latestVersion}</span>
                </div>
              </div>

              {releaseNotes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                  <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">업데이트 내용:</p>
                  <p className="leading-relaxed">{releaseNotes}</p>
                </div>
              )}

              <p className="text-xs text-slate-600 dark:text-slate-300 text-center leading-relaxed">
                새로운 기능과 성능 개선이 준비되었습니다.<br />
                지금 즉시 최신 버전으로 업데이트하시겠습니까?
              </p>

              {/* 액션 버튼 */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 px-3 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  나중에
                </button>
                <button
                  type="button"
                  onClick={onPerformUpdate}
                  className="flex-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl transition shadow-md shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>지금 업데이트하기</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* 최신 상태 안내 */}
              <div className="text-center py-2 space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>최신 버전 ({APP_VERSION})</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                  {statusMessage || '현재 최신 버전의 StudyTree를 이용하고 있습니다.'}
                </p>
              </div>

              {/* 액션 버튼 */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onCheckAgain}
                  disabled={isChecking}
                  className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="서버에 새 배포본이 있는지 다시 확인"
                >
                  <RefreshCw className={`w-3 h-3 text-slate-500 ${isChecking ? 'animate-spin text-indigo-500' : ''}`} />
                  <span>{isChecking ? '확인 중...' : '다시 확인'}</span>
                </button>
                <button
                  type="button"
                  onClick={onPerformUpdate}
                  className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                  title="브라우저 캐시를 비우고 앱 새로고침"
                >
                  <RotateCw className="w-3 h-3 text-slate-500" />
                  <span>캐시 새로고침</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-medium text-xs rounded-xl transition cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
