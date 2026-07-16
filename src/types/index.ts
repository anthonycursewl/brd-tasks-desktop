export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  created_at: string;
  expires_at: string;
  priority: string;
  tags: string[];
  notes: string;
  version?: number;
}

export interface Settings {
  avatar_url: string;
}
