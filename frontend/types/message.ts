export type MessageRole = 'user' | 'assistant';

export interface Source {
  id: string;
  number: number;
  file_name: string;
  display_name: string;
  category: string;
  page_number?: number;
  chunk_index?: number;
  similarity_score: number;
  excerpt: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  sources?: Source[];
}

export interface MessageCreate {
  conversation_id: string;
  message: string;
}

export interface StreamEvent {
  type: 'token' | 'complete' | 'error';
  full_content?: string;
  sources?: Source[];
  message?: string;
}
