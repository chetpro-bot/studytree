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
 * 속도 최적화: 간결한 핵심 요약 중심 프롬프트와 45초 타임아웃을 적용하여 10초 내외 빠른 생성 유도
 */
export async function convertPdfWithGemini(
  fullText: string,
  fileName: string,
  apiKey: string,
  modelName: string = 'gemini-2.0-flash',
  retryCount: number = 0
): Promise<{ notebookTitle: string; description: string; nodes: StudyNode[] }> {
  const prompt = `당신은 학생과 수험생을 위한 지식 구조화 전문 AI입니다.
아래 제공된 PDF 학습 자료 텍스트를 핵심 위주로 신속하게 분석하여, 지식 구조화 앱 'StudyTree' 규격의 계층형 트리 JSON 데이터로 변환해주세요.

[핵심 작성 지침 - 빠른 응답을 위한 간결한 핵심 요약]
1. 계층 구조: I. 대단원 -> 1. 중단원 -> 세부 개념의 2~3단계 트리 (전체 8~15개 핵심 노드로 압축)
2. 각 노드 작성 기준:
   - title: 단원 번호 및 명확한 주제명 (예: "1. 약물 상호작용의 기본 원리", "3-4. 약물대사효소(CYP)")
   - summary: 시험 직전 복습용 핵심 요약 (중요 암기 키워드 위주 2줄 내외)
   - notes: 핵심 원리 및 중요 암기 포인트 요약 (3~5줄 내외의 깔끔한 글머리 기호 텍스트)
   - children: 하위 단원 노드 목록 (하위 내용이 없으면 빈 배열 [])
3. 최상위 노트북 제목(notebookTitle)은 PDF 문서의 핵심 주제를 살려 짓습니다 (예: "[학습노트] " + 핵심과목/주제).
4. 장황한 문장을 배제하고 핵심 위주로 간결하게 작성하여 신속하게 응답하세요.

[응답 JSON 규격]
마크다운 코드블록이나 불필요한 사족 없이 순수 JSON으로만 응답:
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
${fullText.slice(0, 40000)}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generationConfig: Record<string, any> = {
    responseMimeType: 'application/json',
    maxOutputTokens: 3000,
  };

  if (modelName.includes('gemini-3.8')) {
    generationConfig.thinkingConfig = {
      thinkingLevel: 'low',
    };
  }

  // 45초 타임아웃 컨트롤러
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig,
      }),
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(
        '구글 AI 응답 대기 시간이 45초를 초과했습니다. 구글 서버 트래픽이 많을 때는 대기 시간 없이 0.1초 만에 완료되는 "빠른 로컬 목차 변환"을 이용해 보세요.'
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `API 호출 실패 (상태 코드: ${response.status})`;

    // 구글 서버 일시적 과부하(high demand / 503 / 429) 처리
    if (message.includes('high demand') || response.status === 503 || response.status === 429) {
      if (retryCount < 1) {
        await new Promise((r) => setTimeout(r, 1500));
        return convertPdfWithGemini(fullText, fileName, apiKey, modelName, retryCount + 1);
      }
      if (modelName !== 'gemini-2.0-flash') {
        try {
          return await convertPdfWithGemini(fullText, fileName, apiKey, 'gemini-2.0-flash', 0);
        } catch {
          // fallback failed
        }
      }
      throw new Error(
        '현재 구글 AI 서버에 전 세계적인 요청이 몰려 일시적으로 지연되고 있습니다. 잠시 후 다시 시도하시거나, 아래의 "빠른 로컬 목차 변환"을 이용하시면 0.1초 만에 즉시 변환됩니다.'
      );
    }

    // 신규 모델 권고 에러일 경우 자동 재시도
    const recommendedModelMatch = message.match(/models\/(gemini-[\w.-]+)/);
    if (recommendedModelMatch && recommendedModelMatch[1] && recommendedModelMatch[1] !== modelName) {
      const fallbackModel = recommendedModelMatch[1];
      return convertPdfWithGemini(fullText, fileName, apiKey, fallbackModel, 0);
    }

    if (message.includes('no longer available')) {
      return convertPdfWithGemini(fullText, fileName, apiKey, 'gemini-2.0-flash', 0);
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
