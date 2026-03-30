import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "../../i18n/useTranslation";
import { usePlatform } from "../../hooks/usePlatform";
import { getInstalledApps } from "../../commands";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import type { AppInfo } from "../../types";

interface OpenWithPickerProps {
  open: boolean;
  onSelect: (app: AppInfo | undefined) => void;
  onCancel: () => void;
  mode?: "openWith" | "addApp";
}

export function OpenWithPicker({ open: isOpen, onSelect, onCancel, mode = "openWith" }: OpenWithPickerProps) {
  const { t } = useTranslation();
  const { isMacos } = usePlatform();
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [inputFocused, setInputFocused] = useState(false);

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
        directory: isMacos,
        multiple: false,
        title: t("picker.browse"),
        filters: isMacos ? undefined : [{ name: "Applications", extensions: ["exe", "lnk"] }],
      });
      if (selected) onSelect({ name: (selected as string).split(/[/\\]/).pop()?.replace(/\.\w+$/, "") || (selected as string), path: selected as string });
    } catch (err) {
      console.error("Browse failed:", err);
    }
  };

  return (
    <Modal open={isOpen} onClose={onCancel} title={mode === "addApp" ? t("picker.titleAddApp") : t("picker.title")}>
      <div className="flex flex-col gap-3" style={{ minWidth: 380 }}>
        {/* Hint for user */}
        {mode === "openWith" && (
          <div
            className="text-[12px] leading-relaxed px-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t("picker.hint")}
          </div>
        )}
        <input
          className="w-full text-[13px] outline-none transition-colors"
          style={{
            padding: "8px 10px",
            border: `1px solid ${inputFocused ? "var(--color-primary)" : "var(--color-border)"}`,
            borderRadius: "var(--radius-sm)",
            background: "var(--color-bg)",
            color: "var(--color-text)",
          }}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder={t("picker.search")}
          autoFocus
        />

        <div
          className="max-h-[320px] overflow-y-auto flex flex-col gap-[2px] p-1"
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {/* Default / system default option — hidden in addApp mode */}
          {mode !== "addApp" && (
          <button
            className="flex items-center gap-[10px] px-[10px] py-2 cursor-pointer text-left w-full transition-colors"
            style={{
              borderRadius: "var(--radius-sm)",
              background: hoveredIndex === -1 ? "var(--color-bg-hover)" : "transparent",
              borderBottom: "1px solid var(--color-border)",
              marginBottom: 2,
              paddingBottom: 10,
            }}
            onClick={() => onSelect(undefined)}
            onMouseEnter={() => setHoveredIndex(-1)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <span className="text-[16px] shrink-0 w-6 text-center">&#x1F310;</span>
            <div className="flex-1 min-w-0">
              <div
                className="text-[13px] font-medium"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t("picker.default")}
              </div>
            </div>
          </button>
          )}

          {loading ? (
            <div
              className="py-5 text-center text-[13px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("picker.loading")}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="py-5 text-center text-[13px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("picker.empty")}
            </div>
          ) : (
            filtered.map((app, i) => (
              <button
                key={`${app.path}-${i}`}
                className="flex items-center gap-[10px] px-[10px] py-2 cursor-pointer text-left w-full transition-colors"
                style={{
                  borderRadius: "var(--radius-sm)",
                  background: hoveredIndex === i ? "var(--color-bg-hover)" : "transparent",
                }}
                onClick={() => onSelect(app)}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
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
                  <div
                    className="text-[10px] overflow-hidden text-ellipsis whitespace-nowrap mt-[1px]"
                    style={{ color: "var(--color-text-muted)" }}
                  >
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
