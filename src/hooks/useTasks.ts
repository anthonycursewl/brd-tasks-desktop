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
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const dirtyRef = useRef(false);
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const completedIdsRef = useRef<Set<string>>(new Set());
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

  const markDirty = useCallback((deletedIds?: string[], completedIds?: string[]) => {
    dirtyRef.current = true;
    if (deletedIds) for (const id of deletedIds) deletedIdsRef.current.add(id);
    if (completedIds) for (const id of completedIds) completedIdsRef.current.add(id);
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

  const applyRemoteChanges = useCallback(async (remote: Task[], deleted: string[]) => {
    if (remote.length === 0 && deleted.length === 0) return false;
    for (const t of remote) {
      const exists = tasksRef.current.some((local) => local.id === t.id);
      if (exists) {
        console.log(`Apply remote update: id=${t.id} title="${t.title}"`);
        await invoke("update_task", {
          id: t.id, title: t.title, priority: t.priority,
          tags: t.tags, notes: t.notes, expiryHours: null,
        }).catch(() => {});
      } else {
        console.log(`Apply remote add: id=${t.id} title="${t.title}"`);
        await invoke("add_task", {
          id: t.id, title: t.title, description: t.description, priority: t.priority,
          tags: t.tags, notes: t.notes,
        }).catch(() => {});
      }
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
    let didPush = false;
    try {
      if (needsFullSync) {
        localStorage.removeItem("brd_needs_full_sync");
        const deleted = [...deletedIdsRef.current];
        const completed = [...completedIdsRef.current];
        deletedIdsRef.current.clear();
        completedIdsRef.current.clear();
        console.log(`Sync full push: ${tasksRef.current.length} tasks, ${deleted.length} deleted, ${completed.length} completed`);
        const result = await sync.push(tasksRef.current, deleted, completed);
        if (result) {
          didPush = true;
          console.log(`Sync push response: ${result.tasks.length} remote, ${result.deleted_ids.length} deleted`);
          const changed = await applyRemoteChanges(result.tasks, result.deleted_ids);
          if (changed) await loadTasks();
        }
        notify("Tareas sincronizadas", "success");
      } else if (dirtyRef.current) {
        dirtyRef.current = false;
        const deleted = [...deletedIdsRef.current];
        const completed = [...completedIdsRef.current];
        deletedIdsRef.current.clear();
        completedIdsRef.current.clear();
        const syncing = new Set(syncingIds);
        const tasksToPush = tasksRef.current.filter((t) => !syncing.has(t.id));
        console.log(`Sync dirty push: ${tasksToPush.length}/${tasksRef.current.length} tasks, ${deleted.length} deleted, ${completed.length} completed`);
        const result = await sync.push(tasksToPush, deleted, completed);
        if (result) {
          didPush = true;
          console.log(`Sync push response: ${result.tasks.length} remote, ${result.deleted_ids.length} deleted`);
          const changed = await applyRemoteChanges(result.tasks, result.deleted_ids);
          if (changed) await loadTasks();
        }
      }
      if (!didPush) {
        const pulled = await sync.pull();
        if (pulled && pulled.length > 0) {
          console.log(`Sync pull: ${pulled.length} tasks`);
          const changed = await applyRemoteChanges(pulled, []);
          if (changed) await loadTasks();
        } else {
          console.log("Sync pull: 0 tasks");
        }
      }
    } catch (e: any) {
      console.error("[Sync]", e);
      notify(typeof e?.message === "string" ? e.message : "Error al sincronizar");
    }
  }, [loadTasks, notify, applyRemoteChanges, syncingIds]);

  const triggerSync = useCallback(() => {
    localStorage.setItem("brd_needs_full_sync", "true");
    syncNow();
  }, [syncNow]);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(() => {
      invoke("cleanup_expired").catch(() => {});
    }, 300000);
    return () => clearInterval(interval);
  }, [loadTasks]);

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
    async (title: string, description?: string, priority?: string, tags?: string[], notes?: string, expiryHours?: number) => {
      if (!title.trim()) return;
      try {
        const created = await invoke<Task>("add_task", {
          title: title.trim(),
          description: description ?? "",
          priority: priority ?? "medium",
          tags: tags ?? [],
          notes: notes ?? "",
          expiryHours: expiryHours ?? null,
        });
        console.log(`Task created: id=${created.id} title="${created.title}"`);
        await loadTasks();
        markDirty();
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
    async (id: string, title: string, priority?: string, tags?: string[], notes?: string, expiryHours?: number | null) => {
      const prev = tasksRef.current.find((t) => t.id === id);
      if (!prev) return;
      try {
        await invoke("update_task", {
          id, title,
          priority: priority ?? "medium",
          tags: tags ?? [],
          notes: notes ?? "",
          expiryHours: expiryHours ?? null,
        });
        await loadTasks();
        markDirty(undefined, [id]);
        if (auth.load().mode === "account") {
          syncInBackground(
            id,
            () => sync.updateTask({ id, title, priority: priority ?? "medium", tags: tags ?? [], notes: notes ?? "" } as Task),
            () => invoke("update_task", { id, title: prev.title, priority: prev.priority, tags: prev.tags, notes: prev.notes, expiryHours: null }).then(() => {}),
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
      try {
        await invoke("toggle_task", { id });
        await loadTasks();
        markDirty(undefined, [id]);
        if (auth.load().mode === "account" && prev) {
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
        markDirty([id]);
        if (auth.load().mode === "account") {
          syncInBackground(
            id,
            () => sync.deleteTask(id),
            () => invoke("add_task", { id: prev.id, title: prev.title, description: prev.description, priority: prev.priority, tags: prev.tags, notes: prev.notes, expiryHours: null }).then(() => {}),
          );
        }
      } catch (e: any) {
        console.error("[Delete task]", e);
        notify(typeof e?.message === "string" ? e.message : "Error al eliminar tarea");
      }
    },
    [loadTasks, markDirty, syncInBackground, notify],
  );

  const activeTasks = useMemo(() => sortByPriority(tasks.filter((t) => !t.completed)), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.completed), [tasks]);

  return { tasks, activeTasks, completedTasks, loading, syncingIds, addTask, updateTask, toggleTask, deleteTask, triggerSync };
}
