export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview?: string;
  last_message_at?: string;
  is_shared?: boolean;
  share_token?: string | null;
}

export interface ConversationCreate {
  title?: string;
}

export interface ConversationUpdate {
  title: string;
}

export interface ShareResponse {
  share_token: string;
  share_url: string;
}
