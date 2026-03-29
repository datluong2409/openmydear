import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "../../i18n/useTranslation";
import { getInstalledApps } from "../../commands";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import type { AppInfo } from "../../types";

interface OpenWithPickerProps {
  open: boolean;
  onSelect: (appPath: string | undefined) => void;
  onCancel: () => void;
}

export function OpenWithPicker({ open: isOpen, onSelect, onCancel }: OpenWithPickerProps) {
  const { t } = useTranslation();
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) { setSearch(""); return; }
    setLoading(true);
    getInstalledApps().then(setApps).catch(() => setApps([])).finally(() => setLoading(false));
  }, [isOpen]);

  const filtered = search
    ? apps.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : apps;

  const handleBrowse = async () => {
    try {
      const selected = await open({
        directory: false,
        multiple: false,
        title: t("picker.browse"),
        filters: [{ name: "Applications", extensions: ["exe", "lnk"] }],
      });
      if (selected) onSelect(selected as string);
    } catch (err) {
      console.error("Browse failed:", err);
    }
  };

  const appItemClass =
    "flex items-center gap-[10px] px-[10px] py-2 rounded-[var(--radius-sm)] cursor-pointer transition-colors hover:bg-(--color-bg-hover) text-left w-full";

  return (
    <Modal open={isOpen} onClose={onCancel} title={t("picker.title")}>
      <div className="flex flex-col gap-3 min-w-[380px]">
        <input
          className="w-full px-[10px] py-2 border border-(--color-border) rounded-[var(--radius-sm)] bg-(--color-bg) text-(--color-text) text-[13px] outline-none transition-colors focus:border-(--color-primary)"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("picker.search")}
          autoFocus
        />

        <div className="max-h-[320px] overflow-y-auto flex flex-col gap-[2px] border border-(--color-border) rounded-[var(--radius-sm)] p-1">
          <button
            className={appItemClass + " border-b border-(--color-border) mb-[2px] pb-[10px]"}
            onClick={() => onSelect(undefined)}
          >
            <span className="text-[16px] shrink-0 w-6 text-center">&#x1F310;</span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-(--color-text-secondary)">{t("picker.default")}</div>
            </div>
          </button>

          {loading ? (
            <div className="py-5 text-center text-(--color-text-muted) text-[13px]">{t("picker.loading")}</div>
          ) : filtered.length === 0 ? (
            <div className="py-5 text-center text-(--color-text-muted) text-[13px]">{t("picker.empty")}</div>
          ) : (
            filtered.map((app, i) => (
              <button
                key={`${app.path}-${i}`}
                className={appItemClass}
                onClick={() => onSelect(app.path)}
                title={app.path}
              >
                {app.icon ? (
                  <img
                    className="shrink-0 w-6 h-6 rounded-[2px] object-contain"
                    src={`data:image/png;base64,${app.icon}`}
                    alt={app.name}
                    width={24}
                    height={24}
                  />
                ) : (
                  <span className="text-[16px] shrink-0 w-6 text-center">&#x1F4E6;</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium">{app.name}</div>
                  <div className="text-[10px] text-(--color-text-muted) overflow-hidden text-ellipsis whitespace-nowrap mt-[1px]">
                    {app.path}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-between items-center gap-2">
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
