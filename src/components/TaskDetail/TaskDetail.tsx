import { useState, useEffect, useCallback } from "react";
import { X, Flag, Tag, Calendar, Trash2, Circle, Check } from "lucide-react";
import { Task } from "../../types";
import { TaskDTO } from "../../types/api";
import { api, setTokens } from "../../services/api";
import { auth } from "../../services/auth";
import { getCached, setCached } from "../../services/taskCache";
import "./TaskDetail.css";

interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function dtoToTask(dto: TaskDTO): Task {
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
    version: dto.version,
  };
}

function fromDTO(dto: TaskDTO): Task {
  return dtoToTask(dto);
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
  } catch { return iso; }
}

function calcRemaining(expiresAt: string, now: number) {
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const total = Math.floor(diff / 1000);
  return {
    total, expired: false,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`td-skel ${className || ""}`} />;
}

export function TaskDetail({ taskId, onClose, onToggle, onDelete }: TaskDetailProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [ready, setReady] = useState(false);

  const fetchTask = useCallback(async () => {
    setLoading(true);
    setReady(false);
    setError("");

    const cached = getCached(taskId);
    if (cached) {
      setTask(fromDTO(cached));
      setLoading(false);
      requestAnimationFrame(() => setReady(true));
    }

    const state = auth.load();
    if (state.mode === "account" && state.tokens) {
      setTokens(state.tokens);
      try {
        const res = await api.tasks.getById(taskId);
        setCached(res.task);
        setTask(fromDTO(res.task));
        setLoading(false);
        requestAnimationFrame(() => setReady(true));
      } catch (e: any) {
        if (!cached) {
          setError(typeof e?.message === "string" ? e.message : "Error al cargar tarea");
          setLoading(false);
        }
      }
    } else {
      if (!cached) {
        setError("Inicia sesión para ver detalle");
        setLoading(false);
      }
    }
  }, [taskId]);

  useEffect(() => { fetchTask(); }, [fetchTask]);

  useEffect(() => {
    if (task && !loading) {
      const timer = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(timer);
    }
  }, [task, loading]);

  if (loading) {
    return (
      <div className="td-overlay" onClick={onClose}>
        <div className="td-panel" onClick={(e) => e.stopPropagation()}>
          <div className="td-head">
            <img src="/brd/brd_dark_logo_nobg.png" className="td-logo" alt="" />
            <span className="td-title"><span className="td-l">Ta</span><span className="td-d">sk</span></span>
            <button className="td-close" onClick={onClose}><X size={14} /></button>
          </div>
          <div className="td-body loading">
            <SkeletonBlock className="td-skel-title" />
            <SkeletonBlock className="td-skel-row" />
            <SkeletonBlock className="td-skel-row-short" />
            <SkeletonBlock className="td-skel-row" />
            <SkeletonBlock className="td-skel-row-short" />
            <div className="td-divider" />
            <SkeletonBlock className="td-skel-timer" />
            <SkeletonBlock className="td-skel-btn-row" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="td-overlay" onClick={onClose}>
        <div className="td-panel" onClick={(e) => e.stopPropagation()}>
          <div className="td-head">
            <img src="/brd/brd_dark_logo_nobg.png" className="td-logo" alt="" />
            <span className="td-title"><span className="td-l">Ta</span><span className="td-d">sk</span></span>
            <button className="td-close" onClick={onClose}><X size={14} /></button>
          </div>
          <p className="td-error">{error || "Tarea no encontrada"}</p>
        </div>
      </div>
    );
  }

  const rem = calcRemaining(task.expires_at, now);
  const pri = priorityMeta[task.priority] || priorityMeta.medium;
  const padded = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="td-overlay" onClick={onClose}>
      <div className="td-panel" onClick={(e) => e.stopPropagation()}>
        <div className="td-head">
          <img src="/brd/brd_dark_logo_nobg.png" className="td-logo" alt="" />
          <span className="td-title"><span className="td-l">Ta</span><span className="td-d">sk</span></span>
          <button className="td-close" onClick={onClose}><X size={14} /></button>
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
