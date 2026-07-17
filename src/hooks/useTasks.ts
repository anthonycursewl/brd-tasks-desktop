import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Task } from "../types";
import { sync } from "../services/sync";
import { auth } from "../services/auth";
import { useNotify } from "../contexts/NotificationContext";

const SYNC_TIMEOUT = 15000;

const priorityWeight: Record<string, number> = {
  urgent: 0, high: 1, medium: 2, low: 3,
};

function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const wa = priorityWeight[a.priority] ?? 2;
    const wb = priorityWeight[b.priority] ?? 2;
    return wa - wb;
  });
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const dirtyRef = useRef(false);
  const dirtyTaskIdsRef = useRef<Set<string>>(new Set());
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const syncTimeoutsRef = useRef<Map<string, number>>(new Map());
  const { notify } = useNotify();

  const loadTasks = useCallback(async () => {
    try {
      const result = await invoke<Task[]>("get_tasks");
      setTasks(result);
    } finally {
      setLoading(false);
    }
  }, []);

  const markDirty = useCallback((taskIds?: string[], deletedIds?: string[]) => {
    if (taskIds) {
      for (const id of taskIds) dirtyTaskIdsRef.current.add(id);
    }
    dirtyRef.current = dirtyTaskIdsRef.current.size > 0;
    if (deletedIds) for (const id of deletedIds) deletedIdsRef.current.add(id);
  }, []);

  const clearDirty = useCallback((taskIds?: string[]) => {
    if (taskIds) {
      for (const id of taskIds) dirtyTaskIdsRef.current.delete(id);
    } else {
      dirtyTaskIdsRef.current.clear();
    }
    dirtyRef.current = dirtyTaskIdsRef.current.size > 0;
  }, []);

  const removeSyncing = useCallback((taskId: string) => {
    const existing = syncTimeoutsRef.current.get(taskId);
    if (existing) { clearTimeout(existing); syncTimeoutsRef.current.delete(taskId); }
    setSyncingIds((prev) => { const next = new Set(prev); next.delete(taskId); return next; });
  }, []);

  const addSyncing = useCallback((taskId: string) => {
    setSyncingIds((prev) => new Set(prev).add(taskId));
    const timeout = window.setTimeout(() => removeSyncing(taskId), SYNC_TIMEOUT);
    syncTimeoutsRef.current.set(taskId, timeout);
    return taskId;
  }, [removeSyncing]);

  const syncInBackground = useCallback(async (taskId: string, action: () => Promise<void>, rollback?: () => Promise<void>) => {
    addSyncing(taskId);
    try {
      await action();
      removeSyncing(taskId);
    } catch (e: any) {
      console.error(`[Sync ${taskId}]`, e);
      removeSyncing(taskId);
      if (rollback) {
        try { await rollback(); } catch (rb) { console.error(`[Rollback ${taskId}]`, rb); }
        await loadTasks();
      }
      notify(typeof e?.message === "string" ? e.message : "Error al sincronizar");
    }
  }, [addSyncing, removeSyncing, loadTasks, notify]);

  const applyRemoteChanges = useCallback(async (remote: Task[], deleted: string[], conflicts?: { task_id: string; server_task: any }[]) => {
    if (remote.length === 0 && deleted.length === 0 && (!conflicts || conflicts.length === 0)) return false;
    for (const t of remote) {
      await invoke("upsert_task", {
        id: t.id,
        title: t.title,
        description: t.description ?? "",
        completed: t.completed,
        completed_at: t.completed_at,
        priority: t.priority,
        tags: t.tags,
        notes: t.notes,
        created_at: t.created_at,
        expires_at: t.expires_at,
        updated_at: t.updated_at,
        deleted_at: t.deleted_at,
        version: t.version ?? null,
      }).catch(() => {});
    }
    for (const c of conflicts || []) {
      const s = c.server_task;
      await invoke("upsert_task", {
        id: c.task_id,
        title: s.title,
        description: s.description ?? "",
        completed: s.completed,
        completed_at: s.completed_at ?? null,
        priority: s.priority,
        tags: s.tags,
        notes: s.notes,
        created_at: s.created_at,
        expires_at: s.expires_at,
        updated_at: s.updated_at,
        deleted_at: s.deleted_at ?? null,
        version: s.version ?? null,
      }).catch(() => {});
    }
    for (const id of deleted) {
      const exists = tasksRef.current.some((local) => local.id === id);
      if (exists) {
        await invoke("delete_task", { id }).catch(() => {});
      }
    }
    return true;
  }, []);

  const syncNow = useCallback(async () => {
    const state = auth.load();
    if (state.mode !== "account") return;
    const needsFullSync = localStorage.getItem("brd_needs_full_sync") === "true";
    if (needsFullSync) localStorage.removeItem("brd_needs_full_sync");
    try {
      const deleted = [...deletedIdsRef.current];
      const tasksToSync = needsFullSync
        ? tasksRef.current
        : tasksRef.current.filter((t) => dirtyTaskIdsRef.current.has(t.id) && !syncingIds.has(t.id));

      if (!needsFullSync && tasksToSync.length === 0 && deleted.length === 0) {
        const pulled = await sync.pull();
        if (pulled && pulled.length > 0) {
          console.log(`Sync pull: ${pulled.length} tasks`);
          const changed = await applyRemoteChanges(pulled, []);
          if (changed) await loadTasks();
        } else {
          console.log("Sync pull: 0 tasks");
        }
        return;
      }

      const lastSyncAt = localStorage.getItem("brd_last_sync") || new Date(0).toISOString();
      console.log(`SyncAll: ${tasksToSync.length} tasks, ${deleted.length} deleted, lastSyncAt=${lastSyncAt}${needsFullSync ? " (full)" : ""}`);
      const result = await sync.syncAll(tasksToSync, deleted, lastSyncAt);
      if (result) {
        deletedIdsRef.current.clear();
        clearDirty();
        console.log(`SyncAll complete: ${result.tasks.length} remote, ${result.deleted_ids.length} deleted, ${result.conflicts.length} conflicts`);
        const changed = await applyRemoteChanges(result.tasks, result.deleted_ids, result.conflicts);
        if (changed) await loadTasks();
      }
      if (needsFullSync) notify("Tareas sincronizadas", "success");
    } catch (e: any) {
      console.error("[Sync]", e);
      notify(typeof e?.message === "string" ? e.message : "Error al sincronizar");
    }
  }, [loadTasks, notify, applyRemoteChanges, syncingIds, clearDirty]);

  const triggerSync = useCallback(() => {
    localStorage.setItem("brd_needs_full_sync", "true");
    syncNow();
  }, [syncNow]);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(() => {
      invoke("cleanup_expired").then(() => loadTasks()).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [loadTasks]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => syncNow(), 60000);
    return () => clearInterval(interval);
  }, [syncNow]);

  useEffect(() => {
    return () => {
      for (const t of syncTimeoutsRef.current.values()) clearTimeout(t);
      syncTimeoutsRef.current.clear();
    };
  }, []);

  const addTask = useCallback(
    async (title: string, description?: string, priority?: string, tags?: string[], notes?: string, expiryMinutes?: number) => {
      if (!title.trim()) return;
      try {
        const created = await invoke<Task>("add_task", {
          title: title.trim(),
          description: description ?? "",
          priority: priority ?? "medium",
          tags: tags ?? [],
          notes: notes ?? "",
          expiryMinutes: expiryMinutes ?? null,
        });
        console.log(`Task created: id=${created.id} title="${created.title}"`);
        await loadTasks();
        markDirty([created.id]);
        if (auth.load().mode === "account") {
          syncInBackground(
            created.id,
            async () => { await sync.createTask(created); },
            () => invoke("delete_task", { id: created.id }).then(() => {}),
          );
        }
      } catch (e: any) {
        console.error("[Add task]", e);
        notify(typeof e?.message === "string" ? e.message : "Error al crear tarea");
      }
    },
    [loadTasks, markDirty, syncInBackground, notify],
  );

  const updateTask = useCallback(
    async (id: string, title: string, priority?: string, tags?: string[], notes?: string, expiryMinutes?: number | null) => {
      const prev = tasksRef.current.find((t) => t.id === id);
      if (!prev) return;
      try {
        await invoke("update_task", {
          id, title,
          priority: priority ?? "medium",
          tags: tags ?? [],
          notes: notes ?? "",
          expiryMinutes: expiryMinutes ?? null,
        });
        await loadTasks();
        markDirty([id]);
        if (auth.load().mode === "account") {
          syncInBackground(
            id,
            () => sync.updateTask({ ...prev, title, priority: priority ?? prev.priority, tags: tags ?? prev.tags, notes: notes ?? prev.notes } as Task),
            () => invoke("update_task", { id, title: prev.title, priority: prev.priority, tags: prev.tags, notes: prev.notes, expiryMinutes: null }).then(() => {}),
          );
        }
      } catch (e: any) {
        console.error("[Update task]", e);
        notify(typeof e?.message === "string" ? e.message : "Error al actualizar tarea");
      }
    },
    [loadTasks, markDirty, syncInBackground, notify],
  );

  const toggleTask = useCallback(
    async (id: string) => {
      const prev = tasksRef.current.find((t) => t.id === id);
      if (!prev) return;
      try {
        await invoke("toggle_task", { id });
        await loadTasks();
        markDirty([id]);
        if (auth.load().mode === "account") {
          syncInBackground(
            id,
            async () => {
              const result = await invoke<Task[]>("get_tasks");
              const toggled = result.find((t) => t.id === id);
              if (toggled) await sync.updateTask(toggled);
            },
            () => invoke("toggle_task", { id }).then(() => {}),
          );
        }
      } catch (e: any) {
        console.error("[Toggle task]", e);
        notify(typeof e?.message === "string" ? e.message : "Error al completar tarea");
      }
    },
    [loadTasks, markDirty, syncInBackground, notify],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const prev = tasksRef.current.find((t) => t.id === id);
      if (!prev) return;
      try {
        await invoke("delete_task", { id });
        await loadTasks();
        markDirty(undefined, [id]);
        if (auth.load().mode === "account") {
          syncInBackground(
            id,
            () => sync.deleteTask(id),
            () => invoke("add_task", { id: prev.id, title: prev.title, description: prev.description, priority: prev.priority, tags: prev.tags, notes: prev.notes, expiryMinutes: null }).then(() => {}),
          );
        }
      } catch (e: any) {
        console.error("[Delete task]", e);
        notify(typeof e?.message === "string" ? e.message : "Error al eliminar tarea");
      }
    },
    [loadTasks, markDirty, syncInBackground, notify],
  );

  const expiredTasks = useMemo(
    () => tasks.filter((t) => !t.completed && new Date(t.expires_at).getTime() <= now),
    [tasks, now],
  );
  const activeTasks = useMemo(
    () => sortByPriority(tasks.filter((t) => !t.completed && new Date(t.expires_at).getTime() > now)),
    [tasks, now],
  );
  const completedTasks = useMemo(() => tasks.filter((t) => t.completed), [tasks]);

  return { tasks, activeTasks, expiredTasks, completedTasks, loading, now, syncingIds, addTask, updateTask, toggleTask, deleteTask, triggerSync };
}
