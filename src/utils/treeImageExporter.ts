import type { Notebook, StudyNode } from '../types';
import { countDescendants } from './treeUtils';

export type PaperOrientation = 'portrait' | 'landscape';
export type ExportLayoutStyle = 'outline' | 'mindmap';

export interface TreeImageExportOptions {
  orientation: PaperOrientation;
  layout: ExportLayoutStyle;
  includeSummary: boolean;
}

// A4 200 DPI 해상도 (인쇄 및 고화질 저장에 최적화)
export const A4_DIMENSIONS: Record<PaperOrientation, { width: number; height: number }> = {
  portrait: { width: 1654, height: 2339 },
  landscape: { width: 2339, height: 1654 },
};

const FONT_FAMILY =
  '"Pretendard", "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", system-ui, sans-serif';

// 대단원별 세련된 포인트 컬러 팔레트
const CHAPTER_COLORS = [
  { main: '#4f46e5', soft: '#eef2ff', border: '#c7d2fe', text: '#312e81' }, // Indigo
  { main: '#0284c7', soft: '#f0f9ff', border: '#bae6fd', text: '#0c4a6e' }, // Sky
  { main: '#059669', soft: '#ecfdf5', border: '#a7f3d0', text: '#064e3b' }, // Emerald
  { main: '#d97706', soft: '#fffbeb', border: '#fde68a', text: '#78350f' }, // Amber
  { main: '#7c3aed', soft: '#f5f3ff', border: '#ddd6fe', text: '#4c1d95' }, // Violet
  { main: '#e11d48', soft: '#fff1f2', border: '#fecdd3', text: '#881337' }, // Rose
];

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * 한글/영문 혼합 텍스트를 최대 폭에 맞게 줄바꿈 배열로 반환
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 4
): string[] {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return [];

  const paragraphs = clean.split('\n');
  const result: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    let currentLine = '';
    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];
      const testLine = currentLine + char;
      if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
        result.push(currentLine.trim());
        currentLine = char;
        if (result.length >= maxLines) {
          const last = result[result.length - 1];
          result[result.length - 1] =
            last.length > 2 ? last.slice(0, last.length - 1) + '…' : last + '…';
          return result;
        }
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine.trim()) {
      result.push(currentLine.trim());
      if (result.length >= maxLines) {
        return result;
      }
    }
  }

  return result;
}

function countAllNodes(nodes: StudyNode[]): number {
  return nodes.reduce((acc, n) => acc + 1 + countDescendants(n), 0);
}

/**
 * 공통 상단 헤더 & 하단 푸터 그리기
 */
function drawHeaderAndFooter(
  ctx: CanvasRenderingContext2D,
  notebook: Notebook,
  width: number,
  height: number,
  margin: number
): { contentTop: number; contentBottom: number } {
  // 흰색 A4 배경
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 상단 얇은 인디고 포인트 바
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, '#4f46e5');
  grad.addColorStop(1, '#6366f1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, 14);

  const headerY = margin + 12;

  // 로고 배지
  drawRoundedRect(ctx, margin, headerY, 136, 36, 8);
  ctx.fillStyle = '#eef2ff';
  ctx.fill();
  ctx.font = `700 20px ${FONT_FAMILY}`;
  ctx.fillStyle = '#4f46e5';
  ctx.textBaseline = 'middle';
  ctx.fillText('StudyTree', margin + 18, headerY + 19);

  // 우측 통계 및 날짜
  const totalNodes = countAllNodes(notebook.nodes);
  const dateStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const metaText = `${notebook.nodes.length}개 대단원 · 총 ${totalNodes}개 항목  |  ${dateStr}`;
  ctx.font = `500 20px ${FONT_FAMILY}`;
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'right';
  ctx.fillText(metaText, width - margin, headerY + 19);
  ctx.textAlign = 'left';

  // 노트북 메인 타이틀
  const titleY = headerY + 62;
  ctx.font = `800 40px ${FONT_FAMILY}`;
  ctx.fillStyle = '#0f172a';
  const titleLines = wrapText(ctx, notebook.title || '스터디 지식 트리', width - margin * 2, 2);
  let cursorY = titleY;
  for (const line of titleLines) {
    ctx.fillText(line, margin, cursorY);
    cursorY += 50;
  }

  // 구분선
  const dividerY = cursorY + 8;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, dividerY);
  ctx.lineTo(width - margin, dividerY);
  ctx.stroke();

  // 하단 푸터
  const footerY = height - margin + 24;
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(margin, footerY - 26);
  ctx.lineTo(width - margin, footerY - 26);
  ctx.stroke();

  ctx.font = `500 17px ${FONT_FAMILY}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('StudyTree — 지식 구조화 학습 노트', margin, footerY);
  ctx.textAlign = 'right';
  ctx.fillText('A4 Knowledge Map', width - margin, footerY);
  ctx.textAlign = 'left';

  return {
    contentTop: dividerY + 34,
    contentBottom: footerY - 46,
  };
}

/**
 * 레이아웃 1: 정리 노트 목차형 (Outline Sheet)
 * - 대단원 카드 + 깔끔한 트리 세로 가이드라인 + 선택적 핵심 요약
 * - 항목 수에 따라 1단/2단 자동 배치 및 자동 스케일 피팅
 */
function renderOutlineLayout(
  ctx: CanvasRenderingContext2D,
  notebook: Notebook,
  options: TreeImageExportOptions,
  contentTop: number,
  contentBottom: number,
  width: number,
  margin: number
) {
  const nodes = notebook.nodes;
  if (nodes.length === 0) {
    ctx.font = `500 28px ${FONT_FAMILY}`;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('출력할 단원이 없습니다.', width / 2, (contentTop + contentBottom) / 2);
    ctx.textAlign = 'left';
    return;
  }

  const availWidth = width - margin * 2;
  const availHeight = contentBottom - contentTop;
  const totalCount = countAllNodes(nodes);

  // 가로 방향이거나 항목이 많으면 2단 레이아웃 자동 적용
  const useTwoColumns =
    (options.orientation === 'landscape' && nodes.length >= 2) ||
    (options.orientation === 'portrait' && totalCount > 18 && nodes.length >= 2);

  const colGap = 38;
  const colWidth = useTwoColumns ? (availWidth - colGap) / 2 : availWidth;

  // 가상 높이 측정을 통해 적절한 폰트 스케일(1.0 ~ 0.62) 자동 계산
  interface MeasuredBlock {
    chapterIndex: number;
    node: StudyNode;
    height: number;
  }

  const measureChapterHeight = (root: StudyNode, scale: number): number => {
    let h = 58 * scale; // 대단원 헤더 바
    const walk = (n: StudyNode, depth: number) => {
      const indent = depth * 32 * scale;
      const textMaxW = colWidth - 48 * scale - indent;
      if (depth > 0) {
        const fontSize = Math.round((depth === 1 ? 22 : 19) * scale);
        ctx.font = `${depth === 1 ? 600 : 500} ${fontSize}px ${FONT_FAMILY}`;
        const lines = wrapText(ctx, n.title || '(제목 없음)', textMaxW, 2);
        h += lines.length * (fontSize * 1.38) + 12 * scale;
      }
      if (options.includeSummary && n.summary?.trim()) {
        const sumFont = Math.round(16 * scale);
        ctx.font = `400 ${sumFont}px ${FONT_FAMILY}`;
        const sLines = wrapText(ctx, n.summary, textMaxW - 8, 2);
        h += sLines.length * (sumFont * 1.4) + 8 * scale;
      }
      for (const child of n.children || []) {
        walk(child, depth + 1);
      }
    };
    walk(root, 0);
    return h + 28 * scale; // 카드 하단 패딩 + 여백
  };

  // 최적의 스케일 탐색
  let chosenScale = 1.0;
  let columnAssignments: [MeasuredBlock[], MeasuredBlock[]] = [[], []];

  for (const candidateScale of [1.0, 0.92, 0.84, 0.76, 0.68, 0.62, 0.56]) {
    const measured: MeasuredBlock[] = nodes.map((n, idx) => ({
      chapterIndex: idx,
      node: n,
      height: measureChapterHeight(n, candidateScale),
    }));

    if (!useTwoColumns) {
      const totalH = measured.reduce((s, b) => s + b.height, 0);
      chosenScale = candidateScale;
      columnAssignments = [measured, []];
      if (totalH <= availHeight) break;
    } else {
      // 좌/우 2단 밸런스 배치
      const leftCol: MeasuredBlock[] = [];
      const rightCol: MeasuredBlock[] = [];
      let leftH = 0;
      let rightH = 0;
      for (const block of measured) {
        if (leftH <= rightH) {
          leftCol.push(block);
          leftH += block.height;
        } else {
          rightCol.push(block);
          rightH += block.height;
        }
      }
      chosenScale = candidateScale;
      columnAssignments = [leftCol, rightCol];
      if (Math.max(leftH, rightH) <= availHeight) break;
    }
  }

  const drawColumn = (blocks: MeasuredBlock[], startX: number) => {
    let cursorY = contentTop;
    const s = chosenScale;

    for (const block of blocks) {
      const color = CHAPTER_COLORS[block.chapterIndex % CHAPTER_COLORS.length];
      const cardHeight = block.height - 16 * s;

      // 대단원 카드 컨테이너
      drawRoundedRect(ctx, startX, cursorY, colWidth, cardHeight, 14 * s);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 상단 컬러 헤더 배경
      const headerH = 54 * s;
      ctx.save();
      drawRoundedRect(ctx, startX, cursorY, colWidth, cardHeight, 14 * s);
      ctx.clip();
      ctx.fillStyle = color.soft;
      ctx.fillRect(startX, cursorY, colWidth, headerH);
      ctx.fillStyle = color.main;
      ctx.fillRect(startX, cursorY, 7 * s, headerH);
      ctx.restore();

      // 대단원 제목
      const hFontSize = Math.round(24 * s);
      ctx.font = `700 ${hFontSize}px ${FONT_FAMILY}`;
      ctx.fillStyle = color.text;
      ctx.textBaseline = 'middle';
      const titleMaxW = colWidth - 84 * s;
      const rootTitleLines = wrapText(ctx, block.node.title || '(제목 없음)', titleMaxW, 1);
      ctx.fillText(rootTitleLines[0] || '', startX + 22 * s, cursorY + headerH / 2 + 1);

      // 하위 항목 수 배지
      const subCount = countDescendants(block.node);
      if (subCount > 0) {
        const badgeW = 36 * s;
        const badgeH = 26 * s;
        const badgeX = startX + colWidth - badgeW - 16 * s;
        const badgeY = cursorY + (headerH - badgeH) / 2;
        drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 13 * s);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = color.border;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.font = `700 ${Math.round(15 * s)}px ${FONT_FAMILY}`;
        ctx.fillStyle = color.main;
        ctx.textAlign = 'center';
        ctx.fillText(String(subCount), badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);
        ctx.textAlign = 'left';
      }

      let innerY = cursorY + headerH + 14 * s;
      ctx.textBaseline = 'top';

      // 대단원 요약 (옵션)
      if (options.includeSummary && block.node.summary?.trim()) {
        const sumFont = Math.round(16 * s);
        ctx.font = `400 ${sumFont}px ${FONT_FAMILY}`;
        ctx.fillStyle = '#475569';
        const sLines = wrapText(ctx, block.node.summary, colWidth - 44 * s, 2);
        for (const sl of sLines) {
          ctx.fillText(sl, startX + 22 * s, innerY);
          innerY += sumFont * 1.4;
        }
        innerY += 8 * s;
      }

      // 하위 노드 재귀 렌더링 + 수직 가이드선
      const drawChildren = (children: StudyNode[], depth: number) => {
        if (!children || children.length === 0) return;
        const guideX = startX + 20 * s + (depth - 1) * 32 * s;
        const groupStartY = innerY;

        for (const child of children) {
          const itemX = guideX + 18 * s;
          const fontSize = Math.round((depth === 1 ? 21 : 18) * s);
          const textMaxW = startX + colWidth - itemX - 20 * s;

          // 가로 연결 틱 + 컬러 도트
          const dotY = innerY + fontSize * 0.55;
          ctx.strokeStyle = color.border;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(guideX, dotY);
          ctx.lineTo(itemX - 6 * s, dotY);
          ctx.stroke();

          ctx.fillStyle = depth === 1 ? color.main : '#94a3b8';
          ctx.beginPath();
          ctx.arc(itemX, dotY, (depth === 1 ? 4.2 : 3.2) * s, 0, Math.PI * 2);
          ctx.fill();

          // 노드 텍스트
          ctx.font = `${depth === 1 ? 600 : 500} ${fontSize}px ${FONT_FAMILY}`;
          ctx.fillStyle = depth === 1 ? '#1e293b' : '#334155';
          const lines = wrapText(ctx, child.title || '(제목 없음)', textMaxW, 2);
          for (const line of lines) {
            ctx.fillText(line, itemX + 12 * s, innerY);
            innerY += fontSize * 1.38;
          }

          // 하위 노드 요약 (옵션)
          if (options.includeSummary && child.summary?.trim()) {
            const sumFont = Math.round(15 * s);
            ctx.font = `400 ${sumFont}px ${FONT_FAMILY}`;
            ctx.fillStyle = '#64748b';
            const sLines = wrapText(ctx, child.summary, textMaxW - 12 * s, 2);
            for (const sl of sLines) {
              ctx.fillText(sl, itemX + 12 * s, innerY);
              innerY += sumFont * 1.4;
            }
            innerY += 4 * s;
          }

          innerY += 10 * s;

          if (child.children && child.children.length > 0) {
            drawChildren(child.children, depth + 1);
          }
        }

        // 세로 트리 가이드선
        ctx.strokeStyle = color.border;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(guideX, groupStartY);
        ctx.lineTo(guideX, innerY - 14 * s);
        ctx.stroke();
      };

      drawChildren(block.node.children || [], 1);

      cursorY += block.height;
    }
  };

  drawColumn(columnAssignments[0], margin);
  if (useTwoColumns && columnAssignments[1].length > 0) {
    drawColumn(columnAssignments[1], margin + colWidth + colGap);
  }
}

/**
 * 레이아웃 2: 마인드맵 트리형 (Horizontal Tree Diagram)
 * - 좌측 루트 노트북에서 우측으로 곡선 베지어 가지가 뻗어나가는 시각적 지식 지도
 */
function renderMindmapLayout(
  ctx: CanvasRenderingContext2D,
  notebook: Notebook,
  options: TreeImageExportOptions,
  contentTop: number,
  contentBottom: number,
  width: number,
  margin: number
) {
  const nodes = notebook.nodes;
  if (nodes.length === 0) {
    ctx.font = `500 28px ${FONT_FAMILY}`;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('출력할 단원이 없습니다.', width / 2, (contentTop + contentBottom) / 2);
    ctx.textAlign = 'left';
    return;
  }

  interface LayoutNode {
    id: string;
    title: string;
    summary?: string;
    depth: number;
    colorIndex: number;
    x: number;
    y: number;
    w: number;
    h: number;
    subtreeH: number;
    children: LayoutNode[];
  }

  // 트리 최대 깊이 파악
  let maxDepth = 1;
  const findMaxDepth = (list: StudyNode[], d: number) => {
    for (const n of list) {
      if (d > maxDepth) maxDepth = d;
      if (n.children?.length) findMaxDepth(n.children, d + 1);
    }
  };
  findMaxDepth(nodes, 1);

  const availW = width - margin * 2;
  const availH = contentBottom - contentTop;

  // 가상 좌표계에서 트리 구성 후 A4 영역에 완벽하게 스케일링
  const colGap = 76;
  const baseNodeW = (depth: number) => {
    if (depth === 0) return 260;
    if (depth === 1) return 320;
    return 360;
  };
  const vGap = options.includeSummary ? 22 : 16;

  const buildLayoutNode = (
    title: string,
    summary: string | undefined,
    depth: number,
    colorIndex: number,
    children: StudyNode[]
  ): LayoutNode => {
    const w = baseNodeW(depth);
    const fontSize = depth === 0 ? 22 : depth === 1 ? 20 : 18;
    ctx.font = `${depth <= 1 ? 700 : 600} ${fontSize}px ${FONT_FAMILY}`;
    const titleLines = wrapText(ctx, title || '(제목 없음)', w - 28, 2);
    let h = titleLines.length * (fontSize * 1.35) + 22;

    if (options.includeSummary && depth > 0 && summary?.trim()) {
      ctx.font = `400 14px ${FONT_FAMILY}`;
      const sLines = wrapText(ctx, summary, w - 28, 2);
      h += sLines.length * 19 + 6;
    }

    const childLayouts = (children || []).map((c, idx) =>
      buildLayoutNode(
        c.title,
        c.summary,
        depth + 1,
        depth === 0 ? idx : colorIndex,
        c.children || []
      )
    );

    const childrenTotalH =
      childLayouts.length > 0
        ? childLayouts.reduce((acc, c) => acc + c.subtreeH, 0) +
          (childLayouts.length - 1) * vGap
        : 0;

    return {
      id: Math.random().toString(),
      title,
      summary,
      depth,
      colorIndex,
      x: 0,
      y: 0,
      w,
      h,
      subtreeH: Math.max(h, childrenTotalH),
      children: childLayouts,
    };
  };

  const rootLayout = buildLayoutNode(
    notebook.title || '스터디 트리',
    undefined,
    0,
    0,
    nodes
  );

  // X/Y 좌표 배치
  let totalVirtualW = 0;
  const assignCoords = (node: LayoutNode, x: number, topY: number) => {
    node.x = x;
    node.y = topY + (node.subtreeH - node.h) / 2;
    if (node.x + node.w > totalVirtualW) {
      totalVirtualW = node.x + node.w;
    }

    if (node.children.length > 0) {
      const childTotalH =
        node.children.reduce((acc, c) => acc + c.subtreeH, 0) +
        (node.children.length - 1) * vGap;
      let childY = topY + (node.subtreeH - childTotalH) / 2;
      const nextX = x + node.w + colGap;

      for (const child of node.children) {
        assignCoords(child, nextX, childY);
        childY += child.subtreeH + vGap;
      }
    }
  };

  assignCoords(rootLayout, 0, 0);
  const totalVirtualH = rootLayout.subtreeH;

  // A4 영역에 맞춰 자동 스케일 & 중앙 정렬
  const scaleX = availW / Math.max(totalVirtualW, 1);
  const scaleY = availH / Math.max(totalVirtualH, 1);
  const scale = Math.min(scaleX, scaleY, 1.35);

  const offsetX = margin + (availW - totalVirtualW * scale) / 2;
  const offsetY = contentTop + (availH - totalVirtualH * scale) / 2;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // 1) 베지어 곡선 가지선 먼저 그리기
  const drawEdges = (node: LayoutNode) => {
    const startX = node.x + node.w;
    const startY = node.y + node.h / 2;

    for (const child of node.children) {
      const endX = child.x;
      const endY = child.y + child.h / 2;
      const midX = (startX + endX) / 2;
      const color = CHAPTER_COLORS[child.colorIndex % CHAPTER_COLORS.length];

      ctx.strokeStyle = child.depth === 1 ? color.main : color.border;
      ctx.lineWidth = child.depth === 1 ? 3 : 2.2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(midX, startY, midX, endY, endX, endY);
      ctx.stroke();

      drawEdges(child);
    }
  };
  drawEdges(rootLayout);

  // 2) 노드 박스 및 텍스트 그리기
  const drawNodes = (node: LayoutNode) => {
    const color = CHAPTER_COLORS[node.colorIndex % CHAPTER_COLORS.length];

    if (node.depth === 0) {
      // 루트 노트북 박스
      drawRoundedRect(ctx, node.x, node.y, node.w, node.h, 14);
      ctx.fillStyle = '#4f46e5';
      ctx.fill();

      ctx.font = `700 22px ${FONT_FAMILY}`;
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'top';
      const lines = wrapText(ctx, node.title, node.w - 28, 2);
      let ty = node.y + (node.h - lines.length * 29) / 2;
      for (const l of lines) {
        ctx.fillText(l, node.x + 14, ty);
        ty += 29;
      }
    } else if (node.depth === 1) {
      // 대단원 박스
      drawRoundedRect(ctx, node.x, node.y, node.w, node.h, 12);
      ctx.fillStyle = color.soft;
      ctx.fill();
      ctx.strokeStyle = color.main;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.font = `700 20px ${FONT_FAMILY}`;
      ctx.fillStyle = color.text;
      ctx.textBaseline = 'top';
      const lines = wrapText(ctx, node.title, node.w - 28, 2);
      let ty = node.y + 12;
      for (const l of lines) {
        ctx.fillText(l, node.x + 14, ty);
        ty += 27;
      }

      if (options.includeSummary && node.summary?.trim()) {
        ctx.font = `400 14px ${FONT_FAMILY}`;
        ctx.fillStyle = '#475569';
        const sLines = wrapText(ctx, node.summary, node.w - 28, 2);
        ty += 4;
        for (const sl of sLines) {
          ctx.fillText(sl, node.x + 14, ty);
          ty += 19;
        }
      }
    } else {
      // 중단원 / 리프 박스
      drawRoundedRect(ctx, node.x, node.y, node.w, node.h, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // 좌측 작은 컬러 바
      ctx.fillStyle = color.main;
      drawRoundedRect(ctx, node.x, node.y + 6, 5, node.h - 12, 3);
      ctx.fill();

      ctx.font = `600 18px ${FONT_FAMILY}`;
      ctx.fillStyle = '#1e293b';
      ctx.textBaseline = 'top';
      const lines = wrapText(ctx, node.title, node.w - 30, 2);
      let ty = node.y + 11;
      for (const l of lines) {
        ctx.fillText(l, node.x + 16, ty);
        ty += 24;
      }

      if (options.includeSummary && node.summary?.trim()) {
        ctx.font = `400 14px ${FONT_FAMILY}`;
        ctx.fillStyle = '#64748b';
        const sLines = wrapText(ctx, node.summary, node.w - 30, 2);
        ty += 4;
        for (const sl of sLines) {
          ctx.fillText(sl, node.x + 16, ty);
          ty += 19;
        }
      }
    }

    for (const child of node.children) {
      drawNodes(child);
    }
  };
  drawNodes(rootLayout);

  ctx.restore();
}

/**
 * 노트북의 지식 트리를 A4 고해상도 캔버스에 렌더링합니다.
 */
export function renderTreeToCanvas(
  canvas: HTMLCanvasElement,
  notebook: Notebook,
  options: TreeImageExportOptions
): void {
  const { width, height } = A4_DIMENSIONS[options.orientation];
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const margin = 72;
  const { contentTop, contentBottom } = drawHeaderAndFooter(
    ctx,
    notebook,
    width,
    height,
    margin
  );

  if (options.layout === 'mindmap') {
    renderMindmapLayout(ctx, notebook, options, contentTop, contentBottom, width, margin);
  } else {
    renderOutlineLayout(ctx, notebook, options, contentTop, contentBottom, width, margin);
  }
}

/**
 * 캔버스를 고해상도 PNG 이미지 파일로 다운로드합니다.
 */
export function downloadCanvasAsPng(canvas: HTMLCanvasElement, fileName: string): void {
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * 캔버스 이미지를 A4 용지 비율에 맞춰 브라우저 인쇄 창으로 바로 출력합니다.
 */
export function printCanvasAsA4(
  canvas: HTMLCanvasElement,
  orientation: PaperOrientation,
  title: string
): void {
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) {
    alert('팝업이 차단되어 인쇄 창을 열 수 없습니다. 브라우저 팝업 허용 후 다시 시도해주세요.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <title>${title} - StudyTree A4 출력</title>
        <style>
          @page {
            size: A4 ${orientation};
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            width: 100%;
            height: 100%;
            background: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          img {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            display: block;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          }
          @media print {
            html, body {
              background: #ffffff;
              width: 100%;
              height: 100%;
            }
            img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" alt="${title}" onload="setTimeout(() => { window.print(); }, 250);" />
      </body>
    </html>
  `);
  printWindow.document.close();
}
