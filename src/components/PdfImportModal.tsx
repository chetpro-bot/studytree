import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  FileText,
  Upload,
  Sparkles,
  Zap,
  Key,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';
import {
  extractTextFromPdf,
  convertPdfWithGemini,
  parsePdfWithRuleEngine,
} from '../utils/pdfParser';
import type { StudyNode } from '../types';

interface PdfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: { title: string; description?: string; nodes: StudyNode[] }) => void;
}

const STORAGE_KEY_GEMINI_KEY = 'studytree_gemini_api_key';

export const PdfImportModal: React.FC<PdfImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [mode, setMode] = useState<'ai' | 'local'>('ai');
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.0-flash');

  // 진행 상태
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [stepMessage, setStepMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 변환 완료 후 미리보기 데이터
  const [previewData, setPreviewData] = useState<{
    title: string;
    description: string;
    nodes: StudyNode[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 로컬스토리지에서 기존 저장된 API 키 불러오기
  useEffect(() => {
    const savedKey = localStorage.getItem(STORAGE_KEY_GEMINI_KEY);
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  // 분석 진행 중 경과 시간 타이머
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isProcessing) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isProcessing]);

  if (!isOpen) return null;

  // 파일 선택 및 기본 텍스트 추출
  const handleFileSelected = async (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
      alert('PDF 파일(.pdf)만 업로드할 수 있습니다.');
      return;
    }

    setFile(selectedFile);
    setErrorMessage(null);
    setPreviewData(null);
    setIsProcessing(true);
    setStepMessage('PDF 텍스트 및 페이지 정보 분석 중...');

    try {
      const extracted = await extractTextFromPdf(selectedFile);
      setPageCount(extracted.pageCount);
      setExtractedText(extracted.fullText);
      setIsProcessing(false);
      setStepMessage('');
    } catch (err: unknown) {
      console.error(err);
      setIsProcessing(false);
      setErrorMessage(
        'PDF 파일을 읽는 중 오류가 발생했습니다. 암호가 걸려있지 않은 정상적인 PDF인지 확인해주세요.'
      );
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelected(droppedFile);
    }
  };

  // 변환 실행
  const handleStartConversion = async () => {
    if (!file || !extractedText) {
      setErrorMessage('변환할 PDF 파일이 선택되지 않았습니다.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      if (mode === 'ai') {
        const trimmedKey = apiKey.trim();
        if (!trimmedKey) {
          setIsProcessing(false);
          setErrorMessage('Google Gemini API Key를 입력해주세요. (무료 발급 링크 참조)');
          return;
        }

        // API Key 로컬스토리지에 저장
        localStorage.setItem(STORAGE_KEY_GEMINI_KEY, trimmedKey);

        setStepMessage('Gemini AI가 PDF의 핵심 지식 구조와 단원을 심층 분석 중...');
        const result = await convertPdfWithGemini(
          extractedText,
          file.name,
          trimmedKey,
          selectedModel
        );

        setPreviewData({
          title: result.notebookTitle,
          description: result.description,
          nodes: result.nodes,
        });
      } else {
        setStepMessage('PDF 단원 목차 및 헤더 패턴 분석 중...');
        // 약간의 딜레이로 진행감 제공
        await new Promise((r) => setTimeout(r, 400));
        const result = parsePdfWithRuleEngine(extractedText, file.name);

        setPreviewData({
          title: result.notebookTitle,
          description: result.description,
          nodes: result.nodes,
        });
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : '변환 중 알 수 없는 오류가 발생했습니다.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
      setStepMessage('');
    }
  };

  // 최종 학습장 생성
  const handleConfirmImport = () => {
    if (!previewData) return;
    onImport(previewData);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setPageCount(null);
    setExtractedText('');
    setPreviewData(null);
    setErrorMessage(null);
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        {/* 모달 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-850/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                PDF 학습 자료를 지식 트리로 변환
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                복잡한 수험서·강의자료 PDF를 핵심 요약과 계층 트리로 자동 구조화합니다
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 모달 본문 (스크롤) */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* 에러 메시지 알림 */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
              {mode === 'ai' && extractedText && (
                <div className="pt-2.5 border-t border-rose-200/80 dark:border-rose-900/60 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    구글 서버 대기 없이 지금 즉시 변환하고 싶으신가요?
                  </span>
                  <button
                    onClick={() => {
                      setMode('local');
                      setErrorMessage(null);
                      const result = parsePdfWithRuleEngine(extractedText, file?.name || '문서');
                      setPreviewData({
                        title: result.notebookTitle,
                        description: result.description,
                        nodes: result.nodes,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>로컬 목차 변환으로 즉시 생성</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 1단계: 변환 완료 미리보기 화면 */}
          {previewData ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-sm block">지식 트리 구조화 완료!</span>
                  총 {previewData.nodes.length}개 대단원 (전체{' '}
                  {previewData.nodes.reduce((acc, n) => acc + 1 + n.children.length, 0)}개 단원)이
                  체계적으로 생성되었습니다.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  생성될 스터디 노트북 제목
                </label>
                <input
                  type="text"
                  value={previewData.title}
                  onChange={(e) =>
                    setPreviewData({ ...previewData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  구조화된 단원 미리보기
                </label>
                <div className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl max-h-56 overflow-y-auto space-y-2 text-xs">
                  {previewData.nodes.map((n, idx) => (
                    <div key={n.id || idx} className="space-y-1">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-indigo-500" />
                        <span>{n.title}</span>
                        {n.children.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                            하위 {n.children.length}개
                          </span>
                        )}
                      </div>
                      {n.summary && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-4.5 line-clamp-2">
                          {n.summary}
                        </p>
                      )}
                      {n.children.length > 0 && (
                        <div className="pl-4.5 space-y-1 border-l border-slate-200 dark:border-slate-700 ml-1.5 mt-1">
                          {n.children.map((child, cIdx) => (
                            <div key={child.id || cIdx} className="text-slate-700 dark:text-slate-300 pl-2">
                              • {child.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 1. PDF 파일 업로드 영역 */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelected(f);
                  }}
                  accept=".pdf,application/pdf"
                  className="hidden"
                />

                {!file ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 rounded-2xl p-7 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                        PDF 학습 자료를 드래그하거나 클릭하여 선택
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        강의 교안, 수험 요약집, 전공 서적 등 (.pdf 파일 지원)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                          {pageCount !== null && ` • 총 ${pageCount}페이지`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        setExtractedText('');
                        setPageCount(null);
                      }}
                      className="text-xs text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-md transition"
                    >
                      변경
                    </button>
                  </div>
                )}
              </div>

              {/* 2. 변환 방식 선택 */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  변환 엔진 선택
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* AI 스마트 변환 */}
                  <div
                    onClick={() => setMode('ai')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                      mode === 'ai'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-indigo-500" />
                          AI 스마트 구조화
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-600 text-white">
                          추천
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        Gemini AI가 핵심 요약과 상세 노트를 학습에 최적화된 계층형 트리로 생성
                      </p>
                    </div>
                  </div>

                  {/* 로컬 목차 추출 */}
                  <div
                    onClick={() => setMode('local')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                      mode === 'local'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-amber-500" />
                          빠른 로컬 목차 변환
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          API 불필요
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        PDF 내 대단원(I, 1 등) 패턴을 브라우저에서 1초 만에 직접 추출
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. AI 모드 선택 시: API Key 입력 영역 */}
              {mode === 'ai' && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-indigo-500" />
                      Google Gemini API Key
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      무료 API 키 발급받기
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIzaSy... (API Key는 브라우저 로컬에만 안전하게 저장됩니다)"
                      className="w-full text-xs px-3 py-2 pr-9 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span>AI 모델:</span>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[11px] focus:outline-none cursor-pointer"
                      >
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash (빠르고 안정적 / 추천)</option>
                        <option value="gemini-3.8-flash">Gemini 3.8 Flash (최신 모델)</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                      </select>
                    </div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Google 무료 티어 지원
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 모달 푸터 액션 버튼 */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-850/60">
          {previewData ? (
            <>
              <button
                onClick={() => setPreviewData(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition"
              >
                다시 설정
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-md shadow-indigo-200 dark:shadow-none flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>지식 트리에 추가하고 학습 시작</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
              >
                닫기
              </button>
              <div className="flex items-center gap-2">
                {isProcessing && mode === 'ai' && extractedText && (
                  <button
                    onClick={() => {
                      setIsProcessing(false);
                      setMode('local');
                      const result = parsePdfWithRuleEngine(extractedText, file?.name || '문서');
                      setPreviewData({
                        title: result.notebookTitle,
                        description: result.description,
                        nodes: result.nodes,
                      });
                    }}
                    className="px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 cursor-pointer animate-pulse"
                    title="구글 AI 응답 대기를 취소하고 0.1초 만에 즉시 로컬로 변환합니다"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>대기 취소 및 로컬로 즉시 완료</span>
                  </button>
                )}
                <button
                  onClick={handleStartConversion}
                  disabled={!file || isProcessing}
                  className={`px-5 py-2.5 text-xs font-semibold rounded-lg transition flex items-center gap-2 shadow-sm ${
                    !file || isProcessing
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        {stepMessage || '처리 중...'}
                        {elapsedSeconds > 0 && ` (${elapsedSeconds}초 경과)`}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>지식 트리로 변환 시작</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
