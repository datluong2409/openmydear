import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { usePlatform } from "../../hooks/usePlatform";
import { useTranslation } from "../../i18n/useTranslation";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { OpenWithPicker } from "../OpenWithPicker/OpenWithPicker";
import type { LaunchItem, ItemType } from "../../types";

interface AddItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (item: LaunchItem) => void;
  editItem?: LaunchItem | null;
}

export function AddItemDialog({ open: isOpen, onClose, onSave, editItem }: AddItemDialogProps) {
  const { t } = useTranslation();
  const { isMacos } = usePlatform();

  const [label, setLabel] = useState("");
  const [path, setPath] = useState("");
  const [itemType, setItemType] = useState<ItemType>("app");
  const [openWith, setOpenWith] = useState<string | undefined>(undefined);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (editItem) {
      setLabel(editItem.label);
      setPath(editItem.path);
      setItemType(editItem.type);
      setOpenWith(editItem.openWith);
    }
  }, [editItem, isOpen]);

  const handleBrowse = async () => {
    try {
      const isFolder = itemType === "folder";
      const pickDirectory = isFolder || (itemType === "app" && isMacos);
      const filters =
        !pickDirectory && itemType === "app" && !isMacos
          ? [{ name: "Applications", extensions: ["exe", "lnk"] }]
          : itemType === "file" ? [{ name: "All Files", extensions: ["*"] }] : undefined;
      const selected = await open({ directory: pickDirectory, multiple: false, title: pickDirectory ? t("item.addFolder") : t("item.addFile"), filters });
      if (selected) {
        const selectedPath = selected as string;
        setPath(selectedPath);
        if (!label) setLabel((selectedPath.split(/[/\\]/).pop() || "").replace(/\.\w+$/, ""));
      }
    } catch (err) { console.error("Browse failed:", err); }
  };

  const openWithName = openWith
    ? openWith.split(/[/\\]/).pop()?.replace(/\.\w+$/, "") || openWith
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || !label.trim() || !path.trim()) return;
    onSave({ ...editItem, type: itemType, label: label.trim(), path: path.trim(), openWith });
    onClose();
  };

  const inputStyle = {
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-bg)",
    color: "var(--color-text)",
  };

  const inputClass = "w-full px-[10px] py-2 text-[13px] outline-none transition-colors";

  return (
    <>
      <Modal open={isOpen} onClose={onClose} title={t("dialog.editItem")}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-semibold uppercase tracking-[0.5px]" style={{ color: "var(--color-text-secondary)" }}>
              {t("dialog.type")}
            </label>
            <select
              className={inputClass + " cursor-pointer"}
              style={inputStyle}
              value={itemType}
              onChange={(e) => setItemType(e.target.value as ItemType)}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
            >
              <option value="app">{t("item.app")}</option>
              <option value="file">{t("item.file")}</option>
              <option value="folder">{t("item.folder")}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-semibold uppercase tracking-[0.5px]" style={{ color: "var(--color-text-secondary)" }}>
              {t("item.label")}
            </label>
            <input
              className={inputClass}
              style={inputStyle}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("item.labelPlaceholder")}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-semibold uppercase tracking-[0.5px]" style={{ color: "var(--color-text-secondary)" }}>
              {t("item.path")}
            </label>
            <div className="flex gap-2">
              <input
                className={inputClass + " flex-1"}
                style={inputStyle}
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder={t("item.pathPlaceholder")}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleBrowse}>
                {t("item.browse")}
              </Button>
            </div>
          </div>

          {itemType !== "app" && (
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-semibold uppercase tracking-[0.5px]" style={{ color: "var(--color-text-secondary)" }}>
                {t("item.openWith")}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex-1 px-[10px] py-2 text-[13px] text-left cursor-pointer transition-colors"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    border: openWithName ? `1px solid var(--color-primary)` : `1px dashed var(--color-border)`,
                    background: "var(--color-bg)",
                    color: openWithName ? "var(--color-primary)" : "var(--color-text-muted)",
                    fontWeight: openWithName ? 500 : undefined,
                  }}
                  onMouseEnter={(e) => {
                    if (openWithName) e.currentTarget.style.opacity = "0.85";
                    else { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.color = "var(--color-text)"; }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.borderColor = openWithName ? "var(--color-primary)" : "var(--color-border)";
                    e.currentTarget.style.color = openWithName ? "var(--color-primary)" : "var(--color-text-muted)";
                  }}
                  onClick={() => setShowPicker(true)}
                >
                  {openWithName ?? t("item.openWithDefault")}
                </button>
                {openWithName && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setOpenWith(undefined)}>
                    {t("item.openWithClear")}
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-[6px]">
            <Button type="button" variant="ghost" onClick={onClose}>{t("dialog.cancel")}</Button>
            <Button type="submit" variant="primary" disabled={!label.trim() || !path.trim()}>{t("dialog.save")}</Button>
          </div>
        </form>
      </Modal>

      <OpenWithPicker
        open={showPicker}
        onSelect={(appPath) => { setOpenWith(appPath); setShowPicker(false); }}
        onCancel={() => setShowPicker(false)}
      />
    </>
  );
}
