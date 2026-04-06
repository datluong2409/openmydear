import {
  createContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { getInstalledApps } from "../commands";
import type { AppInfo } from "../types";

export interface InstalledAppsContextType {
  apps: AppInfo[];
  loading: boolean;
  ensureLoaded: () => void;
}

export const InstalledAppsContext = createContext<InstalledAppsContextType>(null!);

export function InstalledAppsProvider({ children }: { children: ReactNode }) {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);
  const loadingRef = useRef(false);

  const ensureLoaded = useCallback(() => {
    if (loadedRef.current || loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setLoading(true);

    getInstalledApps()
      .then((nextApps) => {
        setApps(nextApps);
        loadedRef.current = true;
      })
      .catch((err) => {
        console.error("Failed to load installed apps:", err);
        setApps([]);
      })
      .finally(() => {
        loadingRef.current = false;
        setLoading(false);
      });
  }, []);

  return (
    <InstalledAppsContext.Provider value={{ apps, loading, ensureLoaded }}>
      {children}
    </InstalledAppsContext.Provider>
  );
}
