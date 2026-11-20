export type LearningStatus = 'not_started' | 'learning' | 'mastered';

export interface StudyNode {
  id: string;
  title: string;
  summary: string;
  notes: string;
  status: LearningStatus;
  starred: boolean;
  children: StudyNode[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Notebook {
  id: string;
  title: string;
  category?: 'history' | 'medical' | 'general';
  description?: string;
  nodes: StudyNode[];
  createdAt: string;
  updatedAt: string;
}

export interface BreadcrumbItem {
  id: string;
  title: string;
}

export interface TreeStats {
  total: number;
  mastered: number;
  learning: number;
  notStarted: number;
  starred: number;
  progressPercent: number;
}
