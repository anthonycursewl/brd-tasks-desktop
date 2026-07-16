import { useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { Task } from "../../types";
import { TaskCard } from "../TaskCard/TaskCard";
import "./TaskList.css";

interface TaskListProps {
  activeTasks: Task[];
  completedTasks: Task[];
  syncingIds: Set<string>;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDetail: (id: string) => void;
  onUpdate: (
    id: string,
    title: string,
    priority?: string,
    tags?: string[],
    notes?: string,
    expiryHours?: number | null,
  ) => void;
}

export function TaskList({ activeTasks, completedTasks, syncingIds, onToggle, onDelete, onDetail, onUpdate }: TaskListProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const toggleCompleted = useCallback(() => setShowCompleted((v) => !v), []);

  return (
    <div className="task-list">
      <div className="task-list-header">
        <span className="task-count">
          <span className="task-count-number">{activeTasks.length}</span>{" "}
          {activeTasks.length === 1 ? "task" : "tasks"}
        </span>
        {activeTasks.length + completedTasks.length > 0 && (
          <div className="completion-status">
            <div className="completion-bar">
              <div
                className="completion-fill"
                style={{
                  width: `${
                    activeTasks.length + completedTasks.length > 0
                      ? Math.round((completedTasks.length / (activeTasks.length + completedTasks.length)) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <span className="completion-text">
              {activeTasks.length + completedTasks.length > 0
                ? Math.round((completedTasks.length / (activeTasks.length + completedTasks.length)) * 100)
                : 0}
              %
            </span>
          </div>
        )}
      </div>

      {activeTasks.length === 0 && completedTasks.length === 0 && (
        <p className="empty">No tasks to do. You're all caught up!</p>
      )}

      {activeTasks.map((task) => (
        <TaskCard key={task.id} task={task} syncing={syncingIds.has(task.id)} onToggle={onToggle} onDelete={onDelete} onDetail={onDetail} onUpdate={onUpdate} />
      ))}

      {completedTasks.length > 0 && (
        <div className="completed-section">
          <button className="completed-toggle" onClick={toggleCompleted}>
            <ChevronDown size={12} className={`chevron ${showCompleted ? "open" : ""}`} />
            <span>{completedTasks.length} completed</span>
          </button>
          {showCompleted && (
            <div className="completed-list">
              {completedTasks.map((task) => (
                <TaskCard key={task.id} task={task} syncing={syncingIds.has(task.id)} onToggle={onToggle} onDelete={onDelete} onDetail={onDetail} onUpdate={onUpdate} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
