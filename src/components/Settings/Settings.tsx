import { useState, useEffect } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { Modal } from "../common/Modal";
import { getAutostart, setAutostart } from "../../commands";
import type { Locale } from "../../i18n/I18nContext";
import styles from "./Settings.module.css";

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
      <div className={styles.content}>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t("settings.general")}</div>
          <div className={styles.row}>
            <div className={styles.rowInfo}>
              <span className={styles.rowLabel}>{t("settings.autostart")}</span>
              <span className={styles.rowDesc}>{t("settings.autostartDesc")}</span>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={autostart}
                disabled={autostartLoading}
                onChange={handleAutostartChange}
              />
              <span className={styles.toggleTrack} />
            </label>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t("language")}</div>
          <div className={styles.row}>
            <div className={styles.rowInfo}>
              <span className={styles.rowLabel}>{t("settings.displayLanguage")}</span>
            </div>
            <select
              className={styles.langSelect}
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
