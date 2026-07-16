import { TaskDTO } from "../types/api";

const cache = new Map<string, { task: TaskDTO; fetchedAt: number }>();
const MAX = 40;

export function getCached(id: string): TaskDTO | undefined {
  return cache.get(id)?.task;
}

export function setCached(task: TaskDTO): void {
  if (cache.has(task.id)) {
    cache.set(task.id, { task, fetchedAt: Date.now() });
    return;
  }
  if (cache.size >= MAX) {
    const oldest = cache.entries().next().value;
    if (oldest) cache.delete(oldest[0]);
  }
  cache.set(task.id, { task, fetchedAt: Date.now() });
}
