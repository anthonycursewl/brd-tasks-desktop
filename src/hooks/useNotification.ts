import { useState, useCallback, useRef } from "react";

export interface Notification {
  id: number;
  message: string;
  type: "error" | "success" | "info";
}

export function useNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const idRef = useRef(0);

  const notify = useCallback((message: string, type: Notification["type"] = "error") => {
    const id = ++idRef.current;
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  return { notifications, notify };
}
