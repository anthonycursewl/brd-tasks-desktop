import { useState, useEffect, useCallback, useReducer } from "react";
import { X, Flag, Tag, Calendar, Trash2, Circle, Check } from "lucide-react";
import { Task } from "../../types";
import { getRemainingDetailed } from "../../utils/time";
import "./TaskDetail.css";

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const priorityMeta: Record<string, { label: string; color: string }> = {
  low:    { label: "Low",    color: "#6b7280" },
  medium: { label: "Medium", color: "#eab308" },
  high:   { label: "High",   color: "#ef4444" },
  urgent: { label: "Urgent", color: "#dc2626" },
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function padded(n: number): string {
  return n.toString().padStart(2, "0");
}

export function TaskDetail({ task, onClose, onToggle, onDelete }: TaskDetailProps) {
  const [closing, setClosing] = useState(false);
  const [, tick] = useReducer((x: number) => x + 1, 0);
  const [ready, setReady] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => tick(), 1000);
    return () => clearInterval(timer);
  }, []);

  const rem = getRemainingDetailed(task.expires_at);
  const pri = priorityMeta[task.priority] || priorityMeta.medium;

  return (
    <div className={`td-overlay${closing ? " closing" : ""}`} onClick={handleClose}>
      <div className={`td-panel${closing ? " closing" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="td-head">
          <img src="/brd/brd_dark_logo_nobg.png" className="td-logo" alt="" />
          <span className="td-title"><span className="td-l">Ta</span><span className="td-d">sk</span></span>
          <button className="td-close" onClick={handleClose}><X size={14} /></button>
        </div>

        <div className={`td-body ${ready ? "ready" : ""}`}>
          <h2 className="td-task-title">{task.title}</h2>

          {task.description && <p className="td-desc">{task.description}</p>}

          <div className="td-meta-list">
            <div className="td-meta-row">
              <Flag size={12} style={{ color: pri.color }} />
              <span className="td-meta-label">Priority</span>
              <span className="td-meta-val" style={{ color: pri.color }}>{pri.label}</span>
            </div>

            {task.tags.length > 0 && (
              <div className="td-meta-row">
                <Tag size={12} />
                <span className="td-meta-label">Tags</span>
                <span className="td-meta-val">{task.tags.join(", ")}</span>
              </div>
            )}

            <div className="td-meta-row">
              <Calendar size={12} />
              <span className="td-meta-label">Created</span>
              <span className="td-meta-val">{formatDate(task.created_at)}</span>
            </div>

            <div className="td-meta-row">
              <Calendar size={12} />
              <span className="td-meta-label">Expires</span>
              <span className="td-meta-val">{formatDate(task.expires_at)}</span>
            </div>
          </div>

          {task.notes && <p className="td-notes">{task.notes}</p>}

          <div className="td-divider" />

          <div className={`td-timer ${rem.expired ? "expired" : ""}`}>
            {rem.expired ? (
              <span className="td-timer-exp">Expired</span>
            ) : rem.days > 0 ? (
              <>
                <span className="td-timer-num">{rem.days}</span>
                <span className="td-timer-unit">d</span>
                <span className="td-timer-sep">:</span>
                <span className="td-timer-num">{padded(rem.hours)}</span>
                <span className="td-timer-unit">h</span>
                <span className="td-timer-sep">:</span>
                <span className="td-timer-num">{padded(rem.minutes)}</span>
                <span className="td-timer-unit">m</span>
              </>
            ) : (
              <>
                <span className="td-timer-num">{padded(rem.hours)}</span>
                <span className="td-timer-sep">:</span>
                <span className="td-timer-num">{padded(rem.minutes)}</span>
                <span className="td-timer-sep">:</span>
                <span className="td-timer-num">{padded(rem.seconds)}</span>
              </>
            )}
          </div>
          <span className="td-timer-label">
            {rem.expired ? "This task has expired" : "remaining"}
          </span>

          <div className="td-actions">
            <button className="td-action-btn complete" onClick={() => { onToggle(task.id); onClose(); }}>
              {task.completed ? <Circle size={12} /> : <Check size={12} />}
              {task.completed ? "Reopen" : "Complete"}
            </button>
            <button className="td-action-btn delete" onClick={() => { onDelete(task.id); onClose(); }}>
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
