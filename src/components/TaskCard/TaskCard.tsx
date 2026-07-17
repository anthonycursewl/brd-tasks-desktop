import { memo, useState, useRef, useEffect } from "react";
import { Check, X, Pencil, Flag, Tag, StickyNote, Clock, Loader2 } from "lucide-react";
import { Task } from "../../types";
import { getTimeRemaining, getProgressPercent } from "../../utils/time";
import "./TaskCard.css";

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const priorityColors: Record<string, string> = {
  low: "#6b7280",
  medium: "#eab308",
  high: "#ef4444",
  urgent: "#dc2626",
};

interface TaskCardProps {
  task: Task;
  now: number;
  syncing?: boolean;
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

export const TaskCard = memo(function TaskCard({ task, now, syncing = false, onToggle, onDelete, onDetail, onUpdate }: TaskCardProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editTags, setEditTags] = useState(task.tags.join(", "));
  const [editNotes, setEditNotes] = useState(task.notes);
  const [editExpiry, setEditExpiry] = useState(1440);
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { setVisible(entry.isIntersecting); },
      { rootMargin: "50px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleToggle = () => onToggle(task.id);
  const handleDelete = () => onDelete(task.id);
  const handleDetail = () => onDetail(task);

  const openEdit = () => {
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditTags(task.tags.join(", "));
    setEditNotes(task.notes);
    setEditing(true);
  };

  const closeEdit = () => setEditing(false);

  const handleSave = () => {
    if (!editTitle.trim()) return;
    onUpdate(
      task.id,
      editTitle.trim(),
      editPriority,
      editTags.split(",").map((t) => t.trim()).filter(Boolean),
      editNotes.trim(),
      editExpiry,
    );
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") closeEdit();
  };

  const progress = editing ? 0 : getProgressPercent(task.expires_at, task.created_at);
  const remaining = editing ? "" : getTimeRemaining(task.expires_at);

  if (editing) {
    return (
      <div className="task-card editing">
        <div className="task-edit-form">
          <input
            type="text"
            className="edit-input edit-title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <div className="edit-row">
            <span className="edit-label"><Flag size={10} /></span>
            <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} className="edit-select">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="edit-row">
            <span className="edit-label"><Tag size={10} /></span>
            <input
              type="text"
              className="edit-input"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="tags..."
            />
          </div>
          <div className="edit-row">
            <span className="edit-label"><StickyNote size={10} /></span>
            <input
              type="text"
              className="edit-input"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="notas..."
            />
          </div>
          <div className="edit-row">
            <span className="edit-label"><Clock size={10} /></span>
            <select value={editExpiry} onChange={(e) => setEditExpiry(Number(e.target.value))} className="edit-select">
              <option value={5}>5m</option>
              <option value={10}>10m</option>
              <option value={15}>15m</option>
              <option value={30}>30m</option>
              <option value={60}>1h</option>
              <option value={120}>2h</option>
              <option value={240}>4h</option>
              <option value={480}>8h</option>
              <option value={720}>12h</option>
              <option value={1440}>24h</option>
              <option value={2880}>2d</option>
              <option value={10080}>7d</option>
              <option value={43200}>30d</option>
              <option value={525600}>1y</option>
            </select>
          </div>
          <div className="edit-actions">
            <button className="edit-btn save" onClick={handleSave} type="button"><Check size={12} /></button>
            <button className="edit-btn cancel" onClick={closeEdit} type="button"><X size={12} /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`task-card ${task.completed ? "done" : ""}${(!task.completed && new Date(task.expires_at).getTime() <= now) ? " expired" : ""}${visible ? " visible" : ""}`}
      style={{ "--priority-color": priorityColors[task.priority] || "#eab308" } as React.CSSProperties}
    >
      <button className={`check-btn${task.completed ? " checked" : ""}`} onClick={(e) => { e.stopPropagation(); handleToggle(); }} type="button">
        {task.completed ? <Check size={11} strokeWidth={2.5} /> : null}
      </button>
      <div className="task-content" onClick={handleDetail} onDoubleClick={(e) => { e.stopPropagation(); openEdit(); }}>
        <span className="task-title">{task.title}</span>
        <div className="task-badges">
          {task.priority && (
            <span className="badge badge-priority" style={{ color: priorityColors[task.priority] }}>
              <Flag size={9} />
              {capitalize(task.priority)}
            </span>
          )}
          {task.tags.length > 0 && (
            <span className="badge badge-tags">
              <Tag size={9} />
              {task.tags.join(", ")}
            </span>
          )}
          {task.notes && (
            <span className="badge badge-notes">
              <StickyNote size={9} />
              {task.notes}
            </span>
          )}
        </div>
        {!task.completed && (
          <div className="task-meta">
            <div className="timer-bar">
              <div className="timer-fill" style={{ width: `${100 - progress}%` }} />
            </div>
            <span className="time-left">{remaining}</span>
          </div>
        )}
      </div>
      <div className="task-actions">
        {syncing && <Loader2 size={11} className="sync-spinner" />}
        {!task.completed && (
          <button className="edit-trigger" onClick={(e) => { e.stopPropagation(); openEdit(); }} title="Editar" type="button">
            <Pencil size={12} />
          </button>
        )}
        <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(); }} type="button">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}, (prev, next) => {
  if (prev.syncing !== next.syncing) return false;
  if (next.now - prev.now > 1000) return false;
  return prev.task.id === next.task.id &&
    prev.task.title === next.task.title &&
    prev.task.completed === next.task.completed &&
    prev.task.expires_at === next.task.expires_at &&
    prev.task.created_at === next.task.created_at &&
    prev.task.priority === next.task.priority &&
    prev.task.tags.length === next.task.tags.length &&
    prev.task.notes === next.task.notes &&
    prev.task.tags.every((t, i) => t === next.task.tags[i]);
});
