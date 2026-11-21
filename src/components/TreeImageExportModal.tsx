import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Download,
  Printer,
  Image as ImageIcon,
  GitBranch,
  ListTree,
  RectangleVertical,
  RectangleHorizontal,
  Check,
} from 'lucide-react';
import type { Notebook } from '../types';
import {
  renderTreeToCanvas,
  downloadCanvasAsPng,
  printCanvasAsA4,
  type PaperOrientation,
  type ExportLayoutStyle,
} from '../utils/treeImageExporter';

interface TreeImageExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  notebook: Notebook | undefined;
}

export const TreeImageExportModal: React.FC<TreeImageExportModalProps> = ({
  isOpen,
  onClose,
  notebook,
}) => {
  const [orientation, setOrientation] = useState<PaperOrientation>('portrait');
  const [layout, setLayout] = useState<ExportLayoutStyle>('outline');
  const [includeSummary, setIncludeSummary] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 옵션 변경 또는 모달 열릴 때마다 고해상도 A4 캔버스 실시간 렌더링
  useEffect(() => {
    if (!isOpen || !notebook || !canvasRef.current) return;
    renderTreeToCanvas(canvasRef.current, notebook, {
      orientation,
      layout,
      includeSummary,
    });
  }, [isOpen, notebook, orientation, layout, includeSummary]);

  if (!isOpen || !notebook) return null;

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const safeTitle = (notebook.title || 'studytree')
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim();
    const orientLabel = orientation === 'portrait' ? 'A4세로' : 'A4가로';
    const layoutLabel = layout === 'mindmap' ? '마인드맵' : '목차형';
    downloadCanvasAsPng(canvasRef.current, `${safeTitle}_${orientLabel}_${layoutLabel}.png`);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  };

  const handlePrint = () => {
    if (!canvasRef.current) return;
    printCanvasAsA4(canvasRef.current, orientation, notebook.title || 'StudyTree');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        {/* 헤더 */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                지식 트리 A4 이미지 출력
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                A4 고해상도(200 DPI) 비율로 트리 구조를 이미지로 저장하거나 바로 인쇄할 수 있습니다
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 상단 컨트롤 바 */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* A4 방향 선택 */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setOrientation('portrait')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                  orientation === 'portrait'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <RectangleVertical className="w-3.5 h-3.5" />
                <span>A4 세로</span>
              </button>
              <button
                onClick={() => setOrientation('landscape')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                  orientation === 'landscape'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <RectangleHorizontal className="w-3.5 h-3.5" />
                <span>A4 가로</span>
              </button>
            </div>

            {/* 레이아웃 스타일 선택 */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setLayout('outline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                  layout === 'outline'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <ListTree className="w-3.5 h-3.5" />
                <span>목차 정리형</span>
              </button>
              <button
                onClick={() => setLayout('mindmap')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                  layout === 'mindmap'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>마인드맵 트리형</span>
              </button>
            </div>

            {/* 핵심 요약 포함 토글 */}
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <input
                type="checkbox"
                checked={includeSummary}
                onChange={(e) => setIncludeSummary(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span>핵심 요약 포함</span>
            </label>
          </div>

          {/* 해상도 안내 배지 */}
          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 hidden md:inline">
            {orientation === 'portrait' ? '210 × 297 mm (1654×2339px)' : '297 × 210 mm (2339×1654px)'}
          </span>
        </div>

        {/* 실시간 A4 미리보기 영역 */}
        <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 flex items-center justify-center min-h-[340px]">
          <div
            className="bg-white shadow-xl border border-slate-200/80 dark:border-slate-700 rounded-sm overflow-hidden flex items-center justify-center transition-all duration-200"
            style={{
              maxHeight: '62vh',
              maxWidth: '100%',
              aspectRatio: orientation === 'portrait' ? '210 / 297' : '297 / 210',
            }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain block"
            />
          </div>
        </div>

        {/* 푸터 출력 버튼 */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
          >
            닫기
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-500" />
              <span>A4 바로 인쇄</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>저장 완료!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>PNG 이미지 저장</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
