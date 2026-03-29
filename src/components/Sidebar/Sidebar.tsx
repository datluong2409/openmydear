import { useState } from "react";
import { nanoid } from "nanoid";
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
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { Settings } from "../Settings/Settings";
import type { LaunchProfile } from "../../types";
import styles from "./Sidebar.module.css";

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
      style={style}
      className={`${styles.item} ${isSelected ? styles.active : ""}`}
      onClick={() => onSelect(profile.id)}
    >
      <div className={styles.dragHandle} {...attributes} {...listeners}>
        &#x2630;
      </div>
      <span className={styles.profileIcon}>&#x1F4C2;</span>
      <span className={styles.name}>{profile.name}</span>
      <span className={styles.count}>{profile.items.length}</span>
      <button
        className={styles.deleteBtn}
        onClick={(e) => onDeleteClick(e, profile.id)}
        title={deleteLabel}
      >
        &times;
      </button>
    </div>
  );
}

export function Sidebar() {
  const { profiles, selectedProfileId, selectProfile, dispatch } =
    useProfiles();
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
    dispatch({
      type: "ADD_PROFILE",
      profile: { id, name: t("profile.untitled"), items: [] },
    });
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
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("sidebar.profiles")}</h2>
        <Button variant="primary" size="sm" onClick={handleNewProfile}>
          + {t("sidebar.newProfile")}
        </Button>
      </div>

      <div className={styles.list}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={profiles.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
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
          <div className={styles.empty}>{t("empty.description")}</div>
        )}
      </div>

      <div className={styles.footer}>
        <button
          className={styles.settingsBtn}
          onClick={() => setShowSettings(true)}
          title={t("settings.title")}
        >
          &#x2699;&#xFE0F;
        </button>
      </div>

      <Settings open={showSettings} onClose={() => setShowSettings(false)} />

      {pendingDeleteId && (
        <Modal
          open={!!pendingDeleteId}
          onClose={cancelDelete}
          title={t("profile.delete")}
        >
          <p>{t("profile.deleteConfirm", { name: pendingProfile?.name ?? "" })}</p>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" }}>
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
