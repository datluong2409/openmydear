import { useState, useEffect } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { Modal } from "../common/Modal";
import { getAutostart, setAutostart } from "../../commands";
import type { Locale } from "../../i18n/I18nContext";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

export function Settings({ open, onClose }: SettingsProps) {
  const { t, locale, setLocale } = useTranslation();
  const [autostart, setAutostartState] = useState(false);
  const [autostartLoading, setAutostartLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    getAutostart().then(setAutostartState).catch(() => {});
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

  return (
    <Modal open={open} onClose={onClose} title={t("settings.title")}>
      <div className="flex flex-col gap-5" style={{ minWidth: 320 }}>

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

      </div>
    </Modal>
  );
}
