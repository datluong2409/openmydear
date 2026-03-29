import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { ask } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "../i18n/useTranslation";

export function useUpdateChecker() {
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;

    async function checkForUpdates() {
      try {
        const update = await check();
        if (cancelled || !update) return;

        const yes = await ask(
          t("update.available", { version: update.version }),
          { title: t("update.title"), kind: "info" }
        );
        if (!yes) return;

        await update.downloadAndInstall();
        await relaunch();
      } catch (e) {
        console.error("Update check failed:", e);
      }
    }

    const timer = setTimeout(checkForUpdates, 3000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [t]);
}
