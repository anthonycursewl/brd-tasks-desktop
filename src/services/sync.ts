import { Task } from "../types";
import { SyncFlatPayload, SyncConflict } from "../types/api";
import { api, setTokens } from "./api";
import { auth } from "./auth";

const versions = new Map<string, number>();
const VERSIONS_KEY = "brd_task_versions";

function loadVersions() {
  try {
    const raw = localStorage.getItem(VERSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "number") versions.set(k, v);
      }
    }
  } catch {}
}

function saveVersions() {
  try {
    const obj: Record<string, number> = {};
    for (const [k, v] of versions) obj[k] = v;
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(obj));
  } catch {}
}

loadVersions();

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
    updated_at: task.updated_at,
    version: task.version ?? versions.get(task.id) ?? 1,
    deleted_at: task.deleted_at,
  };
}

function fromDTO(dto: any): Task {
  if (dto?.version != null) { versions.set(dto.id, dto.version); saveVersions(); }
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description || "",
    completed: dto.completed,
    completed_at: dto.completed_at ?? null,
    priority: dto.priority || "medium",
    tags: dto.tags || [],
    notes: dto.notes || "",
    created_at: dto.created_at,
    expires_at: dto.expires_at,
    updated_at: dto.updated_at,
    deleted_at: dto.deleted_at ?? null,
    version: dto.version ?? versions.get(dto.id) ?? 1,
  };
}

function versionFor(taskId: string): number {
  return versions.get(taskId) ?? 1;
}

export const sync = {
  async syncAll(
    localTasks: Task[],
    deletedIds: string[],
    lastSyncAt: string,
  ): Promise<{ syncAt: string; tasks: Task[]; deleted_ids: string[]; conflicts: SyncConflict[] } | null> {
    const state = auth.load();
    if (state.mode !== "account" || !state.tokens) return null;
    setTokens(state.tokens);

    let cursor: string | null = null;
    let hasMore = true;
    let syncAt = lastSyncAt;
    const allRemoteTasks: Task[] = [];
    const allDeletedIds: string[] = [];
    const allConflicts: SyncConflict[] = [];

    const changedTasks = localTasks.filter((t) => {
      if (!t.updated_at) return true;
      return t.updated_at > lastSyncAt;
    });
    console.log(`SyncAll: ${localTasks.length} input, ${changedTasks.length} changed since ${lastSyncAt}, ${deletedIds.length} deleted`);
    const taskItems = changedTasks.map(toSyncItem);

    while (hasMore) {
      const payload: SyncFlatPayload = {
        tasks: taskItems,
        deleted_ids: deletedIds,
        last_sync_at: syncAt,
        take: 50,
        cursor,
      };

      console.log(`Sync page: cursor=${cursor ?? "(start)"} tasks=${taskItems.length} deleted=${deletedIds.length}`);
      const res = await api.sync(payload);
      syncAt = res.sync_at || syncAt;

      for (const t of res.tasks) {
        if (t?.version != null) { versions.set(t.id, t.version); saveVersions(); }
        allRemoteTasks.push(fromDTO(t));
        console.log(`Sync received: id=${t.id} title="${t.title}" version=${t.version}`);
      }

      for (const id of res.deleted_ids || []) {
        allDeletedIds.push(id);
        console.log(`Sync deleted: id=${id}`);
      }

      if (res.conflicts && res.conflicts.length > 0) {
        allConflicts.push(...res.conflicts);
        console.warn("Sync conflicts:", JSON.stringify(res.conflicts));
      }

      cursor = res.next_cursor;
      hasMore = res.has_more;
    }

    localStorage.setItem("brd_last_sync", syncAt);
    console.log(`Sync complete: ${allRemoteTasks.length} remote, ${allDeletedIds.length} deleted, ${allConflicts.length} conflicts`);

    return { syncAt, tasks: allRemoteTasks, deleted_ids: allDeletedIds, conflicts: allConflicts };
  },

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

  async createTask(task: Task): Promise<number | undefined> {
    const state = auth.load();
    if (state.mode !== "account" || !state.tokens) return;
    setTokens(state.tokens);

    console.log(`Sync individual create: id=${task.id} title="${task.title}"`);
    const createdMs = new Date(task.created_at).getTime();
    const expiresMs = new Date(task.expires_at).getTime();
    const expiryHours = Math.max(1/60, (expiresMs - createdMs) / 3600000);
    const res = await api.tasks.create({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      tags: task.tags,
      notes: task.notes,
      expiry_hours: parseFloat(expiryHours.toFixed(6)),
      created_at: task.created_at,
    });

    const ver = res.task?.version;
    if (ver != null) { versions.set(task.id, ver); saveVersions(); }
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
      const createdMs = new Date(task.created_at).getTime();
      const expiresMs = new Date(task.expires_at).getTime();
      res = await api.tasks.update(task.id, {
        title: task.title,
        priority: task.priority,
        tags: task.tags,
        notes: task.notes,
        completed: task.completed,
        expiry_hours: parseFloat(Math.max(1/60, (expiresMs - createdMs) / 3600000).toFixed(6)),
        version: v,
      });
    } catch (e: any) {
      if (e?.status === 409 && !retried) {
        const serverVer = e.serverTask?.version;
        if (serverVer != null) {
          versions.set(task.id, serverVer); saveVersions();
          console.log(`Sync update 409: id=${task.id} retrying with version=${serverVer}`);
          return sync.updateTask(task, true);
        }
      }
      throw e;
    }

    const ver = res.task?.version;
    if (ver != null) { versions.set(task.id, ver); saveVersions(); }
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
