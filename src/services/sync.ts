import { Task } from "../types";
import { SyncPayload } from "../types/api";
import { api, setTokens } from "./api";
import { auth } from "./auth";

const versions = new Map<string, number>();

function toSyncItem(task: Task) {
  return {
    id: task.id,
    title: task.title,
    completed: task.completed,
    priority: task.priority,
    tags: task.tags,
    notes: task.notes,
    expires_at: task.expires_at,
    created_at: task.created_at,
    version: task.version ?? versions.get(task.id) ?? 1,
    deleted_at: null,
  };
}

function fromDTO(dto: any): Task {
  if (dto?.version != null) versions.set(dto.id, dto.version);
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description || "",
    completed: dto.completed,
    created_at: dto.created_at,
    expires_at: dto.expires_at,
    priority: dto.priority || "medium",
    tags: dto.tags || [],
    notes: dto.notes || "",
    version: dto.version ?? undefined,
  };
}

function versionFor(taskId: string): number {
  return versions.get(taskId) ?? 1;
}

export const sync = {
  async pull(): Promise<Task[] | null> {
    const state = auth.load();
    if (state.mode !== "account" || !state.tokens) return null;
    setTokens(state.tokens);

    const lastSync = localStorage.getItem("brd_last_sync") || undefined;
    console.log(`Pull: last_sync=${lastSync || "(none)"}`);
    const all: Task[] = [];
    let cursor: string | undefined;

    while (true) {
      const res = await api.tasks.list({ since: lastSync, status: "all", take: 100, cursor });
      const tasks = res.tasks.map(fromDTO);
      for (const t of tasks) {
        console.log(`Pull fetched: id=${t.id} title="${t.title}"`);
      }
      all.push(...tasks);
      if (!res.next_cursor) break;
      cursor = res.next_cursor;
    }

    if (all.length > 0) {
      localStorage.setItem("brd_last_sync", new Date().toISOString());
    }
    return all;
  },

  async push(tasks: Task[], deletedIds?: string[], completedIds?: string[]): Promise<{ tasks: Task[]; deleted_ids: string[]; conflicts: any[] } | null> {
    const state = auth.load();
    if (state.mode !== "account" || !state.tokens) return null;
    setTokens(state.tokens);

    const lastSync = localStorage.getItem("brd_last_sync") || new Date().toISOString();
    const payload: SyncPayload = {
      tasks: tasks.map(toSyncItem),
      last_sync_at: lastSync,
      deleted_ids: deletedIds && deletedIds.length > 0 ? deletedIds : undefined,
      completed_ids: completedIds && completedIds.length > 0 ? completedIds : undefined,
    };

    for (const t of payload.tasks) {
      console.log(`Push sending: id=${t.id} title="${t.title}"`);
    }
    if (payload.deleted_ids) {
      for (const id of payload.deleted_ids) {
        console.log(`Push deleted: id=${id}`);
      }
    }
    if (payload.completed_ids) {
      for (const id of payload.completed_ids) {
        console.log(`Push completed: id=${id}`);
      }
    }

    const res = await api.sync(payload);
    localStorage.setItem("brd_last_sync", res.sync_at);

    const remoteTasks: Task[] = [];
    for (const t of res.tasks) {
      if (t?.version != null) versions.set(t.id, t.version);
      remoteTasks.push(fromDTO(t));
      console.log(`Push received remote: id=${t.id} title="${t.title}"`);
    }

    for (const id of res.deleted_ids || []) {
      console.log(`Push received deleted: id=${id}`);
    }

    if (res.conflicts && res.conflicts.length > 0) {
      console.warn("Sync conflicts:", JSON.stringify(res.conflicts));
    }

    return { tasks: remoteTasks, deleted_ids: res.deleted_ids || [], conflicts: res.conflicts || [] };
  },

  async createTask(task: Task): Promise<number | undefined> {
    const state = auth.load();
    if (state.mode !== "account" || !state.tokens) return;
    setTokens(state.tokens);

    console.log(`Sync individual create: id=${task.id} title="${task.title}"`);
    const res = await api.tasks.create({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      tags: task.tags,
      notes: task.notes,
      expiry_hours: 24,
      created_at: task.created_at,
    });

    const ver = res.task?.version;
    if (ver != null) versions.set(task.id, ver);
    console.log(`Sync individual create ok: id=${task.id} serverVersion=${ver}`);
    return ver;
  },

  async updateTask(task: Task, retried?: boolean): Promise<void> {
    const state = auth.load();
    if (state.mode !== "account" || !state.tokens) return;
    setTokens(state.tokens);

    const v = versionFor(task.id);
    console.log(`Sync individual update: id=${task.id} title="${task.title}" completed=${task.completed} version=${v}`);
    let res: { task?: { version?: number } };
    try {
      res = await api.tasks.update(task.id, {
        title: task.title,
        priority: task.priority,
        tags: task.tags,
        notes: task.notes,
        completed: task.completed,
        version: v,
      });
    } catch (e: any) {
      if (e?.status === 409 && !retried) {
        const serverVer = e.serverTask?.version;
        if (serverVer != null) {
          versions.set(task.id, serverVer);
          console.log(`Sync update 409: id=${task.id} retrying with version=${serverVer}`);
          return sync.updateTask(task, true);
        }
      }
      throw e;
    }

    const ver = res.task?.version;
    if (ver != null) versions.set(task.id, ver);
    console.log(`Sync individual update ok: id=${task.id} version=${ver}`);
  },

  async deleteTask(id: string): Promise<void> {
    const state = auth.load();
    if (state.mode !== "account" || !state.tokens) return;
    setTokens(state.tokens);

    console.log(`Sync individual delete: id=${id}`);
    await api.tasks.delete(id);
    console.log(`Sync individual delete ok: id=${id}`);
  },
};
