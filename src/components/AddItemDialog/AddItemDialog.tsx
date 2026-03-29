import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { usePlatform } from "../../hooks/usePlatform";
import { useTranslation } from "../../i18n/useTranslation";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { OpenWithPicker } from "../OpenWithPicker/OpenWithPicker";
import type { LaunchItem, ItemType } from "../../types";
import styles from "./AddItemDialog.module.css";

interface AddItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (item: LaunchItem) => void;
  editItem?: LaunchItem | null;
}

export function AddItemDialog({
  open: isOpen,
  onClose,
  onSave,
  editItem,
}: AddItemDialogProps) {
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
          : itemType === "file"
            ? [{ name: "All Files", extensions: ["*"] }]
            : undefined;

      const selected = await open({
        directory: pickDirectory,
        multiple: false,
        title: pickDirectory ? t("item.addFolder") : t("item.addFile"),
        filters,
      });

      if (selected) {
        const selectedPath = selected as string;
        setPath(selectedPath);
        if (!label) {
          const name = selectedPath.split(/[/\\]/).pop() || "";
          setLabel(name.replace(/\.\w+$/, ""));
        }
      }
    } catch (err) {
      console.error("Browse failed:", err);
    }
  };

  const openWithName = openWith
    ? openWith.split(/[/\\]/).pop()?.replace(/\.\w+$/, "") || openWith
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || !label.trim() || !path.trim()) return;

    onSave({
      ...editItem,
      type: itemType,
      label: label.trim(),
      path: path.trim(),
      openWith,
    });
    onClose();
  };

  return (
    <>
      <Modal open={isOpen} onClose={onClose} title={t("dialog.editItem")}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>{t("dialog.type")}</label>
            <select
              className={styles.select}
              value={itemType}
              onChange={(e) => setItemType(e.target.value as ItemType)}
            >
              <option value="app">{t("item.app")}</option>
              <option value="file">{t("item.file")}</option>
              <option value="folder">{t("item.folder")}</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("item.label")}</label>
            <input
              className={styles.input}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("item.labelPlaceholder")}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("item.path")}</label>
            <div className={styles.pathRow}>
              <input
                className={styles.input}
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder={t("item.pathPlaceholder")}
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleBrowse}>
                {t("item.browse")}
              </Button>
            </div>
          </div>

          {itemType !== "app" && (
            <div className={styles.field}>
              <label className={styles.label}>{t("item.openWith")}</label>
              <div className={styles.openWithRow}>
                <button
                  type="button"
                  className={`${styles.openWithBtn} ${openWithName ? styles.openWithBtnSet : ""}`}
                  onClick={() => setShowPicker(true)}
                >
                  {openWithName ?? t("item.openWithDefault")}
                </button>
                {openWithName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenWith(undefined)}
                  >
                    {t("item.openWithClear")}
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className={styles.actions}>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("dialog.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!label.trim() || !path.trim()}
            >
              {t("dialog.save")}
            </Button>
          </div>
        </form>
      </Modal>

      <OpenWithPicker
        open={showPicker}
        onSelect={(appPath) => {
          setOpenWith(appPath);
          setShowPicker(false);
        }}
        onCancel={() => setShowPicker(false)}
      />
    </>
  );
}
