import { useEffect, useState, useCallback } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export function useUpdateChecker() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkForUpdates() {
      try {
        const result = await check();
        if (cancelled || !result) return;
        setUpdate(result);
      } catch (e) {
        console.error("Update check failed:", e);
      }
    }

    const timer = setTimeout(checkForUpdates, 3000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const installUpdate = useCallback(async () => {
    if (!update) return;
    setIsUpdating(true);
    try {
      await update.downloadAndInstall();
      await relaunch();
    } catch (e) {
      console.error("Update install failed:", e);
      setIsUpdating(false); // relaunch never returns on success
    }
  }, [update]);

  return {
    hasUpdate: update !== null,
    updateVersion: update?.version ?? null,
    isUpdating,
    installUpdate,
  };
}
