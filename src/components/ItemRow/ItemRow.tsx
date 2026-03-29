import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePlatform } from "../../hooks/usePlatform";
import { useTranslation } from "../../i18n/useTranslation";
import { runItem } from "../../commands";
import type { LaunchItem } from "../../types";

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
  const matchesPlatform = item.platform === "both" || item.platform === platform;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : matchesPlatform ? 1 : 0.45,
  };

  const handleDelete = () => { if (window.confirm(t("item.deleteConfirm"))) onDelete(item.id); };
  const handleOpen = async () => { try { await runItem(item.path, item.openWith); } catch (err) { alert(String(err)); } };

  const openWithName = item.openWith
    ? item.openWith.split(/[/\\]/).pop()?.replace(/\.\w+$/, "") || item.openWith
    : null;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        background: "var(--color-bg-secondary)",
      }}
      className="group flex items-center gap-[10px] px-3 py-[10px] transition-shadow hover:shadow-[var(--shadow-sm)]"
    >
      <div
        className="cursor-grab text-[14px] px-1 py-[2px] select-none touch-none active:cursor-grabbing"
        style={{ color: "var(--color-text-muted)" }}
        {...attributes}
        {...listeners}
      >
        &#x2630;
      </div>
      <span className="text-[18px] shrink-0">{TYPE_ICONS[item.type] || "?"}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[13px] overflow-hidden text-ellipsis whitespace-nowrap">
          {item.label}
        </div>
        <div className="flex items-center gap-[6px] mt-[2px]">
          <span
            className="text-[11px] overflow-hidden text-ellipsis whitespace-nowrap"
            style={{ color: "var(--color-text-secondary)" }}
            title={item.path}
          >
            {item.path}
          </span>
        </div>
      </div>
      {item.type !== "app" && (
        <button
          className="text-[10px] px-2 py-[2px] rounded-[10px] font-medium shrink-0 cursor-pointer flex items-center gap-1 transition-all"
          style={{
            background: openWithName ? "var(--color-primary)" : "var(--color-bg-hover)",
            color: openWithName ? "white" : "var(--color-text-muted)",
            border: "1px solid transparent",
          }}
          onMouseEnter={(e) => {
            if (openWithName) { e.currentTarget.style.opacity = "0.9"; }
            else {
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.borderColor = "transparent";
            e.currentTarget.style.color = openWithName ? "white" : "var(--color-text-muted)";
          }}
          onClick={() => onChangeOpenWith(item)}
          title={openWithName ? `${t("item.openWith")}: ${item.openWith}` : t("item.openWithChange")}
        >
          {openWithName || t("item.openWithDefault")}
        </button>
      )}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="w-[26px] h-[26px] flex items-center justify-center rounded-[var(--radius-sm)] text-[11px] cursor-pointer transition-colors"
          style={{ color: "var(--color-primary)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-primary)"; e.currentTarget.style.color = "white"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "var(--color-primary)"; }}
          onClick={handleOpen}
          title={t("item.open")}
        >
          &#x25B6;
        </button>
        <button
          className="w-[26px] h-[26px] flex items-center justify-center rounded-[var(--radius-sm)] text-[14px] cursor-pointer transition-colors"
          style={{ color: "var(--color-text-secondary)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-hover)"; e.currentTarget.style.color = "var(--color-text)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
          onClick={() => onEdit(item)}
          title={t("item.edit")}
        >
          &#9998;
        </button>
        <button
          className="w-[26px] h-[26px] flex items-center justify-center rounded-[var(--radius-sm)] text-[14px] cursor-pointer transition-colors"
          style={{ color: "var(--color-text-secondary)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-danger)"; e.currentTarget.style.color = "white"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
          onClick={handleDelete}
          title={t("item.delete")}
        >
          &times;
        </button>
      </div>
    </div>
  );
}
