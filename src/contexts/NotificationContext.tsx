import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

export interface Notification {
  id: number;
  message: string;
  type: "error" | "success" | "info";
}

interface NotificationContextType {
  notifications: Notification[];
  notify: (message: string, type?: Notification["type"]) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const idRef = useRef(0);

  const notify = useCallback((message: string, type: Notification["type"] = "error") => {
    const id = ++idRef.current;
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, notify }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotify(): NotificationContextType {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotify must be used within NotificationProvider");
  return ctx;
}
