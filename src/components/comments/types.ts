export interface CommentAuthor {
  id: string;
  user_id: string;
  name: string;
  username?: string;
  avatar_url?: string;
}

export interface CommentAttachment {
  type: 'file' | 'link';
  name: string;
  url: string;
  size_bytes?: number;
}

export interface CommentItem {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author?: CommentAuthor | null;
  attachments?: CommentAttachment[];
  is_external?: boolean;
  reviewer_name?: string;
  reviewer_email?: string;
}

export interface PendingAttachment {
  type: 'file' | 'link';
  name: string;
  file?: File;
  url?: string;
  size_bytes?: number;
}

export interface MentionUser {
  user_id: string;
  name: string;
  username?: string;
}
