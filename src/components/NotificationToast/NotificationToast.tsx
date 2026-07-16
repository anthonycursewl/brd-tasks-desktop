import { useState } from "react";
import { AlertCircle, CheckCircle2, Info, Copy, Check } from "lucide-react";
import { useNotify } from "../../contexts/NotificationContext";
import "./NotificationToast.css";

const icons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

const labels = {
  error: "Error",
  success: "Ok",
  info: "Info",
};

export function NotificationToast() {
  const { notifications } = useNotify();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  if (notifications.length === 0) return null;

  const handleCopy = (n: (typeof notifications)[0]) => {
    navigator.clipboard.writeText(n.message).catch(() => {});
    setCopiedId(n.id);
    setTimeout(() => setCopiedId(null), 1000);
  };

  return (
    <div className="toast-island">
      {notifications.map((n) => {
        const Icon = icons[n.type];
        return (
          <div key={n.id} className="toast-pill" onClick={() => handleCopy(n)} title={n.message}>
            <Icon className={`toast-icon-${n.type}`} />
            <span className={`toast-label-${n.type}`}>{labels[n.type]}</span>
            <span className="toast-msg">{n.message}</span>
            <Copy size={9} style={{ opacity: 0.4, flexShrink: 0 }} color="#fff" />
            {copiedId === n.id && <span className="toast-copied"><Check size={8} /> Copiado</span>}
          </div>
        );
      })}
    </div>
  );
}
