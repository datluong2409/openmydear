import { useState, useCallback, useRef } from "react";
import { MonitorPlay, FileText, FolderOpen } from "lucide-react";
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
} from "@dnd-kit/sortable";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import { nanoid } from "nanoid";
import { useProfiles } from "../../hooks/useProfiles";
import { usePlatform } from "../../hooks/usePlatform";
import { useTranslation } from "../../i18n/useTranslation";
import { runProfile } from "../../commands";
import { Button } from "../common/Button";
import { ItemRow } from "../ItemRow/ItemRow";
import { AddItemDialog } from "../AddItemDialog/AddItemDialog";
import { OpenWithPicker } from "../OpenWithPicker/OpenWithPicker";
import { RunResultDialog } from "../RunResultDialog/RunResultDialog";
import type { LaunchItem, ItemType, RunResult, AppInfo } from "../../types";

export function ProfileDetail() {
  const { selectedProfile, dispatch } = useProfiles();
  const { t } = useTranslation();
  const { isMacos } = usePlatform();

  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [showRunResult, setShowRunResult] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editItem, setEditItem] = useState<LaunchItem | null>(null);
  const [showOpenWithPicker, setShowOpenWithPicker] = useState(false);
  const pickerContextRef = useRef<
    | { mode: "add"; type: ItemType; label: string; path: string }
    | { mode: "change"; item: LaunchItem }
    | null
  >(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const profile = selectedProfile;

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!profile) return;
      dispatch({ type: "UPDATE_PROFILE", profile: { ...profile, name: e.target.value } });
    },
    [profile, dispatch]
  );

  const handleRun = async () => {
    if (!profile) return;
    setIsRunning(true);
    try {
      const result = await runProfile(profile.id);
      setRunResult(result);
      setShowRunResult(true);
    } catch (err) {
      setRunResult({ total: 0, succeeded: 0, errors: [{ item_id: "", label: "System", error: String(err) }] });
      setShowRunResult(true);
    } finally {
      setIsRunning(false);
    }
  };

  const handleQuickAdd = async (type: ItemType) => {
    if (!profile) return;
    try {
      const isFolder = type === "folder";
      const pickDirectory = isFolder || (type === "app" && isMacos);
      const filters =
        !pickDirectory && type === "app"
          ? [{ name: "Applications", extensions: ["exe", "lnk"] }]
          : type === "file" ? [{ name: "All Files", extensions: ["*"] }] : undefined;

      const selected = await dialogOpen({ directory: pickDirectory, multiple: false, filters });
      if (selected) {
        const selectedPath = selected as string;
        const label = (selectedPath.split(/[/\\]/).pop() || "").replace(/\.\w+$/, "");
        if (type !== "app") {
          pickerContextRef.current = { mode: "add", type, label, path: selectedPath };
          setShowOpenWithPicker(true);
        } else {
          dispatch({ type: "ADD_ITEM", profileId: profile.id, item: { id: nanoid(), type, label, path: selectedPath, platform: "both" } });
        }
      }
    } catch (err) { console.error("Browse failed:", err); }
  };

  const handleOpenWithSelect = (app: AppInfo | undefined) => {
    if (!profile) return;
    const ctx = pickerContextRef.current;
    if (!ctx) return;
    if (ctx.mode === "add") {
      dispatch({ type: "ADD_ITEM", profileId: profile.id, item: { id: nanoid(), type: ctx.type, label: ctx.label, path: ctx.path, platform: "both", openWith: app?.path, openWithName: app?.name, openWithIcon: app?.icon } });
    } else {
      dispatch({ type: "UPDATE_ITEM", profileId: profile.id, item: { ...ctx.item, openWith: app?.path, openWithName: app?.name, openWithIcon: app?.icon } });
    }
    pickerContextRef.current = null;
    setShowOpenWithPicker(false);
  };

  const handleOpenWithCancel = () => {
    if (profile && pickerContextRef.current?.mode === "add") {
      const ctx = pickerContextRef.current;
      dispatch({ type: "ADD_ITEM", profileId: profile.id, item: { id: nanoid(), type: ctx.type, label: ctx.label, path: ctx.path, platform: "both" } });
    }
    pickerContextRef.current = null;
    setShowOpenWithPicker(false);
  };

  const handleChangeOpenWith = (item: LaunchItem) => { pickerContextRef.current = { mode: "change", item }; setShowOpenWithPicker(true); };
  const handleEditItem = (item: LaunchItem) => { setEditItem(item); setShowEditDialog(true); };
  const handleSaveItem = (item: LaunchItem) => { if (!profile) return; dispatch({ type: "UPDATE_ITEM", profileId: profile.id, item }); };
  const handleDeleteItem = (itemId: string) => { if (!profile) return; dispatch({ type: "DELETE_ITEM", profileId: profile.id, itemId }); };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!profile) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = profile.items.findIndex((i) => i.id === active.id);
    const newIndex = profile.items.findIndex((i) => i.id === over.id);
    dispatch({ type: "REORDER_ITEMS", profileId: profile.id, items: arrayMove(profile.items, oldIndex, newIndex) });
  };

  if (!profile) return null;

  return (
    <div className="flex flex-col h-full px-6 py-5 gap-4">
      <div className="flex items-center gap-4">
        <input
          className="flex-1 text-[20px] font-semibold bg-transparent py-1 outline-none transition-colors"
          style={{
            border: "none",
            borderBottom: "2px solid transparent",
            color: "var(--color-text)",
          }}
          value={profile.name}
          onChange={handleNameChange}
          onFocus={(e) => { e.currentTarget.style.borderBottomColor = "var(--color-primary)"; }}
          onBlur={(e) => { e.currentTarget.style.borderBottomColor = "transparent"; }}
          placeholder={t("profile.namePlaceholder")}
        />
        <Button variant="primary" onClick={handleRun} disabled={isRunning || profile.items.length === 0}>
          {isRunning ? t("profile.running") : `\u25B6 ${t("profile.run")}`}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => handleQuickAdd("app")}><MonitorPlay size={14} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />{t("item.addApp")}</Button>
        <Button variant="secondary" size="sm" onClick={() => handleQuickAdd("file")}><FileText size={14} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />{t("item.addFile")}</Button>
        <Button variant="secondary" size="sm" onClick={() => handleQuickAdd("folder")}><FolderOpen size={14} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />{t("item.addFolder")}</Button>
      </div>

      {profile.items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[13px]" style={{ color: "var(--color-text-muted)" }}>
          {t("profile.noItems")}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={profile.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {profile.items.map((item) => (
                <ItemRow key={item.id} item={item} onEdit={handleEditItem} onDelete={handleDeleteItem} onChangeOpenWith={handleChangeOpenWith} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      <AddItemDialog open={showEditDialog} onClose={() => { setShowEditDialog(false); setEditItem(null); }} onSave={handleSaveItem} editItem={editItem} />
      <OpenWithPicker open={showOpenWithPicker} onSelect={handleOpenWithSelect} onCancel={handleOpenWithCancel} />
      <RunResultDialog open={showRunResult} onClose={() => setShowRunResult(false)} result={runResult} />
    </div>
  );
}
