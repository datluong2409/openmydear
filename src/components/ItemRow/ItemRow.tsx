import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePlatform } from "../../hooks/usePlatform";
import { useTranslation } from "../../i18n/useTranslation";
import { runItem } from "../../commands";
import type { LaunchItem } from "../../types";
import styles from "./ItemRow.module.css";

const TYPE_ICONS: Record<string, string> = {
  app: "\u{1F4E6}",
  file: "\u{1F4C4}",
  folder: "\u{1F4C1}",
};

interface ItemRowProps {
  item: LaunchItem;
  onEdit: (item: LaunchItem) => void;
  onDelete: (itemId: string) => void;
  onChangeOpenWith: (item: LaunchItem) => void;
}

export function ItemRow({ item, onEdit, onDelete, onChangeOpenWith }: ItemRowProps) {
  const { t } = useTranslation();
  const { platform } = usePlatform();

  const matchesPlatform =
    item.platform === "both" || item.platform === platform;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : matchesPlatform ? 1 : 0.45,
  };

  const handleDelete = () => {
    if (window.confirm(t("item.deleteConfirm"))) {
      onDelete(item.id);
    }
  };

  const handleOpen = async () => {
    try {
      await runItem(item.path, item.openWith);
    } catch (err) {
      alert(String(err));
    }
  };

  const openWithName = item.openWith
    ? item.openWith.split(/[/\\]/).pop()?.replace(/\.\w+$/, "") || item.openWith
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.row}
    >
      <div className={styles.dragHandle} {...attributes} {...listeners}>
        &#x2630;
      </div>
      <span className={styles.icon}>{TYPE_ICONS[item.type] || "?"}</span>
      <div className={styles.info}>
        <div className={styles.label}>{item.label}</div>
        <div className={styles.pathLine}>
          <span className={styles.path} title={item.path}>
            {item.path}
          </span>
        </div>
      </div>
      {item.type !== "app" && (
        <button
          className={`${styles.openWithBadge} ${openWithName ? styles.openWithSet : ""}`}
          onClick={() => onChangeOpenWith(item)}
          title={openWithName ? `${t("item.openWith")}: ${item.openWith}` : t("item.openWithChange")}
        >
          {openWithName || t("item.openWithDefault")}
        </button>
      )}
      <div className={styles.actions}>
        <button
          className={`${styles.actionBtn} ${styles.openAction}`}
          onClick={handleOpen}
          title={t("item.open")}
        >
          &#x25B6;
        </button>
        <button
          className={styles.actionBtn}
          onClick={() => onEdit(item)}
          title={t("item.edit")}
        >
          &#9998;
        </button>
        <button
          className={`${styles.actionBtn} ${styles.deleteAction}`}
          onClick={handleDelete}
          title={t("item.delete")}
        >
          &times;
        </button>
      </div>
    </div>
  );
}
