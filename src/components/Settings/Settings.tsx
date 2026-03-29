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
      <div className="flex flex-col gap-5 min-w-[320px]">

        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.6px] text-(--color-text-muted)">
            {t("settings.general")}
          </div>
          <div className="flex items-center justify-between gap-4 px-[14px] py-3 bg-(--color-bg) border border-(--color-border) rounded-[var(--radius-md)]">
            <div className="flex flex-col gap-[2px]">
              <span className="text-[13px] font-medium">{t("settings.autostart")}</span>
              <span className="text-[11px] text-(--color-text-muted)">{t("settings.autostartDesc")}</span>
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

        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.6px] text-(--color-text-muted)">
            {t("language")}
          </div>
          <div className="flex items-center justify-between gap-4 px-[14px] py-3 bg-(--color-bg) border border-(--color-border) rounded-[var(--radius-md)]">
            <div className="flex flex-col gap-[2px]">
              <span className="text-[13px] font-medium">{t("settings.displayLanguage")}</span>
            </div>
            <select
              className="px-[10px] py-[7px] border border-(--color-border) rounded-[var(--radius-sm)] bg-(--color-bg-secondary) text-(--color-text) text-[13px] cursor-pointer min-w-[100px]"
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
