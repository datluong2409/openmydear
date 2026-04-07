import { useState, useCallback, useRef } from "react";
import { MonitorPlay, FileText, FolderOpen, Square } from "lucide-react";
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
import { useTranslation } from "../../i18n/useTranslation";
import { usePlatform } from "../../hooks/usePlatform";
import { runProfile, runItem } from "../../commands";
import { Button } from "../common/Button";
import { ItemRow } from "../ItemRow/ItemRow";
import { AddItemDialog } from "../AddItemDialog/AddItemDialog";
import { OpenWithPicker } from "../OpenWithPicker/OpenWithPicker";
import type { LaunchItem, ItemType, AppInfo, LaunchMode } from "../../types";

export function ProfileDetail() {
  const { selectedProfile, dispatch } = useProfiles();
  const { t } = useTranslation();
  const { platform } = usePlatform();

  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState<{ current: number; total: number } | null>(null);
  const cancelRef = useRef(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editItem, setEditItem] = useState<LaunchItem | null>(null);
  const [showOpenWithPicker, setShowOpenWithPicker] = useState(false);
  const pickerContextRef = useRef<
    | { mode: "add"; type: ItemType; label: string; path: string }
    | { mode: "add-app" }
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

  const handleLaunchModeChange = useCallback(
    (mode: LaunchMode) => {
      if (!profile) return;
      dispatch({ type: "UPDATE_PROFILE", profile: { ...profile, launchMode: mode } });
    },
    [profile, dispatch]
  );

  const handleDelayChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!profile) return;
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0) {
        dispatch({ type: "UPDATE_PROFILE", profile: { ...profile, delaySeconds: val } });
      }
    },
    [profile, dispatch]
  );

  const handleRun = async () => {
    if (!profile) return;
    cancelRef.current = false;
    setIsRunning(true);

    if (profile.launchMode === "sequential") {
      // Sequential mode: open items one by one from the frontend
      const matchingItems = profile.items.filter(
        (item) => item.platform === "both" || item.platform === platform
      );
      setRunProgress({ current: 0, total: matchingItems.length });

      for (let i = 0; i < matchingItems.length; i++) {
        if (cancelRef.current) break;
        const item = matchingItems[i];
        setRunProgress({ current: i + 1, total: matchingItems.length });
        try {
          await runItem(item.path, item.openWith);
        } catch (err) {
          console.error(`Failed to open ${item.label}:`, err);
        }
        // Apply delay between items (not after the last one)
        if (i < matchingItems.length - 1 && !cancelRef.current && profile.delaySeconds > 0) {
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, profile.delaySeconds * 1000);
            // Check cancel periodically during delay
            const checkCancel = setInterval(() => {
              if (cancelRef.current) {
                clearTimeout(timer);
                clearInterval(checkCancel);
                resolve();
              }
            }, 100);
            // Clean up interval when timer fires naturally
            setTimeout(() => clearInterval(checkCancel), profile.delaySeconds * 1000 + 50);
          });
        }
      }
      setRunProgress(null);
    } else {
      // Parallel mode: use existing run_profile command
      try {
        await runProfile(profile.id);
      } catch (err) {
        console.error("Run failed:", err);
      }
    }

    setIsRunning(false);
  };

  const handleStop = () => {
    cancelRef.current = true;
  };

  const handleQuickAdd = async (type: ItemType) => {
    if (!profile) return;
    if (type === "app") {
      pickerContextRef.current = { mode: "add-app" };
      setShowOpenWithPicker(true);
      return;
    }
    try {
      const isFolder = type === "folder";

      const selected = await dialogOpen({ directory: isFolder, multiple: false });
      if (selected) {
        const selectedPath = selected as string;
        const label = (selectedPath.split(/[/\\]/).pop() || "").replace(/\.\w+$/, "");
        pickerContextRef.current = { mode: "add", type, label, path: selectedPath };
        setShowOpenWithPicker(true);
      }
    } catch (err) { console.error("Browse failed:", err); }
  };

  const handleOpenWithSelect = (app: AppInfo | undefined) => {
    if (!profile) return;
    const ctx = pickerContextRef.current;
    if (!ctx) return;
    if (ctx.mode === "add-app") {
      if (app) {
        dispatch({ type: "ADD_ITEM", profileId: profile.id, item: { id: nanoid(), type: "app", label: app.name, path: app.path, platform: "both", icon: app.icon } });
      }
    } else if (ctx.mode === "add") {
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
    // add-app mode: cancel means don't add anything
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

  const launchMode = profile.launchMode || "parallel";
  const delaySeconds = profile.delaySeconds ?? 1;

  return (
    <div className="flex flex-col h-full px-6 py-5 gap-4">
      {/* Header: name + run/stop buttons */}
      <div className="flex items-center gap-4">
        <input
          className="flex-1 text-[20px] font-semibold bg-transparent py-1 outline-none transition-colors"
          style={{
            border: "none",
            borderBottom: "2px solid var(--color-border)",
            color: "var(--color-text)",
          }}
          value={profile.name}
          onChange={handleNameChange}
          onFocus={(e) => { e.currentTarget.style.borderBottomColor = "var(--color-primary)"; }}
          onBlur={(e) => { e.currentTarget.style.borderBottomColor = "var(--color-border)"; }}
          placeholder={t("profile.namePlaceholder")}
        />
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={handleRun} disabled={isRunning || profile.items.length === 0}>
            {isRunning && runProgress
              ? `${runProgress.current}/${runProgress.total}`
              : isRunning
                ? t("profile.running")
                : `\u25B6 ${t("profile.run")}`}
          </Button>
          {isRunning && (
            <Button
              variant="danger"
              onClick={handleStop}
              title={t("profile.stop")}
              style={{ padding: "6px 10px" }}
            >
              <Square size={14} fill="currentColor" />
            </Button>
          )}
        </div>
      </div>

      {/* Launch mode settings */}
      <div
        className="flex items-center gap-3 px-3 py-[8px] rounded-[var(--radius-md)] flex-wrap"
        style={{
          background: "var(--color-bg)",
          border: "1px solid var(--color-border)",
        }}
      >
        <span className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
          {t("profile.launchMode")}:
        </span>
        <div className="flex rounded-[var(--radius-sm)] overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
          <button
            className="px-[10px] py-[3px] text-[12px] font-medium transition-colors cursor-pointer"
            style={{
              background: launchMode === "parallel" ? "var(--color-primary)" : "var(--color-bg-secondary)",
              color: launchMode === "parallel" ? "white" : "var(--color-text-secondary)",
              border: "none",
            }}
            onClick={() => handleLaunchModeChange("parallel")}
          >
            {t("profile.parallel")}
          </button>
          <button
            className="px-[10px] py-[3px] text-[12px] font-medium transition-colors cursor-pointer"
            style={{
              background: launchMode === "sequential" ? "var(--color-primary)" : "var(--color-bg-secondary)",
              color: launchMode === "sequential" ? "white" : "var(--color-text-secondary)",
              border: "none",
              borderLeft: "1px solid var(--color-border)",
            }}
            onClick={() => handleLaunchModeChange("sequential")}
          >
            {t("profile.sequential")}
          </button>
        </div>

        {launchMode === "sequential" && (
          <div className="flex items-center gap-[6px]">
            <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
              {t("profile.delay")}:
            </span>
            <input
              type="number"
              min="0"
              max="60"
              step="0.5"
              value={delaySeconds}
              onChange={handleDelayChange}
              className="w-[60px] text-[12px] text-center outline-none"
              style={{
                padding: "3px 6px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-bg-secondary)",
                color: "var(--color-text)",
              }}
            />
            <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
              {t("profile.delayUnit")}
            </span>
          </div>
        )}
      </div>

      {/* Quick add buttons */}
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
      <OpenWithPicker open={showOpenWithPicker} onSelect={handleOpenWithSelect} onCancel={handleOpenWithCancel} mode={pickerContextRef.current?.mode === "add-app" ? "addApp" : "openWith"} />
    </div>
  );
}
