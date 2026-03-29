import { useState } from "react";
import { nanoid } from "nanoid";
import { useProfiles } from "../../hooks/useProfiles";
import { useTranslation } from "../../i18n/useTranslation";
import { Button } from "../common/Button";
import { Settings } from "../Settings/Settings";
import styles from "./Sidebar.module.css";

export function Sidebar() {
  const { profiles, selectedProfileId, selectProfile, dispatch } =
    useProfiles();
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);

  const handleNewProfile = () => {
    const id = nanoid();
    dispatch({
      type: "ADD_PROFILE",
      profile: { id, name: t("profile.untitled"), items: [] },
    });
    selectProfile(id);
  };

  const handleDelete = (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    const msg = t("profile.deleteConfirm", { name: profile.name });
    if (window.confirm(msg)) {
      dispatch({ type: "DELETE_PROFILE", profileId });
      if (selectedProfileId === profileId) {
        const remaining = profiles.filter((p) => p.id !== profileId);
        selectProfile(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("sidebar.profiles")}</h2>
        <Button variant="primary" size="sm" onClick={handleNewProfile}>
          + {t("sidebar.newProfile")}
        </Button>
      </div>

      <div className={styles.list}>
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`${styles.item} ${
              profile.id === selectedProfileId ? styles.active : ""
            }`}
            onClick={() => selectProfile(profile.id)}
          >
            <span className={styles.profileIcon}>&#x1F4C2;</span>
            <span className={styles.name}>{profile.name}</span>
            <span className={styles.count}>{profile.items.length}</span>
            <button
              className={styles.deleteBtn}
              onClick={(e) => handleDelete(e, profile.id)}
              title={t("profile.delete")}
            >
              &times;
            </button>
          </div>
        ))}
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
    </aside>
  );
}
