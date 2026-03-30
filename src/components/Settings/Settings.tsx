import { useState, useEffect } from "react";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTranslation } from "../../i18n/useTranslation";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { getAutostart, setAutostart, getStorageDir, setStorageDir } from "../../commands";
import type { Locale } from "../../i18n/I18nContext";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

export function Settings({ open, onClose }: SettingsProps) {
  const { t, locale, setLocale } = useTranslation();
  const [autostart, setAutostartState] = useState(false);
  const [autostartLoading, setAutostartLoading] = useState(false);
  const [alwaysOnTop, setAlwaysOnTopState] = useState(true);
  const [alwaysOnTopLoading, setAlwaysOnTopLoading] = useState(false);
  const [storageDir, setStorageDirState] = useState("");
  const [defaultStorageDir, setDefaultStorageDirState] = useState("");
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [appVersion, setAppVersion] = useState("");

  useEffect(() => {
    if (!open) return;
    getAutostart().then(setAutostartState).catch(() => {});
    getCurrentWindow().isAlwaysOnTop().then(setAlwaysOnTopState).catch(() => {});
    getStorageDir().then((dir) => {
      setStorageDirState(dir);
      if (!defaultStorageDir) setDefaultStorageDirState(dir);
    }).catch(() => {});
    getVersion().then(setAppVersion).catch(() => {});
  }, [open]);

  const handleAutostartChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    setAutostartLoading(true);
    try {
      await setAutostart(enabled);
      setAutostartState(enabled);
    } catch {
      // revert on error
    } finally {
      setAutostartLoading(false);
    }
  };

  const handleAlwaysOnTopChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    setAlwaysOnTopLoading(true);
    try {
      await getCurrentWindow().setAlwaysOnTop(enabled);
      setAlwaysOnTopState(enabled);
    } catch {
      // revert on error
    } finally {
      setAlwaysOnTopLoading(false);
    }
  };

  const handleStorageBrowse = async () => {
    try {
      const selected = await dialogOpen({ directory: true, multiple: false });
      if (!selected) return;
      const newDir = selected as string;
      setStorageLoading(true);
      setStorageError("");
      await setStorageDir(newDir);
      setStorageDirState(newDir);
    } catch (err) {
      setStorageError(t("settings.storageMoveFailed"));
    } finally {
      setStorageLoading(false);
    }
  };

  const handleStorageReset = async () => {
    if (!defaultStorageDir) return;
    setStorageLoading(true);
    setStorageError("");
    try {
      await setStorageDir(defaultStorageDir);
      setStorageDirState(defaultStorageDir);
    } catch (err) {
      setStorageError(t("settings.storageMoveFailed"));
    } finally {
      setStorageLoading(false);
    }
  };

  const isCustomStorage = storageDir !== defaultStorageDir && defaultStorageDir !== "";

  return (
    <Modal open={open} onClose={onClose} title={t("settings.title")}>
      <div className="flex flex-col gap-5" style={{ minWidth: 340 }}>

        {/* General section */}
        <div className="flex flex-col gap-2">
          <div
            className="text-[11px] font-bold uppercase tracking-[0.6px]"
            style={{ color: "var(--color-text-muted)" }}
          >
            {t("settings.general")}
          </div>
          <div
            className="flex items-center justify-between gap-4 px-[14px] py-3"
            style={{
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div className="flex flex-col gap-[2px]">
              <span className="text-[13px] font-medium">{t("settings.autostart")}</span>
              <span
                className="text-[11px]"
                style={{ color: "var(--color-text-muted)" }}
              >
                {t("settings.autostartDesc")}
              </span>
            </div>
            <label className="settings-toggle relative w-[40px] h-[22px] shrink-0">
              <input
                type="checkbox"
                checked={autostart}
                disabled={autostartLoading}
                onChange={handleAutostartChange}
                className="opacity-0 w-0 h-0 absolute"
              />
              <span className="settings-toggle-track absolute inset-0 rounded-[22px] cursor-pointer transition-colors" />
            </label>
          </div>
          <div
            className="flex items-center justify-between gap-4 px-[14px] py-3"
            style={{
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div className="flex flex-col gap-[2px]">
              <span className="text-[13px] font-medium">{t("settings.alwaysOnTop")}</span>
              <span
                className="text-[11px]"
                style={{ color: "var(--color-text-muted)" }}
              >
                {t("settings.alwaysOnTopDesc")}
              </span>
            </div>
            <label className="settings-toggle relative w-[40px] h-[22px] shrink-0">
              <input
                type="checkbox"
                checked={alwaysOnTop}
                disabled={alwaysOnTopLoading}
                onChange={handleAlwaysOnTopChange}
                className="opacity-0 w-0 h-0 absolute"
              />
              <span className="settings-toggle-track absolute inset-0 rounded-[22px] cursor-pointer transition-colors" />
            </label>
          </div>
        </div>

        {/* Storage section */}
        <div className="flex flex-col gap-2">
          <div
            className="text-[11px] font-bold uppercase tracking-[0.6px]"
            style={{ color: "var(--color-text-muted)" }}
          >
            {t("settings.storage")}
          </div>
          <div
            className="flex flex-col gap-3 px-[14px] py-3"
            style={{
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div className="flex flex-col gap-[2px]">
              <span className="text-[13px] font-medium">{t("settings.storageLocation")}</span>
              <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                {t("settings.storageLocationDesc")}
              </span>
            </div>
            <div
              className="text-[11px] px-2 py-[6px] overflow-hidden text-ellipsis whitespace-nowrap"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-text-secondary)",
                fontFamily: "monospace",
              }}
              title={storageDir}
            >
              {storageDir ? `${storageDir}${storageDir.includes("\\") ? "\\" : "/"}profiles.json` : "…"}
            </div>
            {storageError && (
              <span className="text-[11px]" style={{ color: "var(--color-danger)" }}>
                {storageError}
              </span>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleStorageBrowse} disabled={storageLoading}>
                {t("settings.storageBrowse")}
              </Button>
              {isCustomStorage && (
                <Button variant="ghost" size="sm" onClick={handleStorageReset} disabled={storageLoading}>
                  {t("settings.storageReset")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Language section */}
        <div className="flex flex-col gap-2">
          <div
            className="text-[11px] font-bold uppercase tracking-[0.6px]"
            style={{ color: "var(--color-text-muted)" }}
          >
            {t("language")}
          </div>
          <div
            className="flex items-center justify-between gap-4 px-[14px] py-3"
            style={{
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div className="flex flex-col gap-[2px]">
              <span className="text-[13px] font-medium">{t("settings.displayLanguage")}</span>
            </div>
            <select
              className="text-[13px] cursor-pointer"
              style={{
                padding: "7px 10px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-bg-secondary)",
                color: "var(--color-text)",
                minWidth: 100,
              }}
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
            >
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </div>
        </div>

        {/* About section */}
        <div className="flex flex-col gap-2">
          <div
            className="text-[11px] font-bold uppercase tracking-[0.6px]"
            style={{ color: "var(--color-text-muted)" }}
          >
            {t("settings.about")}
          </div>
          <div
            className="flex items-center justify-between gap-4 px-[14px] py-3"
            style={{
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <span className="text-[13px] font-medium">{t("settings.version")}</span>
            <span
              className="text-[13px]"
              style={{ color: "var(--color-text-muted)", fontFamily: "monospace" }}
            >
              {appVersion ? `v${appVersion}` : "…"}
            </span>
          </div>
        </div>

      </div>
    </Modal>
  );
}
