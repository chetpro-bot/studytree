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
 * 브라우저에서 PDF 파일로부터 텍스트를 페이지별로 추출합니다.
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
    const pageText = textContent.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => item.str || '')
      .join(' ')
      .trim();

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
 * Gemini API를 호출하여 PDF 텍스트를 StudyTree 계층 구조로 변환합니다.
 */
export async function convertPdfWithGemini(
  fullText: string,
  fileName: string,
  apiKey: string,
  modelName: string = 'gemini-2.5-flash'
): Promise<{ notebookTitle: string; description: string; nodes: StudyNode[] }> {
  const prompt = `당신은 학생과 수험생을 위한 학습 자료 지식 구조화 전문 AI입니다.
아래 제공된 PDF 학습 자료 텍스트를 심층 분석하여, 지식 구조화 학습 앱 'StudyTree'의 규격에 맞는 트리 구조 JSON 데이터로 변환해주세요.

[앱의 핵심 의도]
1. 단순 목차가 아니라, 복습과 암기가 쉬운 체계적인 계층형 지식 트리(I. 대단원 -> 1. 중단원 -> 세부 개념)로 구조화합니다.
2. 각 노드는 다음 4개 항목을 충실히 채워야 합니다:
   - title: 단원 번호 및 명확한 주제명 (예: "I. 한국사의 흐름과 개항", "1. 흥선대원군의 대내외 개혁", "병인양요(1866)와 신미양요(1871) 비교")
   - summary: 시험 직전 복습용 핵심 요약 (중요 암기 키워드와 핵심 명제를 2~4줄의 깔끔한 줄바꿈 텍스트로 정리)
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
${fullText.slice(0, 300000)}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

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
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `API 호출 실패 (상태 코드: ${response.status})`;
    throw new Error(message);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini API로부터 변환 결과를 받지 못했습니다.');
  }

  // 마크다운 코드블록 제거 후 JSON 파싱
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
 * 로컬 규칙 기반 파서 (API Key 없이 빠른 변환)
 */
export function parsePdfWithRuleEngine(
  fullText: string,
  fileName: string
): { notebookTitle: string; description: string; nodes: StudyNode[] } {
  const cleanTitle = fileName.replace(/\.[^/.]+$/, '');
  const lines = fullText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('[페이지 '));

  // 대단원 정규식 패턴 (I., II., 제 1 장, Chapter, 1., etc.)
  const majorHeaderRegex = /^(?:[IVXLCDM]+\.|\d+\.|\uC81C\s*\d+\s*[\uC7A5\uC808]|Chapter\s*\d+)\s*(.*)/i;
  const subHeaderRegex = /^(?:\d+\.\d+|\(\d+\)|[가-힣]\.|\u2460|\u2461|\u2462|\u2463|\u2464|\u2465|\u25C6|\u25A0|\u25CF)\s*(.*)/;

  interface RawSection {
    level: 1 | 2;
    title: string;
    contentLines: string[];
  }

  const sections: RawSection[] = [];
  let currentSection: RawSection | null = null;

  for (const line of lines) {
    const majorMatch = line.match(majorHeaderRegex);
    const subMatch = line.match(subHeaderRegex);

    if (majorMatch && line.length < 80) {
      currentSection = { level: 1, title: line, contentLines: [] };
      sections.push(currentSection);
    } else if (subMatch && line.length < 80) {
      currentSection = { level: 2, title: line, contentLines: [] };
      sections.push(currentSection);
    } else if (currentSection) {
      currentSection.contentLines.push(line);
    } else {
      currentSection = { level: 1, title: 'I. ' + cleanTitle + ' 개요', contentLines: [line] };
      sections.push(currentSection);
    }
  }

  const rootNodes: StudyNode[] = [];
  let lastMajorNode: StudyNode | null = null;

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const summary = sec.contentLines.slice(0, 3).join('\n') || '핵심 요약 없음';
    const notes = sec.contentLines.slice(3).join('\n\n') || sec.contentLines.join('\n\n');

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
      lastMajorNode = node;
    } else {
      if (lastMajorNode) {
        lastMajorNode.children.push(node);
      } else {
        rootNodes.push(node);
      }
    }
  }

  // 만약 헤더 패턴이 거의 검출되지 않은 일반 텍스트인 경우 20라인 단위로 자동 분할
  if (rootNodes.length <= 1 && lines.length > 20) {
    rootNodes.length = 0;
    const chunkSize = 15;
    let chapterNum = 1;
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize);
      const title = `${chapterNum}. ` + (chunk[0]?.slice(0, 30) || `단원 ${chapterNum}`);
      const summary = chunk.slice(1, 4).join('\n') || chunk[0] || '';
      const notes = chunk.slice(4).join('\n\n') || chunk.join('\n\n');

      rootNodes.push({
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
    description: `PDF에서 변환된 지식 트리 (${rootNodes.length}개 단원)`,
    nodes: rootNodes,
  };
}
