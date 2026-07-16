import { useState, useCallback } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { useNotify } from "../contexts/NotificationContext";

export function useUpdate() {
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ version: string; notes?: string } | null>(null);
  const { notify } = useNotify();

  const checkForUpdates = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    try {
      const update = await check();
      if (update) {
        setUpdateInfo({ version: update.version, notes: update.body });
        notify(`Update ${update.version} available`, "success");
      } else {
        notify("You're using the latest version", "success");
      }
    } catch (e: any) {
      const msg = typeof e === 'string' ? e : e?.message || e?.toString() || 'unknown error';
      console.error("[Update check]", { message: msg, error: e });
      notify(`Update error: ${msg}`);
    } finally {
      setChecking(false);
    }
  }, [checking, notify]);

  const installUpdate = useCallback(async () => {
    try {
      const update = await check();
      if (!update) return;
      notify("Downloading update…");
      await update.downloadAndInstall();
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (e: any) {
      console.error("[Install update]", e);
      notify("Error occurred while installing the update");
    }
  }, [notify]);

  return { checking, updateInfo, checkForUpdates, installUpdate, setUpdateInfo };
}
