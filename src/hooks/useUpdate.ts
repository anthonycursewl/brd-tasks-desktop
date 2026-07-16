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
      if (update?.available) {
        setUpdateInfo({ version: update.version, notes: update.body });
        notify(`Update ${update.version} disponible`, "success");
      } else {
        notify("Ya tienes la última versión", "success");
      }
    } catch (e: any) {
      console.error("[Update check]", e);
      notify("Error al buscar actualizaciones");
    } finally {
      setChecking(false);
    }
  }, [checking, notify]);

  const installUpdate = useCallback(async () => {
    try {
      const update = await check();
      if (!update?.available) return;
      notify("Descargando actualización…");
      await update.downloadAndInstall();
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (e: any) {
      console.error("[Install update]", e);
      notify("Error al instalar actualización");
    }
  }, [notify]);

  return { checking, updateInfo, checkForUpdates, installUpdate, setUpdateInfo };
}
