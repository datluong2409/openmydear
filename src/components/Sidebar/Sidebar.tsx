import { useState } from "react";
import { nanoid } from "nanoid";
import { Trash2, ArrowDownToLine, Loader2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProfiles } from "../../hooks/useProfiles";
import { useTranslation } from "../../i18n/useTranslation";
import { useUpdateChecker } from "../../hooks/useUpdateChecker";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { Settings } from "../Settings/Settings";
import { BuyMeACoffee } from "../BuyMeACoffee/BuyMeACoffee";
import type { LaunchProfile } from "../../types";

interface SortableProfileItemProps {
  profile: LaunchProfile;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDeleteClick: (e: React.MouseEvent, id: string) => void;
  deleteLabel: string;
}

function SortableProfileItem({
  profile,
  isSelected,
  onSelect,
  onDeleteClick,
  deleteLabel,
}: SortableProfileItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: profile.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: isSelected ? "var(--color-bg-active)" : undefined,
        boxShadow: isSelected ? "inset 3px 0 0 var(--color-primary)" : undefined,
        borderRadius: "var(--radius-md)",
      }}
      className="group flex items-center gap-2 px-[10px] py-[9px] cursor-pointer transition-colors relative"
      onClick={() => onSelect(profile.id)}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.background = "var(--color-bg-hover)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = "";
      }}
    >
      <div
        className="cursor-grab text-[11px] px-[2px] py-[2px] select-none touch-none opacity-0 group-hover:opacity-100 transition-opacity shrink-0 active:cursor-grabbing"
        style={{ color: "var(--color-text-muted)" }}
        {...attributes}
        {...listeners}
      >
        &#x2630;
      </div>
      <span className={`text-[15px] shrink-0 ${isSelected ? "opacity-100" : "opacity-70"}`}>
        &#x1F4C2;
      </span>
      <span
        className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px]"
        style={{
          color: isSelected ? "var(--color-text)" : "var(--color-text-secondary)",
          fontWeight: isSelected ? 600 : 500,
        }}
      >
        {profile.name}
      </span>
      <span
        className="text-[10px] font-bold px-[6px] py-[2px] rounded-[10px] min-w-[20px] text-center shrink-0"
        style={{
          background: isSelected ? "var(--color-primary)" : "var(--color-bg-hover)",
          color: isSelected ? "white" : "var(--color-text-muted)",
        }}
      >
        {profile.items.length}
      </span>
      <button
        className="hidden w-5 h-5 items-center justify-center rounded-[var(--radius-sm)] cursor-pointer shrink-0 group-hover:flex"
        style={{ color: "var(--color-danger)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-danger)";
          e.currentTarget.style.color = "white";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "";
          e.currentTarget.style.color = "var(--color-danger)";
        }}
        onClick={(e) => onDeleteClick(e, profile.id)}
        title={deleteLabel}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

export function Sidebar() {
  const { profiles, selectedProfileId, selectProfile, dispatch } = useProfiles();
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [showCoffee, setShowCoffee] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const { hasUpdate, updateVersion, isUpdating, installUpdate } = useUpdateChecker();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = profiles.findIndex((p) => p.id === active.id);
    const newIndex = profiles.findIndex((p) => p.id === over.id);
    dispatch({ type: "REORDER_PROFILES", profiles: arrayMove(profiles, oldIndex, newIndex) });
  };

  const handleNewProfile = () => {
    const id = nanoid();
    dispatch({ type: "ADD_PROFILE", profile: { id, name: t("profile.untitled"), items: [], launchMode: "sequential", delaySeconds: 2 } });
    selectProfile(id);
  };

  const handleDeleteClick = (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    setPendingDeleteId(profileId);
  };

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    dispatch({ type: "DELETE_PROFILE", profileId: pendingDeleteId });
    if (selectedProfileId === pendingDeleteId) {
      const remaining = profiles.filter((p) => p.id !== pendingDeleteId);
      selectProfile(remaining.length > 0 ? remaining[0].id : null);
    }
    setPendingDeleteId(null);
  };

  const cancelDelete = () => setPendingDeleteId(null);
  const pendingProfile = profiles.find((p) => p.id === pendingDeleteId);

  return (
    <aside
      className="w-[260px] min-w-[260px] h-full flex flex-col"
      style={{ background: "var(--color-bg-secondary)", borderRight: "1px solid var(--color-border)" }}
    >
      <div className="px-[14px] pt-[14px] pb-[10px] flex items-center justify-between gap-2">
        <h2
          className="text-[11px] font-bold uppercase tracking-[0.8px]"
          style={{ color: "var(--color-text-muted)" }}
        >
          {t("sidebar.profiles")}
        </h2>
        <Button variant="primary" size="sm" onClick={handleNewProfile}>
          + {t("sidebar.newProfile")}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1 flex flex-col gap-[2px]">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={profiles.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            {profiles.map((profile) => (
              <SortableProfileItem
                key={profile.id}
                profile={profile}
                isSelected={profile.id === selectedProfileId}
                onSelect={selectProfile}
                onDeleteClick={handleDeleteClick}
                deleteLabel={t("profile.delete")}
              />
            ))}
          </SortableContext>
        </DndContext>
        {profiles.length === 0 && (
          <div
            className="px-3 py-6 text-center text-[12px] leading-relaxed"
            style={{ color: "var(--color-text-muted)" }}
          >
            {t("empty.description")}
          </div>
        )}
      </div>

      {hasUpdate && (
        <div className="px-3 pt-[10px]" style={{ borderTop: "1px solid var(--color-border)" }}>
          <button
            className="w-full flex items-center justify-center gap-[6px] h-[34px] rounded-[var(--radius-md)] text-[12px] font-semibold cursor-pointer transition-opacity disabled:cursor-default"
            style={{ background: "var(--color-primary)", color: "white", opacity: isUpdating ? 0.7 : 1 }}
            onMouseEnter={(e) => { if (!isUpdating) e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = isUpdating ? "0.7" : "1"; }}
            onClick={installUpdate}
            disabled={isUpdating}
            title={t("update.button", { version: updateVersion ?? "" })}
          >
            {isUpdating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>{t("update.updating")}</span>
              </>
            ) : (
              <>
                <ArrowDownToLine size={14} />
                <span>{t("update.button", { version: updateVersion ?? "" })}</span>
              </>
            )}
          </button>
        </div>
      )}

      <div
        className="px-3 py-[10px] flex items-center justify-between"
        style={{ borderTop: hasUpdate ? undefined : "1px solid var(--color-border)" }}
      >
        <button
          className="w-[30px] h-[30px] flex items-center justify-center rounded-[var(--radius-sm)] text-[16px] cursor-pointer transition-colors shrink-0"
          style={{ color: "var(--color-text-muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-bg-hover)";
            e.currentTarget.style.color = "var(--color-text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "";
            e.currentTarget.style.color = "var(--color-text-muted)";
          }}
          onClick={() => setShowSettings(true)}
          title={t("settings.title")}
        >
          &#x2699;&#xFE0F;
        </button>
        <button
          className="flex items-center gap-[6px] h-[30px] px-[8px] rounded-[var(--radius-md)] text-[12px] cursor-pointer transition-colors shrink-0"
          style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-bg-hover)";
            e.currentTarget.style.color = "var(--color-text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "";
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }}
          onClick={() => setShowCoffee(true)}
          title={t("coffee.title")}
        >
          <span className="text-[16px]">&#x2615;</span>
          <span>{t("coffee.title")}</span>
        </button>
      </div>

      <Settings open={showSettings} onClose={() => setShowSettings(false)} />
      <BuyMeACoffee open={showCoffee} onClose={() => setShowCoffee(false)} />

      {pendingDeleteId && (
        <Modal open={!!pendingDeleteId} onClose={cancelDelete} onConfirm={confirmDelete} title={t("profile.delete")}>
          <p>{t("profile.deleteConfirm", { name: pendingProfile?.name ?? "" })}</p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="secondary" size="sm" onClick={cancelDelete}>
              {t("dialog.cancel")}
            </Button>
            <Button variant="danger" size="sm" onClick={confirmDelete}>
              {t("item.delete")}
            </Button>
          </div>
        </Modal>
      )}
    </aside>
  );
}
