export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completed_at: string | null;
  priority: string;
  tags: string[];
  notes: string;
  created_at: string;
  expires_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

export interface Settings {
  avatar_url: string;
}
