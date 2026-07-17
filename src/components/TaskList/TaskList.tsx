import { useState, useCallback, memo } from "react";
import { ChevronDown } from "lucide-react";
import { Task } from "../../types";
import { TaskCard } from "../TaskCard/TaskCard";
import "./TaskList.css";

interface TaskListProps {
  activeTasks: Task[];
  expiredTasks: Task[];
  completedTasks: Task[];
  now: number;
  syncingIds: Set<string>;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDetail: (task: Task) => void;
  onUpdate: (
    id: string,
    title: string,
    priority?: string,
    tags?: string[],
    notes?: string,
    expiryMinutes?: number | null,
  ) => void;
}

const INITIAL_RENDER = 100;

export const TaskList = memo(function TaskList({ activeTasks, expiredTasks, completedTasks, now, syncingIds, onToggle, onDelete, onDetail, onUpdate }: TaskListProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [completedCount, setCompletedCount] = useState(INITIAL_RENDER);
  const [expiredCount, setExpiredCount] = useState(INITIAL_RENDER);
  const toggleCompleted = useCallback(() => {
    setShowCompleted((v) => !v);
    setCompletedCount(INITIAL_RENDER);
  }, []);
  const toggleExpired = useCallback(() => {
    setShowExpired((v) => !v);
    setExpiredCount(INITIAL_RENDER);
  }, []);

  const total = activeTasks.length + completedTasks.length;

  return (
    <div className="task-list">
      <div className="task-list-header">
        <span className="task-count">
          <span className="task-count-number">{activeTasks.length}</span>{" "}
          {activeTasks.length === 1 ? "task" : "tasks"}
        </span>
        {total > 0 && (
          <div className="completion-status">
            <div className="completion-bar">
              <div
                className="completion-fill"
                style={{
                  width: `${Math.round((completedTasks.length / total) * 100)}%`,
                }}
              />
            </div>
            <span className="completion-text">
              {Math.round((completedTasks.length / total) * 100)}%
            </span>
          </div>
        )}
      </div>

      {activeTasks.length === 0 && (
        <p className="empty">No tasks to do. You're all caught up!</p>
      )}

      {activeTasks.map((task) => (
        <TaskCard key={task.id} task={task} now={now} syncing={syncingIds.has(task.id)} onToggle={onToggle} onDelete={onDelete} onDetail={onDetail} onUpdate={onUpdate} />
      ))}

      {expiredTasks.length > 0 && (
        <div className="completed-section">
          <button className="completed-toggle expired-toggle" onClick={toggleExpired}>
            <ChevronDown size={12} className={`chevron ${showExpired ? "open" : ""}`} />
            <span>{expiredTasks.length} expired</span>
          </button>
          {showExpired && (
            <div className="completed-list">
              {expiredTasks.slice(0, expiredCount).map((task) => (
                <TaskCard key={task.id} task={task} now={now} syncing={syncingIds.has(task.id)} onToggle={onToggle} onDelete={onDelete} onDetail={onDetail} onUpdate={onUpdate} />
              ))}
              {expiredTasks.length > expiredCount && (
                <button className="show-more-btn" onClick={() => setExpiredCount((c) => c + INITIAL_RENDER)}>
                  Show {Math.min(INITIAL_RENDER, expiredTasks.length - expiredCount)} more ({expiredTasks.length - expiredCount} remaining)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="completed-section">
          <button className="completed-toggle" onClick={toggleCompleted}>
            <ChevronDown size={12} className={`chevron ${showCompleted ? "open" : ""}`} />
            <span>{completedTasks.length} completed</span>
          </button>
          {showCompleted && (
            <div className="completed-list">
              {completedTasks.slice(0, completedCount).map((task) => (
                <TaskCard key={task.id} task={task} now={now} syncing={syncingIds.has(task.id)} onToggle={onToggle} onDelete={onDelete} onDetail={onDetail} onUpdate={onUpdate} />
              ))}
              {completedTasks.length > completedCount && (
                <button className="show-more-btn" onClick={() => setCompletedCount((c) => c + INITIAL_RENDER)}>
                  Show {Math.min(INITIAL_RENDER, completedTasks.length - completedCount)} more ({completedTasks.length - completedCount} remaining)
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
