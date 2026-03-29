import {
  createContext,
  useReducer,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { profileReducer, type ProfileAction } from "./profileReducer";
import { loadProfiles, saveProfiles } from "../commands";
import type { LaunchProfile } from "../types";

export interface ProfileContextType {
  profiles: LaunchProfile[];
  selectedProfileId: string | null;
  selectProfile: (id: string | null) => void;
  dispatch: React.Dispatch<ProfileAction>;
}

export const ProfileContext = createContext<ProfileContextType>(null!);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, dispatch] = useReducer(profileReducer, []);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null
  );
  const isInitialLoad = useRef(true);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles()
      .then((data) => {
        dispatch({ type: "SET_PROFILES", profiles: data });
        if (data.length > 0) {
          setSelectedProfileId(data[0].id);
        }
      })
      .catch((err) => console.error("Failed to load profiles:", err));
  }, []);

  // Auto-save on change (debounced)
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    saveTimeout.current = setTimeout(() => {
      saveProfiles(profiles).catch((err) =>
        console.error("Failed to save profiles:", err)
      );
    }, 300);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [profiles]);

  const selectProfile = useCallback((id: string | null) => {
    setSelectedProfileId(id);
  }, []);

  return (
    <ProfileContext.Provider
      value={{ profiles, selectedProfileId, selectProfile, dispatch }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
