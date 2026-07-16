import { useEffect, useState } from "react";
import { Plus, Clock, Flag, Tag, StickyNote, LogOut, User } from "lucide-react";
import { useTasks } from "./hooks/useTasks";
import { useSound } from "./hooks/useSound";
import { useAuth } from "./hooks/useAuth";
import { useUpdate } from "./hooks/useUpdate";
import { Header } from "./components/Header/Header";
import { TaskList } from "./components/TaskList/TaskList";
import { LoginForm } from "./components/LoginForm/LoginForm";
import { NotificationToast } from "./components/NotificationToast/NotificationToast";
import { Analytics } from "./components/Analytics/Analytics";
import { TaskDetail } from "./components/TaskDetail/TaskDetail";
import "./styles/global.css";
import "./App.css";

function App() {
  const { activeTasks, completedTasks, syncingIds, addTask, updateTask, toggleTask, deleteTask, triggerSync } = useTasks();
  const { mode, user, login, register, logout } = useAuth();
  const { soundOpen, soundComplete } = useSound();
  const { checking: updateChecking, checkForUpdates } = useUpdate();
  const [title, setTitle] = useState("");
  const [expiryHours, setExpiryHours] = useState(24);
  const [priority, setPriority] = useState("medium");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  useEffect(() => { soundOpen() }, []);

  const handleDetail = (id: string) => setDetailTaskId(id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask(
      title.trim(),
      "",
      priority,
      tags.split(",").map((t) => t.trim()).filter(Boolean),
      notes.trim(),
      expiryHours,
    );
    setTitle("");
    setExpiryHours(24);
    setPriority("medium");
    setTags("");
    setNotes("");
  };

  return (
    <div className="popup">
      <Header avatarUrl={user?.avatar_url} userName={user?.name} onReload={triggerSync} onAnalytics={() => setShowAnalytics(true)} onUpdate={checkForUpdates} updateChecking={updateChecking} />

      <TaskList
        activeTasks={activeTasks}
        completedTasks={completedTasks}
        syncingIds={syncingIds}
        onToggle={(id) => { toggleTask(id); soundComplete(); }}
        onDelete={deleteTask}
        onDetail={handleDetail}
        onUpdate={updateTask}
      />

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
          <label className="option-item">
            <Clock size={12} />
            <select value={expiryHours} onChange={(e) => setExpiryHours(Number(e.target.value))}>
              <option value={1}>1h</option>
              <option value={4}>4h</option>
              <option value={8}>8h</option>
              <option value={24}>24h</option>
              <option value={48}>2d</option>
              <option value={72}>3d</option>
              <option value={168}>7d</option>
            </select>
          </label>

          <label className="option-item">
            <Flag size={12} />
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>

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

      {detailTaskId && (
        <TaskDetail
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
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
