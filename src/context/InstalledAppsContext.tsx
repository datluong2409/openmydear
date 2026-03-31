import { createContext, useState, useEffect, type ReactNode } from "react";
import { getInstalledApps } from "../commands";
import type { AppInfo } from "../types";

export interface InstalledAppsContextType {
  apps: AppInfo[];
  loading: boolean;
}

export const InstalledAppsContext = createContext<InstalledAppsContextType>(null!);

export function InstalledAppsProvider({ children }: { children: ReactNode }) {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInstalledApps()
      .then(setApps)
      .catch((err) => {
        console.error("Failed to load installed apps:", err);
        setApps([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <InstalledAppsContext.Provider value={{ apps, loading }}>
      {children}
    </InstalledAppsContext.Provider>
  );
}
