export interface TaskDTO {
  id: string;
  user_id: string;
  title: string;
  description: string;
  completed: boolean;
  completed_at: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  tags: string[];
  notes: string;
  created_at: string;
  expires_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

export interface CreateTaskPayload {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  tags?: string[];
  notes?: string;
  expiry_hours?: number;
  created_at?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: string;
  tags?: string[];
  notes?: string;
  completed?: boolean;
  expiry_hours?: number;
  version: number;
}

export interface SyncPayloadTask {
  id: string;
  title: string;
  completed: boolean;
  priority: string;
  tags: string[];
  notes: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  version: number;
  deleted_at: string | null;
}

export interface SyncBatch {
  tasks: SyncPayloadTask[];
  deleted_ids?: string[];
  last_sync_at?: string;
  device_id?: string;
  batch_id?: string;
}

export interface SyncPayload {
  batches: SyncBatch[];
}

export interface SyncConflict {
  task_id: string;
  client_version: number;
  server_version: number;
  server_task: TaskDTO;
}

export interface SyncResponse {
  tasks: TaskDTO[];
  deleted_ids: string[];
  sync_at: string;
  conflicts: SyncConflict[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface SyncFlatPayload {
  tasks: SyncPayloadTask[];
  deleted_ids: string[];
  last_sync_at?: string;
  take?: number;
  cursor?: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
  };
}

export interface VerifyResponse {
  user: {
    userId: string;
    email: string;
    name: string;
  };
}

export interface TaskListResponse {
  tasks: TaskDTO[];
  next_cursor: string | null;
}

export interface TaskResponse {
  task: TaskDTO;
}

export interface DeleteResponse {
  deleted_at: string;
}
