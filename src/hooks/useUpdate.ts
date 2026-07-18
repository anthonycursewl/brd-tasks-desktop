import { useState, useCallback } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { useNotify } from "../contexts/NotificationContext";

export function useUpdate() {
  const [checking, setChecking] = useState(false);
  const { notify } = useNotify();

  const checkForUpdates = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    try {
      const update = await check();
      if (update) {
        setChecking(true);
        notify(`Downloading ${update.version}…`);
        await update.downloadAndInstall();
        notify("Update installed. Restarting…");
        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
      } else {
        notify("You're using the latest version", "success");
      }
    } catch (e: any) {
      const msg = typeof e === 'string' ? e : e?.message || e?.toString() || 'unknown error';
      console.error("[Update]", msg);
      notify(`Update error: ${msg}`);
    } finally {
      setChecking(false);
    }
  }, [checking, notify]);

  return { checking, checkForUpdates };
}
