import { Task } from "../../types";
import "./CompactView.css";

interface CompactViewProps {
  activeTasks: Task[];
  onOpenFull: () => void;
}

const priorityColors: Record<string, string> = {
  low: "#6b7280",
  medium: "#eab308",
  high: "#ef4444",
  urgent: "#dc2626",
};

function getTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function CompactView({ activeTasks, onOpenFull }: CompactViewProps) {
  const count = activeTasks.length;
  const items = activeTasks.slice(0, 5);

  return (
    <div className="compact-root" onDoubleClick={onOpenFull}>
      <div className="compact-header">
        <span className="compact-title">Tasks</span>
        <span className="compact-count">{count}</span>
      </div>

      <div className="compact-list">
        {items.length === 0 ? (
          <div className="compact-empty">All clear</div>
        ) : (
          items.map((t) => (
            <div key={t.id} className="compact-item">
              <div className="compact-item-left">
                <div
                  className="compact-priority-dot"
                  style={{ background: priorityColors[t.priority] || "#eab308" }}
                />
                <span className="compact-item-title">{t.title}</span>
              </div>
              <span className="compact-item-time">{getTimeLeft(t.expires_at)}</span>
            </div>
          ))
        )}
      </div>

      {count > 5 && <div className="compact-more">+{count - 5} more</div>}
    </div>
  );
}

export default CompactView;
