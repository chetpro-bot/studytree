import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { StudyNode } from '../types';
import { generateNodeId } from './treeUtils';

// 로컬 번들 Web Worker 사용 (CDN 장애/버전 불일치 방지 및 고속 추출)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export interface PdfLine {
  text: string;
  fontSize: number;
  isBold: boolean;
  pageNum: number;
}

export interface ExtractedPdfContent {
  fullText: string;
  lines: PdfLine[];
  bodyFontSize: number;
  pageCount: number;
  previewSnippet: string;
}

/**
 * PDF 파일로부터 Y좌표(줄바꿈), 폰트 크기, 굵기(Bold) 정보를 함께 고속 추출합니다.
 */
export async function extractTextFromPdf(file: File): Promise<ExtractedPdfContent> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  const allLines: PdfLine[] = [];
  const fontSizeCharCount = new Map<number, number>();
  let fullText = '';
  let previewSnippet = '';

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    let lastY: number | null = null;
    let currentLineText = '';
    let currentMaxFontSize = 0;
    let currentIsBold = false;
    const pageTextLines: string[] = [];

    const flushLine = () => {
      const trimmed = currentLineText.replace(/\s+/g, ' ').trim();
      if (trimmed) {
        const roundedSize = Math.round(currentMaxFontSize * 2) / 2 || 10;
        allLines.push({
          text: trimmed,
          fontSize: roundedSize,
          isBold: currentIsBold,
          pageNum,
        });
        pageTextLines.push(trimmed);
        fontSizeCharCount.set(
          roundedSize,
          (fontSizeCharCount.get(roundedSize) || 0) + trimmed.length
        );
      }
      currentLineText = '';
      currentMaxFontSize = 0;
      currentIsBold = false;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of textContent.items as any[]) {
      if (typeof item.str !== 'string') continue;
      const str = item.str;
      if (!str && !item.hasEOL) continue;

      const currentY = item.transform ? Math.round(item.transform[5]) : null;
      const fontSize =
        item.height && item.height > 0
          ? item.height
          : item.transform
            ? Math.hypot(item.transform[0] || 0, item.transform[1] || 0)
            : 10;
      const fontName = String(item.fontName || '').toLowerCase();
      const bold = /bold|black|heavy|semibold|demi|medi|700|800|900/.test(fontName);

      if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 3) {
        flushLine();
      }

      if (str) {
        if (currentLineText && !currentLineText.endsWith(' ') && !str.startsWith(' ')) {
          currentLineText += ' ';
        }
        currentLineText += str;
        if (fontSize > currentMaxFontSize) currentMaxFontSize = fontSize;
        if (bold) currentIsBold = true;
      }

      if (item.hasEOL) {
        flushLine();
      }

      if (currentY !== null) {
        lastY = currentY;
      }
    }

    flushLine();

    const pageText = pageTextLines.join('\n');
    if (pageText) {
      fullText += `[페이지 ${pageNum}]\n${pageText}\n\n`;
      if (!previewSnippet && pageText.length > 50) {
        previewSnippet = pageText.slice(0, 300);
      }
    }
  }

  // 문서 전체에서 가장 많이 쓰인 본문 폰트 크기(최빈값) 계산
  let bodyFontSize = 10;
  let maxChars = 0;
  for (const [size, count] of fontSizeCharCount.entries()) {
    if (count > maxChars) {
      maxChars = count;
      bodyFontSize = size;
    }
  }

  return {
    fullText,
    lines: allLines,
    bodyFontSize,
    pageCount,
    previewSnippet,
  };
}

interface RawAiNode {
  title?: string;
  summary?: string;
  notes?: string;
  children?: RawAiNode[];
}

interface RawAiResponse {
  notebookTitle?: string;
  description?: string;
  nodes?: RawAiNode[];
}

/**
 * Gemini AI를 호출하여 PDF 텍스트를 StudyTree 계층 구조로 변환합니다.
 * - 무한 재귀 원천 차단 (triedModels Set 기반 단순 반복)
 * - 30초 타임아웃 및 외부 취소(AbortSignal) 지원
 * - gemini-3.8-flash(thinkingLevel: low) 및 gemini-3.5-flash-lite 지원
 */
export async function convertPdfWithGemini(
  fullText: string,
  fileName: string,
  apiKey: string,
  preferredModel: string = 'gemini-3.8-flash',
  externalSignal?: AbortSignal
): Promise<{ notebookTitle: string; description: string; nodes: StudyNode[] }> {
  const prompt = `당신은 학생과 수험생을 위한 지식 구조화 전문 AI입니다.
아래 PDF 학습 자료를 핵심 위주로 신속하게 분석하여, 'StudyTree' 앱 규격의 계층형 트리 JSON으로 변환하세요.

[작성 지침]
1. 계층 구조: I. 대단원 -> 1. 중단원 -> 세부 개념의 2~3단계 트리 (전체 8~16개 핵심 노드로 깔끔하게 구조화)
2. 각 노드 필드:
   - title: 단원 번호 및 명확한 주제명 (예: "1. 약물 상호작용의 기본 원리", "3-4. 약물대사효소(CYP)")
   - summary: 시험 직전 복습용 핵심 요약 (핵심 키워드 위주 2줄 내외)
   - notes: 핵심 원리·기전·주의사항 요약 (3~5줄 내외의 깔끔한 텍스트)
   - children: 하위 단원 노드 배열 (없으면 [])
3. notebookTitle은 PDF 핵심 주제를 살려 간결하게 작성하세요.
4. 장황한 서술은 피하고 핵심 위주로 빠르고 정확하게 작성하세요.

[응답 JSON 스키마]
순수 JSON만 출력:
{
  "notebookTitle": "string",
  "description": "string",
  "nodes": [
    {
      "title": "string",
      "summary": "string",
      "notes": "string",
      "children": [
        {
          "title": "string",
          "summary": "string",
          "notes": "string",
          "children": []
        }
      ]
    }
  ]
}

[학습 자료 텍스트]:
${fullText.slice(0, 35000)}
`;

  // 시도할 모델 큐 (중복 및 무한루프 방지)
  const queue: string[] = [preferredModel];
  for (const fallback of ['gemini-3.5-flash-lite', 'gemini-3.8-flash']) {
    if (!queue.includes(fallback)) {
      queue.push(fallback);
    }
  }

  const triedModels = new Set<string>();
  let lastErrorMessage = 'Gemini AI 변환에 실패했습니다.';

  while (queue.length > 0) {
    const modelName = queue.shift()!;
    if (triedModels.has(modelName)) continue;
    triedModels.add(modelName);

    if (externalSignal?.aborted) {
      throw new Error('변환이 취소되었습니다.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generationConfig: Record<string, any> = {
      responseMimeType: 'application/json',
      maxOutputTokens: 3500,
    };

    if (modelName.includes('gemini-3.8')) {
      generationConfig.thinkingConfig = {
        thinkingLevel: 'low',
      };
    }

    // 30초 타임아웃 + 외부 취소 시그널 연동
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const onExternalAbort = () => controller.abort();
    externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig,
        }),
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);

      if (externalSignal?.aborted) {
        throw new Error('변환이 취소되었습니다.');
      }
      if (err instanceof Error && err.name === 'AbortError') {
        lastErrorMessage = `모델(${modelName}) 응답이 30초를 초과했습니다.`;
        continue; // 다음 대체 모델 시도
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = String(
        errorData?.error?.message || `API 호출 실패 (상태 코드: ${response.status})`
      );

      // API 키 자체 오류는 재시도 없이 즉시 반환
      if (
        response.status === 400 &&
        (message.includes('API key') || message.includes('API_KEY_INVALID'))
      ) {
        throw new Error('유효하지 않은 Google Gemini API Key입니다. 키를 다시 확인해주세요.');
      }

      // 에러 메시지에 구글이 권고한 신규 모델명이 있으면 큐 맨 앞에 추가 (1회만)
      const matches = Array.from(message.matchAll(/models\/(gemini-[\w.-]+)/g));
      for (const m of matches) {
        const candidate = m[1];
        if (candidate && candidate !== modelName && !triedModels.has(candidate)) {
          queue.unshift(candidate);
        }
      }

      if (message.includes('high demand') || response.status === 503 || response.status === 429) {
        lastErrorMessage =
          '현재 구글 AI 서버에 요청이 몰려 일시적으로 지연되고 있습니다. 아래의 "즉시 로컬 트리 변환"을 누르시면 0.1초 만에 바로 트리가 생성됩니다.';
      } else {
        lastErrorMessage = message;
      }
      continue;
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const answerPart = parts.find((p: any) => !p.thought && p.text) || parts[parts.length - 1];
    const rawText = answerPart?.text;

    if (!rawText) {
      lastErrorMessage = 'Gemini API로부터 변환 결과를 받지 못했습니다.';
      continue;
    }

    let cleanedJson = rawText.trim();
    if (cleanedJson.startsWith('```json')) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsed: RawAiResponse;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch {
      lastErrorMessage = 'AI 응답을 JSON으로 파싱하지 못했습니다.';
      continue;
    }

    function sanitizeNodes(rawNodes: RawAiNode[]): StudyNode[] {
      if (!Array.isArray(rawNodes)) return [];
      return rawNodes.map((n) => ({
        id: generateNodeId(),
        title: String(n.title || '새 항목'),
        summary: String(n.summary || ''),
        notes: String(n.notes || ''),
        status: 'not_started',
        starred: false,
        children: sanitizeNodes(n.children || []),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }

    const titleBase = fileName.replace(/\.[^/.]+$/, '');
    const notebookTitle = parsed.notebookTitle?.trim() || `[PDF] ${titleBase}`;
    const description = parsed.description?.trim() || 'PDF에서 자동 변환된 지식 트리';
    const nodes = sanitizeNodes(parsed.nodes || []);

    if (nodes.length === 0) {
      lastErrorMessage = '변환된 단원 노드가 없습니다.';
      continue;
    }

    return { notebookTitle, description, nodes };
  }

  throw new Error(lastErrorMessage);
}

/**
 * 로컬 스마트 구조화 엔진 (0.1초 고속 변환 / API 키 불필요)
 * - PDF 폰트 크기(H1/H2/H3), 굵기(Bold), 단원 번호 패턴(I., 1., 3-4., (1), 제1장 등)을
 *   종합 분석하여 정확한 다단계 계층형 지식 트리를 즉시 생성합니다.
 */
export function parsePdfWithRuleEngine(
  extracted: ExtractedPdfContent,
  fileName: string
): { notebookTitle: string; description: string; nodes: StudyNode[] } {
  const cleanTitle = fileName.replace(/\.[^/.]+$/, '');
  const { lines, bodyFontSize } = extracted;

  // 대단원 번호 패턴 (I., II., 1., 2., 제1장, Chapter 1, Part 1, 1편 등)
  const majorNumberRegex =
    /^(?:[IVXLCDM]+\.|제\s*\d+\s*[장편부]|Chapter\s*\d+|Part\s*\d+|#\s+|【\d+】)\s*\S/i;
  const topNumberRegex = /^\d{1,2}\.\s+\S/;
  // 중단원/소단원 번호 패턴 (1-1., 3-4., 1.1, 1.2.3, (1), 1), ①, 가., ■, ◆, ▶)
  const subNumberRegex =
    /^(?:\d{1,2}[-.]\d{1,2}(?:[-.]\d{1,2})?\.?|\(\d{1,2}\)|\d{1,2}\)|#{2,4}\s+|[가-힣]\.|[①-⑮]|■|◆|▶|●|\[\d+\])\s*\S/;

  // 단독 페이지 번호나 노이즈 제거용
  const pageNumberOnlyRegex = /^(?:-?\s*\d{1,3}\s*-?|페이지\s*\d+|Page\s*\d+|\d+\s*\/\s*\d+)$/i;

  // 1단계: 한 줄 안에 인라인으로 붙은 단원 번호(예: "...원리입니다. 3-4. 약물대사...")가 있으면 분리
  const expandedLines: PdfLine[] = [];
  for (const item of lines) {
    if (pageNumberOnlyRegex.test(item.text)) continue;

    // 본문 중간에 ' 3-4. ' 같은 소단원 번호가 끼어 있는 경우 분리
    const parts = item.text
      .replace(
        /([.?!]\s+)(?=(?:\d{1,2}[-.]\d{1,2}\.?\s+\S|[IVXLCDM]+\.\s+\S|제\s*\d+\s*[장편절]\s*\S))/g,
        '$1\n'
      )
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const part of parts) {
      expandedLines.push({
        ...item,
        text: part,
      });
    }
  }

  interface RawSection {
    level: 1 | 2;
    title: string;
    content: string[];
  }

  const sections: RawSection[] = [];
  let currentSection: RawSection | null = null;

  const looksLikeSentenceEnd = (text: string) =>
    /(?:다|요|니다|음|함|됨)\.$/.test(text) || text.length > 75;

  for (const item of expandedLines) {
    const text = item.text;
    const sizeRatio = bodyFontSize > 0 ? item.fontSize / bodyFontSize : 1;

    let detectedLevel: 1 | 2 | null = null;

    // 1) 폰트 크기 기반 감지 (PDF 시각적 계층 구조 최우선 반영)
    if (sizeRatio >= 1.32 && text.length <= 90) {
      detectedLevel = 1;
    } else if (sizeRatio >= 1.12 && text.length <= 80 && !looksLikeSentenceEnd(text)) {
      // 하위 번호(3-4. 등)가 명시되어 있으면 확실히 Level 2, 대단원 번호면 Level 1
      if (subNumberRegex.test(text)) {
        detectedLevel = 2;
      } else if (majorNumberRegex.test(text) || topNumberRegex.test(text)) {
        detectedLevel = 1;
      } else {
        detectedLevel = 2;
      }
    }

    // 2) 번호 패턴 기반 감지 (폰트 크기가 같아도 번호로 계층 파악)
    if (detectedLevel === null) {
      if (majorNumberRegex.test(text) && !looksLikeSentenceEnd(text)) {
        detectedLevel = 1;
      } else if (subNumberRegex.test(text) && text.length <= 85) {
        detectedLevel = 2;
      } else if (topNumberRegex.test(text) && text.length <= 65 && !looksLikeSentenceEnd(text)) {
        detectedLevel = 1;
      } else if (
        item.isBold &&
        text.length >= 4 &&
        text.length <= 50 &&
        !looksLikeSentenceEnd(text)
      ) {
        detectedLevel = 2;
      }
    }

    if (detectedLevel !== null) {
      // 헤더 텍스트가 지나치게 길어 본문이 붙어있는 경우 제목/본문 분리
      let title = text.replace(/^#{1,4}\s+/, '').trim();
      let remainder = '';

      if (title.length > 55) {
        const colonIdx = title.indexOf(':');
        const dashIdx = title.indexOf(' - ');
        if (colonIdx > 4 && colonIdx < 50) {
          remainder = title.slice(colonIdx + 1).trim();
          title = title.slice(0, colonIdx).trim();
        } else if (dashIdx > 4 && dashIdx < 50) {
          remainder = title.slice(dashIdx + 3).trim();
          title = title.slice(0, dashIdx).trim();
        }
      }

      currentSection = {
        level: detectedLevel,
        title,
        content: remainder ? [remainder] : [],
      };
      sections.push(currentSection);
    } else if (currentSection) {
      currentSection.content.push(text);
    } else {
      currentSection = {
        level: 1,
        title: `I. ${cleanTitle} 개요`,
        content: [text],
      };
      sections.push(currentSection);
    }
  }

  // 2단계: 섹션을 다단계 계층 트리(대단원 -> 중단원)로 조립
  const rootNodes: StudyNode[] = [];
  let currentRootNode: StudyNode | null = null;

  for (const sec of sections) {
    // 연속된 빈 제목 중복 방지
    let summary = '';
    let notes = '';

    if (sec.content.length > 0) {
      const joined = sec.content.join('\n');
      const sentences = joined
        .replace(/\n+/g, ' ')
        .split(/(?<=[.?!])\s+/)
        .filter(Boolean);

      if (sentences.length >= 2) {
        summary = sentences.slice(0, 2).join('\n');
        notes = sec.content.join('\n');
      } else {
        summary = joined.slice(0, 180);
        notes = joined;
      }
    } else {
      summary = `${sec.title} 핵심 정리`;
      notes = '';
    }

    const node: StudyNode = {
      id: generateNodeId(),
      title: sec.title,
      summary,
      notes,
      status: 'not_started',
      starred: false,
      children: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (sec.level === 1) {
      rootNodes.push(node);
      currentRootNode = node;
    } else {
      if (currentRootNode) {
        currentRootNode.children.push(node);
      } else {
        currentRootNode = {
          id: generateNodeId(),
          title: `I. ${cleanTitle} 핵심 정리`,
          summary: '주요 단원 및 세부 개념 목록',
          notes: '',
          status: 'not_started',
          starred: false,
          children: [node],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        rootNodes.push(currentRootNode);
      }
    }
  }

  // 3단계: 만약 문서에 헤더/폰트 구분이 전혀 없어 노드가 1개뿐이라면 페이지/문단 단위로 자동 구조화
  const totalNodes = rootNodes.reduce((acc, n) => acc + 1 + n.children.length, 0);
  if (totalNodes <= 1 && expandedLines.length > 12) {
    rootNodes.length = 0;

    // 페이지별로 그룹핑하여 트리 생성
    const byPage = new Map<number, string[]>();
    for (const l of expandedLines) {
      const arr = byPage.get(l.pageNum) || [];
      arr.push(l.text);
      byPage.set(l.pageNum, arr);
    }

    const mainRoot: StudyNode = {
      id: generateNodeId(),
      title: `I. ${cleanTitle}`,
      summary: expandedLines.slice(0, 2).map((l) => l.text).join('\n'),
      notes: '',
      status: 'not_started',
      starred: false,
      children: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    rootNodes.push(mainRoot);

    for (const [pageNum, pLines] of byPage.entries()) {
      const firstLine = pLines[0] || `페이지 ${pageNum}`;
      const shortTitle =
        firstLine.length > 36 ? firstLine.slice(0, 36) + '...' : firstLine;
      mainRoot.children.push({
        id: generateNodeId(),
        title: `${pageNum}. ${shortTitle}`,
        summary: pLines.slice(0, 2).join('\n'),
        notes: pLines.join('\n'),
        status: 'not_started',
        starred: false,
        children: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const finalTotal = rootNodes.reduce((acc, n) => acc + 1 + n.children.length, 0);
  return {
    notebookTitle: `[PDF] ${cleanTitle}`,
    description: `PDF에서 자동 구조화된 지식 트리 (${rootNodes.length}개 대단원, 총 ${finalTotal}개 항목)`,
    nodes: rootNodes,
  };
}
