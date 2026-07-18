import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { getCurrentWindow, PhysicalPosition, PhysicalSize } from "@tauri-apps/api/window";
import { Plus, Clock, Flag, Tag, StickyNote, LogOut, User, ChevronDown } from "lucide-react";
import { useTasks } from "./hooks/useTasks";
import { useSound } from "./hooks/useSound";
import { useAuth } from "./hooks/useAuth";
import { useUpdate } from "./hooks/useUpdate";
import { Header } from "./components/Header/Header";
import { TaskList } from "./components/TaskList/TaskList";
import CompactView from "./components/Compact/CompactView";
import { LoginForm } from "./components/LoginForm/LoginForm";
import { NotificationToast } from "./components/NotificationToast/NotificationToast";
import { Analytics } from "./components/Analytics/Analytics";
import { Settings } from "./components/Settings/Settings";
import { TaskDetail } from "./components/TaskDetail/TaskDetail";
import { Task } from "./types";
import "./styles/global.css";
import "./App.css";

function App() {
  const { activeTasks, expiredTasks, completedTasks, now, syncingIds, addTask, updateTask, toggleTask, deleteTask, triggerSync } = useTasks();
  const { mode, user, login, register, logout } = useAuth();
  const { soundOpen, soundComplete } = useSound();
  const { checking: updateChecking, checkForUpdates } = useUpdate();
  const [title, setTitle] = useState("");
  const [expiryMode, setExpiryMode] = useState<number | "custom">(1440);
  const [expiryCustom, setExpiryCustom] = useState("");
  const [expiryError, setExpiryError] = useState("");
  const [expiryOpen, setExpiryOpen] = useState(false);
  const expiryRef = useRef<HTMLDivElement>(null);
  const [priority, setPriority] = useState("medium");
  const [priorityOpen, setPriorityOpen] = useState(false);
  const priorityRef = useRef<HTMLDivElement>(null);
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const prevSizeRef = useRef<{ width: number; height: number; x: number; y: number } | null>(null);

  const EXPIRY_PRESETS = useMemo(() => [
    { label: "5m",  minutes: 5 },
    { label: "10m", minutes: 10 },
    { label: "15m", minutes: 15 },
    { label: "30m", minutes: 30 },
    { label: "1h",  minutes: 60 },
    { label: "2h",  minutes: 120 },
    { label: "4h",  minutes: 240 },
    { label: "8h",  minutes: 480 },
    { label: "12h", minutes: 720 },
    { label: "24h", minutes: 1440 },
    { label: "2d",  minutes: 2880 },
    { label: "7d",  minutes: 10080 },
    { label: "30d", minutes: 43200 },
    { label: "60d", minutes: 86400 },
    { label: "1y",  minutes: 525600 },
  ], []);

  const expiryLabel = useMemo(() => {
    if (expiryMode === "custom") return "Custom…";
    const preset = EXPIRY_PRESETS.find((p) => p.minutes === expiryMode);
    return preset ? preset.label : `${expiryMode}m`;
  }, [expiryMode, EXPIRY_PRESETS]);

  const parseCustom = useCallback((input: string): number | null => {
    const t = input.trim().toLowerCase();
    const m = t.match(/^(\d+)\s*(m|h|d)?$/);
    if (!m) return null;
    const v = parseInt(m[1], 10);
    if (v < 1) return null;
    switch (m[2] || "h") {
      case "m": return v;
      case "d": return v * 1440;
      default:  return v * 60;
    }
  }, []);

  useEffect(() => {
    if (!expiryOpen && !priorityOpen) return;
    const handler = (e: MouseEvent) => {
      if (expiryRef.current && !expiryRef.current.contains(e.target as Node)) setExpiryOpen(false);
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) setPriorityOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expiryOpen, priorityOpen]);

  useEffect(() => { soundOpen() }, []);


  const handleDetail = (task: Task) => setDetailTask(task);

  const toggleCompact = useCallback(async () => {
    const w = getCurrentWindow();
    try {
      if (!isCompact) {
        const size = await w.innerSize();
        const pos = await w.outerPosition();
        const h = size.height as number;
        prevSizeRef.current = { width: size.width as number, height: h, x: pos.x as number, y: pos.y as number };
        await w.setSize(new PhysicalSize(360, 140));
        await w.setPosition(new PhysicalPosition(pos.x as number, (pos.y as number) + h - 140));
        await w.setAlwaysOnTop(true);
        setIsCompact(true);
      } else {
        await w.setAlwaysOnTop(false);
        const prev = prevSizeRef.current;
        if (prev) {
          await w.setSize(new PhysicalSize(prev.width, prev.height));
          await w.setPosition(new PhysicalPosition(prev.x, prev.y));
        }
        setIsCompact(false);
      }
    } catch (e) {
      console.error("toggleCompact", e);
    }
  }, [isCompact]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    let minutes: number | null;
    if (expiryMode === "custom") {
      minutes = parseCustom(expiryCustom);
      if (minutes === null) { setExpiryError("Invalid format"); return; }
    } else {
      minutes = expiryMode;
    }
    minutes = Math.max(1, Math.min(minutes, 525600));
    addTask(
      title.trim(),
      "",
      priority,
      tags.split(",").map((t) => t.trim()).filter(Boolean),
      notes.trim(),
      minutes,
    );
    setTitle("");
    setExpiryError("");
    setTags("");
    setNotes("");
  };

  return (
    <div className="popup">
      <Header avatarUrl={user?.avatar_url} userName={user?.name} onReload={triggerSync} onAnalytics={() => setShowAnalytics(true)} onSettings={() => setShowSettings(true)} onUpdate={checkForUpdates} updateChecking={updateChecking} isCompact={isCompact} onToggleCompact={toggleCompact} />
      

      {isCompact ? (
        <CompactView activeTasks={activeTasks} onOpenFull={toggleCompact} />
      ) : (
        <TaskList
          activeTasks={activeTasks}
          expiredTasks={expiredTasks}
          completedTasks={completedTasks}
          now={now}
          syncingIds={syncingIds}
          onToggle={(id) => { toggleTask(id); soundComplete(); }}
          onDelete={deleteTask}
          onDetail={handleDetail}
          onUpdate={updateTask}
        />
      )}

      <form className="new-task-form" onSubmit={handleSubmit}>
        <div className="new-task-input-row">
          <button type="submit" className="new-task-submit">
            <Plus size={13} />
          </button>
          <input
            type="text"
            placeholder="New task..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="new-task-input"
          />
        </div>

        <div className="new-task-options">
          <div className="option-item expiry-dropdown-group" ref={expiryRef}>
            <Clock size={12} />
            <button
              type="button"
              className={`expiry-dropdown-btn${expiryError ? " error" : ""}`}
              onClick={() => setExpiryOpen((o) => !o)}
            >
              {expiryLabel}
              <ChevronDown size={10} />
            </button>
            {expiryOpen && (
              <div className="expiry-dropdown-menu">
                <div className="expiry-dropdown-scroll">
                  {EXPIRY_PRESETS.map((opt) => (
                    <button
                      key={opt.minutes}
                      type="button"
                      className={`expiry-opt${expiryMode === opt.minutes ? " active" : ""}`}
                      onClick={() => { setExpiryMode(opt.minutes); setExpiryOpen(false); setExpiryError(""); }}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`expiry-opt${expiryMode === "custom" ? " active" : ""}`}
                    onClick={() => { setExpiryMode("custom"); setExpiryOpen(false); setExpiryError(""); }}
                  >
                    Custom…
                  </button>
                </div>
              </div>
            )}
            {expiryMode === "custom" && (
              <input
                type="text"
                value={expiryCustom}
                onChange={(e) => {
                  if (!e.target.value) { setExpiryCustom(""); return; }
                  const v = e.target.value.toLowerCase().replace(/[^0-9mh]/g, '');
                  const m = v.match(/^(\d*)([mh])?$/);
                  if (m) setExpiryCustom(m[1] + (m[2] || ''));
                }}
                placeholder="e.g. 45m"
                className="expiry-custom-input"
              />
            )}
          </div>

          <div className="option-item priority-dropdown-group" ref={priorityRef}>
            <Flag size={12} />
            <button
              type="button"
              className="priority-dropdown-btn"
              onClick={() => setPriorityOpen((o) => !o)}
            >
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
              <ChevronDown size={10} />
            </button>
            {priorityOpen && (
              <div className="priority-dropdown-menu">
                <div className="priority-dropdown-scroll">
                  {["low", "medium", "high", "urgent"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`priority-opt${priority === p ? " active" : ""}`}
                      onClick={() => { setPriority(p); setPriorityOpen(false); }}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <label className="option-item">
            <Tag size={12} />
            <input
              type="text"
              placeholder="tags..."
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="option-tags-input"
            />
          </label>
        </div>

        <div className="new-task-notes">
          <StickyNote size={12} />
          <input
            type="text"
            placeholder="Add notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="option-notes-input"
          />
        </div>
      </form>

      <div className="auth-bar">
        {mode === "guest" ? (
          <button className="auth-link" onClick={() => setShowLogin(true)}>
            <User size={11} /> Sign In
          </button>
        ) : (
          <div className="auth-row">
            <span className="auth-user">{user?.name}</span>
            <button className="auth-link" onClick={logout}>
              <LogOut size={11} /> Log Out
            </button>
          </div>
        )}
      </div>

      {showAnalytics && <Analytics onClose={() => setShowAnalytics(false)} />}

      {showSettings && <Settings userName={user?.name} avatarUrl={user?.avatar_url} onClose={() => setShowSettings(false)} />}

      {detailTask && (
        <TaskDetail
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onToggle={toggleTask}
          onDelete={deleteTask}
        />
      )}

      <NotificationToast />

      {showLogin && (
        <LoginForm
          onLogin={async (email, password) => {
            await login(email, password);
            setShowLogin(false);
          }}
          onRegister={async (name, email, password) => {
            await register(name, email, password);
            setShowLogin(false);
          }}
          onCancel={() => setShowLogin(false)}
        />
      )}
    </div>
  );
}

export default App;
