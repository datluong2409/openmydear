import { useContext } from "react";
import { InstalledAppsContext } from "../context/InstalledAppsContext";

export function useInstalledApps() {
  const { apps, loading } = useContext(InstalledAppsContext);
  return { apps, loading };
}
