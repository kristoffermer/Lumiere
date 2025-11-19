export enum BlockType {
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  QUIZ = 'QUIZ',
  HEADER = 'HEADER',
  TABS = 'TABS'
}

export interface CourseBlock {
  id: string;
  type: BlockType;
  content: string; // URL for video/image, markdown for text, JSON for tabs
  metadata?: {
    title?: string;
    description?: string;
    caption?: string;
    aiGenerated?: boolean;
    thumbnail?: string; // For video thumbnails
  };
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category?: string; // Custom tag/category (e.g. "Matematikk", "Originalt Kurs")
  coverImage: string;
  blocks: CourseBlock[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export enum ViewMode {
  CREATOR = 'CREATOR',
  STUDENT = 'STUDENT',
  LANDING = 'LANDING'
}