import * as pdfjsLib from 'pdfjs-dist';
import type { StudyNode } from '../types';
import { generateNodeId } from './treeUtils';

// Set up pdf.js worker URL (cdnjs)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface ExtractedPdfContent {
  fullText: string;
  pageCount: number;
  previewSnippet: string;
}

/**
 * 브라우저에서 PDF 파일로부터 Y축 위치를 분석하여 줄바꿈이 완벽히 보존된 텍스트를 추출합니다.
 */
export async function extractTextFromPdf(file: File): Promise<ExtractedPdfContent> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  let fullText = '';
  let previewSnippet = '';

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    let lastY: number | null = null;
    const pageLines: string[] = [];
    let currentLine = '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of textContent.items as any[]) {
      if (!item.str) continue;
      const currentY = item.transform ? Math.round(item.transform[5]) : null;

      if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 3) {
        if (currentLine.trim()) {
          pageLines.push(currentLine.trim());
        }
        currentLine = item.str;
      } else if (item.hasEOL) {
        currentLine += item.str;
        if (currentLine.trim()) {
          pageLines.push(currentLine.trim());
        }
        currentLine = '';
      } else {
        if (currentLine && !currentLine.endsWith(' ')) {
          currentLine += ' ';
        }
        currentLine += item.str;
      }

      if (currentY !== null) {
        lastY = currentY;
      }
    }

    if (currentLine.trim()) {
      pageLines.push(currentLine.trim());
    }

    const pageText = pageLines.join('\n');
    if (pageText) {
      fullText += `[페이지 ${pageNum}]\n${pageText}\n\n`;
      if (!previewSnippet && pageText.length > 50) {
        previewSnippet = pageText.slice(0, 300);
      }
    }
  }

  return { fullText, pageCount, previewSnippet };
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
 */
export async function convertPdfWithGemini(
  fullText: string,
  fileName: string,
  apiKey: string,
  modelName: string = 'gemini-3.8-flash',
  retryCount: number = 0
): Promise<{ notebookTitle: string; description: string; nodes: StudyNode[] }> {
  const prompt = `당신은 학생과 수험생을 위한 학습 자료 지식 구조화 전문 AI입니다.
아래 제공된 PDF 학습 자료 텍스트를 심층 분석하여, 지식 구조화 학습 앱 'StudyTree'의 규격에 맞는 트리 구조 JSON 데이터로 변환해주세요.

[앱의 핵심 의도]
1. 단순 목차가 아니라, 복습과 암기가 쉬운 체계적인 계층형 지식 트리(I. 대단원 -> 1. 중단원 -> 세부 개념)로 구조화합니다.
2. 각 노드는 다음 4개 항목을 충실히 채워야 합니다:
   - title: 단원 번호 및 명확한 주제명 (예: "I. 한국사의 흐름과 개항", "1. 흥선대원군의 대내외 개혁", "병인양요(1866)와 신미양요(1871) 비교")
   - summary: 시험 직전 복습용 핵심 요약 (중요 암기 키워드와 핵심 명제를 2~3줄의 깔끔한 줄바꿈 텍스트로 정리)
   - notes: 상세 학습 노트 (원리, 인과관계, 정의, 배경, 비교 분석, 전개 과정 등을 가독성 좋고 읽기 편하게 서술)
   - children: 하위 세부 개념/단원 노드 목록 (하위 내용이 없으면 빈 배열 [])
3. 최상위 노트북 제목(notebookTitle)은 PDF 문서의 핵심 주제를 살려 짓습니다 (예: "[학습노트] " + 핵심과목/주제).

[응답 JSON 규격]
반드시 마크다운 코드블록이나 불필요한 서두 없이 다음 스키마를 만족하는 순수 JSON으로만 응답해야 합니다:
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
${fullText.slice(0, 80000)}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generationConfig: Record<string, any> = {
    responseMimeType: 'application/json',
  };

  // gemini-3.8-flash의 경우 thinkingLevel을 'low'로 지정하여 빠른 응답 유도
  if (modelName.includes('gemini-3.8')) {
    generationConfig.thinkingConfig = {
      thinkingLevel: 'low',
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `API 호출 실패 (상태 코드: ${response.status})`;

    // 1. 구글 서버 일시적 과부하(high demand / 503 / 429) 처리: 1.5초 대기 후 1회 재시도
    if (message.includes('high demand') || response.status === 503 || response.status === 429) {
      if (retryCount < 1) {
        await new Promise((r) => setTimeout(r, 1500));
        return convertPdfWithGemini(fullText, fileName, apiKey, modelName, retryCount + 1);
      }
      // 1.5-flash나 2.0-flash로 대체 시도
      if (modelName === 'gemini-3.8-flash') {
        try {
          return await convertPdfWithGemini(fullText, fileName, apiKey, 'gemini-2.0-flash', 0);
        } catch {
          // fallback failed, throw friendly error
        }
      }
      throw new Error(
        '현재 구글 AI 서버에 전 세계적인 요청이 몰려 일시적으로 지연되고 있습니다. 잠시 후 다시 시도하시거나, 아래의 "빠른 로컬 목차 변환"을 이용하시면 1초 만에 즉시 변환됩니다.'
      );
    }

    // 2. 신규 모델 권고 에러일 경우 자동 재시도
    const recommendedModelMatch = message.match(/models\/(gemini-[\w.-]+)/);
    if (recommendedModelMatch && recommendedModelMatch[1] && recommendedModelMatch[1] !== modelName) {
      const fallbackModel = recommendedModelMatch[1];
      return convertPdfWithGemini(fullText, fileName, apiKey, fallbackModel, 0);
    }

    if (modelName !== 'gemini-3.8-flash' && message.includes('no longer available')) {
      return convertPdfWithGemini(fullText, fileName, apiKey, 'gemini-3.8-flash', 0);
    }

    throw new Error(message);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const answerPart = parts.find((p: any) => !p.thought && p.text) || parts[parts.length - 1];
  const rawText = answerPart?.text;

  if (!rawText) {
    throw new Error('Gemini API로부터 변환 결과를 받지 못했습니다.');
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
    throw new Error('AI 응답을 JSON으로 파싱하지 못했습니다. 다시 시도해주세요.');
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
    throw new Error('변환된 단원 노드가 없습니다. PDF 내용이 너무 적거나 텍스트를 읽을 수 없습니다.');
  }

  return { notebookTitle, description, nodes };
}

/**
 * 로컬 규칙 기반 파서 (API Key 없이 빠른 지식 트리 변환)
 */
export function parsePdfWithRuleEngine(
  rawFullText: string,
  fileName: string
): { notebookTitle: string; description: string; nodes: StudyNode[] } {
  const cleanTitle = fileName.replace(/\.[^/.]+$/, '');

  // 1단계: 인라인에 붙어있는 단원 번호(예: "...원리입니다. 3-4. 약물대사...")를 강제 줄바꿈으로 분리
  const normalizedText = rawFullText
    .replace(/\r\n/g, '\n')
    .replace(/\[페이지 \d+\]/g, '\n\n')
    .replace(
      /([.?!:;]\s+|\s{2,}|\n+)(?=(?:[IVXLCDM]+\.|\d+[-.]\d+[\.\-]?\d*|\d+\.|\d+\)|\(\d+\)|제\s*\d+\s*[장편절조항]|Chapter\s*\d+|【\d+】)\s+[^\n]{1,60})/g,
      '\n\n'
    );

  const lines = normalizedText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 대단원 정규식 패턴 (I., 1., 제1장, Chapter 1, 1편 등)
  const majorHeaderRegex = /^(?:[IVXLCDM]+\.|\d+\.|\d+편\b|제\s*\d+\s*[장편절조항]|Chapter\s*\d+|#\s+|【\d+】|■)\s*(.*)/i;
  // 중단원/소단원 정규식 패턴 (3-4., 1.1, 1), (1), 가., ①, ##, ◆ 등)
  const subHeaderRegex = /^(?:\d+[-.]\d+[\.\-]?\d*|\(\d+\)|\d+\)|#{2,4}\s+|[가-힣]\.|\u2460|\u2461|\u2462|\u2463|\u2464|\u2465|\u2466|\u2467|\u2468|\u2469|◆|▶|●|\[\d+\])\s*(.*)/;

  interface RawSection {
    level: 1 | 2;
    title: string;
    content: string[];
  }

  const sections: RawSection[] = [];
  let currentSection: RawSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const majorMatch = line.match(majorHeaderRegex);
    const subMatch = line.match(subHeaderRegex);

    if (majorMatch || subMatch) {
      const isMajor = !!majorMatch;
      let title = line;
      let remainder = '';

      if (line.length > 55) {
        const colonIdx = line.indexOf(':');
        const dashIdx = line.indexOf(' - ');
        if (colonIdx > 5 && colonIdx < 50) {
          title = line.slice(0, colonIdx).trim();
          remainder = line.slice(colonIdx + 1).trim();
        } else if (dashIdx > 5 && dashIdx < 50) {
          title = line.slice(0, dashIdx).trim();
          remainder = line.slice(dashIdx + 3).trim();
        } else {
          const words = line.split(' ');
          let acc = '';
          let splitIdx = words.length;
          for (let w = 0; w < words.length; w++) {
            if ((acc + ' ' + words[w]).length > 40) {
              splitIdx = Math.max(2, w);
              break;
            }
            acc += (acc ? ' ' : '') + words[w];
          }
          title = words.slice(0, splitIdx).join(' ');
          remainder = words.slice(splitIdx).join(' ');
        }
      }

      currentSection = {
        level: isMajor ? 1 : 2,
        title,
        content: remainder ? [remainder] : [],
      };
      sections.push(currentSection);
    } else if (currentSection) {
      currentSection.content.push(line);
    } else {
      currentSection = {
        level: 1,
        title: 'I. ' + cleanTitle + ' 개요',
        content: [line],
      };
      sections.push(currentSection);
    }
  }

  const rootNodes: StudyNode[] = [];
  let currentRootNode: StudyNode | null = null;

  for (const sec of sections) {
    let summary = '';
    let notes = '';

    if (sec.content.length > 0) {
      const fullContent = sec.content.join('\n\n');
      const paragraphs = fullContent.split('\n\n').filter(Boolean);
      if (paragraphs.length >= 2) {
        summary = paragraphs[0];
        notes = paragraphs.slice(1).join('\n\n');
      } else {
        const sentences = fullContent.split(/(?<=[.?!])\s+/);
        if (sentences.length > 2) {
          summary = sentences.slice(0, 2).join(' ');
          notes = sentences.slice(2).join(' ');
        } else {
          summary = fullContent;
          notes = fullContent;
        }
      }
    } else {
      summary = `${sec.title}에 관한 핵심 정리`;
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
          title: 'I. ' + cleanTitle + ' 개요',
          summary: '핵심 주제 및 세부 단원 목록',
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

  if (rootNodes.length <= 1 && lines.length > 20) {
    rootNodes.length = 0;
    const chunkSize = 15;
    let chapterNum = 1;

    const mainRoot: StudyNode = {
      id: generateNodeId(),
      title: 'I. ' + cleanTitle + ' 본문 정리',
      summary: `${lines.slice(0, 2).join(' ')}`,
      notes: lines.slice(0, 5).join('\n\n'),
      status: 'not_started',
      starred: false,
      children: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    rootNodes.push(mainRoot);

    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize);
      const title = `${chapterNum}. ` + (chunk[0]?.slice(0, 35) || `세부 주제 ${chapterNum}`);
      const summary = chunk.slice(1, 3).join(' ') || chunk[0] || '';
      const notes = chunk.slice(3).join('\n\n') || chunk.join('\n\n');

      mainRoot.children.push({
        id: generateNodeId(),
        title,
        summary,
        notes,
        status: 'not_started',
        starred: false,
        children: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      chapterNum++;
    }
  }

  return {
    notebookTitle: `[PDF] ${cleanTitle}`,
    description: `PDF에서 변환된 지식 트리 (${rootNodes.length}개 대단원)`,
    nodes: rootNodes,
  };
}
