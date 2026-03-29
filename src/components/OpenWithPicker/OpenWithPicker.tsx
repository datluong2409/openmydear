import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "../../i18n/useTranslation";
import { getInstalledApps } from "../../commands";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import type { AppInfo } from "../../types";
import styles from "./OpenWithPicker.module.css";

interface OpenWithPickerProps {
  open: boolean;
  onSelect: (appPath: string | undefined) => void;
  onCancel: () => void;
}

export function OpenWithPicker({
  open: isOpen,
  onSelect,
  onCancel,
}: OpenWithPickerProps) {
  const { t } = useTranslation();
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      return;
    }
    setLoading(true);
    getInstalledApps()
      .then(setApps)
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const filtered = search
    ? apps.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase())
      )
    : apps;

  const handleBrowse = async () => {
    try {
      const selected = await open({
        directory: false,
        multiple: false,
        title: t("picker.browse"),
        filters: [{ name: "Applications", extensions: ["exe", "lnk"] }],
      });
      if (selected) {
        onSelect(selected as string);
      }
    } catch (err) {
      console.error("Browse failed:", err);
    }
  };

  return (
    <Modal open={isOpen} onClose={onCancel} title={t("picker.title")}>
      <div className={styles.content}>
        <input
          className={styles.search}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("picker.search")}
          autoFocus
        />

        <div className={styles.appList}>
          <button
            className={`${styles.appItem} ${styles.defaultItem}`}
            onClick={() => onSelect(undefined)}
          >
            <span className={styles.appIcon}>&#x1F310;</span>
            <div className={styles.appInfo}>
              <div className={styles.appName}>{t("picker.default")}</div>
            </div>
          </button>

          {loading ? (
            <div className={styles.loading}>{t("picker.loading")}</div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>{t("picker.empty")}</div>
          ) : (
            filtered.map((app, i) => (
              <button
                key={`${app.path}-${i}`}
                className={styles.appItem}
                onClick={() => onSelect(app.path)}
                title={app.path}
              >
                {app.icon ? (
                  <img
                    className={styles.appIconImg}
                    src={`data:image/png;base64,${app.icon}`}
                    alt={app.name}
                    width={24}
                    height={24}
                  />
                ) : (
                  <span className={styles.appIcon}>&#x1F4E6;</span>
                )}
                <div className={styles.appInfo}>
                  <div className={styles.appName}>{app.name}</div>
                  <div className={styles.appPath}>{app.path}</div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" size="sm" onClick={handleBrowse}>
            {t("picker.browse")}
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {t("dialog.cancel")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
